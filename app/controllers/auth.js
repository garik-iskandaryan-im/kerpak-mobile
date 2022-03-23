'use strict';

const { Op } = require('sequelize');
const models = require('app/models/models');
const {
    consumers: Consumers,
    emails: Emails,
    users: Users,
    usersFailedEmails: UsersFailedEmails
} = require('app/models/models');
const validate = require('app/helpers/validate');
const { isSchemeValid } = require('app/helpers/validate');

const security = require('app/helpers/security');
const schemes = require('app/schemes');
const CONSTANTS = require('app/constants');
const log = require('app/helpers/logger');
const twilio = require('app/helpers/sms/twilio');
const SNS = require('app/helpers/sms/aws');
const { getOperatorsEmails } = require('app/helpers/email/service');
const { sendEmail, getRegisterVerificationCodeEmailBody } = require('app/helpers/email/adapters/aws');
const { SMS: {SINGLE_USER_lIMIT, DAY_LIMIT}, s3: { SES: { NOREPLY } }, auth: { verificationCodeExpirationDate } } = require('app/settings');
const { createVerificationCode, makeId, getPasswordLengthByUserType, hasSpace } = require('app/helpers/utils');
const loggerValidations = require('app/helpers/loggerValidations');

const getConsumerBankId = async () => {
    const bankClientId = makeId(17);
    const consumer = await models.consumers.findOne({ where: { bankClientId } });
    if(consumer) {
        return await getConsumerBankId();
    }
    return bankClientId;
};

module.exports.authenticateUserByEmail = (email) => {
    const payload = { include: [ { model: models.serviceProviders, attributes: ['timezone'], required: false } ] };
    return models.users.scope(
        {method: ['email', email]})
        .findOne(payload)
        .then((user) => {
            return validate.isUserLoginFound(user.get({plain: true}));
        })
        .catch((err) => {
            log.error(err, 'auth::controller::authenticateUserByEmail');
            return err;
        });
};

module.exports.authenticateUserFromTokenById = (id) => {
    return models.consumers.scope(
        {method: ['id', id]})
        .findOne()
        .then((user) => {
            return user;
        })
        .catch((err) => {
            log.error(err, 'auth::authenticateUserFromTokenById');
            return err;
        });
};

module.exports.postLogin = (req, res, next) => {
    let payload = {
        email: req.body.email,
        password: req.body.password
    };
    validate.isSchemeValid(schemes.auth.postLogin, payload)
        .then((userPayload) => {
            if (hasSpace(userPayload.password)) {
                return Promise.reject({message: 'validation error'});
            }
            return models.users.scope('authenticate',
                {method: ['emailIncludingSP', userPayload.email]})
                .findOne()
                .then(async (user) => {
                    const failedLoginCount = await UsersFailedEmails.count({ where: { email: userPayload.email } });
                    if (failedLoginCount >= CONSTANTS.FAILED_LOGIN_LIMIT) {
                        return Promise.reject({message: 'Too many failed log in attempts', accountBlocked: true});
                    }
                    return [user, userPayload, failedLoginCount];
                });
        })
        .then(([user, userPayload, failedLoginCount]) => {
            return validate.isUserLoginFound(user)
                .then((user) => {
                    return [user, userPayload, failedLoginCount];
                });
        })
        .then(([user, userPayload, failedLoginCount]) => {
            return validate.isUserHasPasswordHash(user)
                .then((user) => {
                    return [user, userPayload, failedLoginCount];
                });
        })
        .then(([user, userPayload, failedLoginCount]) => {
            if(user.passwordExpireDate && user.passwordExpireDate < Date.now()) {
                const passwordLength = getPasswordLengthByUserType(user);
                return res.status(403).json({error: "password is expired", passwordExpired: true, passwordLength});
            }
            return Promise.resolve([user, userPayload]).then(([user, userPayload]) => {
                return user.authenticate(userPayload.password, user);
            })
                .then((user) => {
                    return security.generateUserJWT(user, CONSTANTS.JSON_TOKEN_TYPES.USER_AUTH);
                })
                .then(([user, token]) => {
                    return formSessionObject(user, token);
                })
                .then(async(response) => {
                    if (failedLoginCount > 0) {
                        await UsersFailedEmails.destroy({where: {email: response.user.email}});
                    }
                    res.cookie('jwt', response.jwt.token, { httpOnly: true, maxAge: response.jwt.expiration });
                    return res.json(response);
                });
        })
        .catch(async (err) => {
            if (err.accountBlocked) {
                const updatePayload = {isActive: false};
                await Users.update(updatePayload, {where: {email: payload.email}});
                return res.status(403).json({ error: err.message, accountBlocked: err.accountBlocked });
            }
            if (err.name === 'InvalidUserPasswordException' || err.name === 'UserLoginNotFoundException') {
                await UsersFailedEmails.create({
                    email: payload.email
                });
            }
            log.error(err, 'auth::controller::postLogin');
            next(err);
        });
};

/**
 * @swagger
 * '/auth/register/consumer/{country_ISO}':
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register consumer
 *     description: ''
 *     parameters:
 *       - name: country_ISO
 *         in: path
 *         description: CountryISO for Service Providers
 *         required: true
 *         type: string
 *         default: 'am'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *     produces:
 *       -application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.registerConsumer = async (req, res, next) => {
    let payload = {
        phone: req.body.phone,
        hash: req.body.hash || ''
    };
    const regionId = req.region.id;
    validate.isSchemeValid(schemes.auth.registerConsumer, payload).then(({ phone }) => {
        return models.consumers.scope(
            {method: ['consumerByRegion', [phone], regionId]}
        ).findOne()
            .then(async (consumer) => {
                if (!consumer) {
                    const bankClientId = await getConsumerBankId();
                    return models.consumers.create({
                        phone: phone,
                        bankClientId: bankClientId,
                        regionId,
                        // TODO: need to delete
                        countryISO: req.params.country_ISO
                    }).then(function (consumer) {
                        if (consumer) {
                            return [consumer];
                        } else {
                            return res.status(500).json({ message: 'Error in create consumer' });
                        }
                    });
                } else {
                    return [consumer];
                }
            })
            .then(async () => {
                const code = createVerificationCode();
                try {
                    let message = twilio.compileMessage(null, { code });
                    if (payload.hash) {
                        message = `<#> ${message} \r\n${payload.hash}`;
                    }
                    const currentDate = new Date();
                    let limitForSingleUser = await models.smsLog.count({ where: {
                        phone,
                        regionId,
                        createdAt: {
                            [Op.gte]: new Date(currentDate.getTime() - 15 * 60 * 1000)
                        }
                    }});
                    if (limitForSingleUser > SINGLE_USER_lIMIT - 1) {
                        return res.status(403).json({ message: 'SMS confirmation request limit reached' });
                    }
                    let limitForDay = await models.smsLog.count({ where: {
                        createdAt: {
                            [Op.gte]: new Date(currentDate.getTime() - 24 * 60 * 60 * 1000)
                        }
                    }});
                    if (limitForDay > DAY_LIMIT - 1) {
                        const title = 'Kerpak | Platform | OTP Requests daily limit reached';
                        const body = 'The 500 OTP requests limit was reached, please take action.';
                        const emails = await getOperatorsEmails();
                        await sendEmail(emails, [], title, body);
                        return res.status(403).json({ message: 'SMS confirmation request day limit reached' });
                    }
                    let logSMS = await models.smsLog.findAll({ where: { phone, regionId }, order: [['id', 'DESC']], limit: 1 });
                    if (logSMS && logSMS[0] && logSMS[0].type === 'AWS') {
                        await twilio.send(phone, message);
                        await models.smsLog.create({
                            phone,
                            code,
                            type: 'twillo',
                            regionId
                        });
                    } else {
                        await SNS.send(phone, message);
                        await models.smsLog.create({
                            phone,
                            code,
                            type: 'AWS',
                            regionId
                        });
                    }
                } catch (err) {
                    log.error(err, 'auth::registerConsumer::createConsumer');
                    return res.status(500).json({ message: 'Error in create consumer' });
                }
                const sms = await models.sms.findOne({where: {phone: phone, regionId}});
                if (sms) {
                    return models.sms.update({ code: code }, { where: { phone: phone, regionId }}).then(function (sms) {
                        if (sms) {
                            return res.json({ phone, message: 'sms has been sent' });
                        } else {
                            return res.status(500).json({ message: 'Error in update consumer' });
                        }
                    });
                } else {
                    return models.sms.create({ phone, code, regionId }).then(function (sms) {
                        if (sms) {
                            return res.json({ phone, message: 'sms has been sent' });
                        } else {
                            return res.status(500).json({ message: 'Error in creare consumer' });
                        }
                    });
                }
            });
    }).catch(err => {
        log.error(err, 'auth::controller::registerConsumer');
        return res.status(404).json({ message: 'validation error' });
    });
};

/**
 * @swagger
 * '/auth/login/sms/{country_ISO}':
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login via SMS
 *     description: ''
 *     parameters:
 *       - name: country_ISO
 *         in: path
 *         description: CountryISO for Service Providers
 *         required: true
 *         type: string
 *         default: 'am'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               code:
 *                 type: string
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.postLoginSMS = (req, res, next) => {
    let payload = {
        phone: req.body.phone,
        code: req.body.code,
    };
    const regionId = req.region.id;
    validate.isSchemeValid(schemes.auth.postLoginSMS, payload)
        .then(() => {
            return models.sms.scope(
                {method: ['authenticate', [payload.phone], payload.code, regionId]}
            ).findOne()
                .then((sms) => {
                    return [sms];
                });
        })
        .then(([sms]) => {
            if (!sms) {
                return res.status(404).send({message: 'not found'});
            } else {
                return models.consumers.update(
                    { registerCompleted: true},
                    { where: { phone: payload.phone, regionId }}
                ).then(() => {
                    models.sms.destroy({ where: { phone: payload.phone, regionId, code: payload.code} });
                }).then(() => {
                    return models.consumers.scope(
                        {method: ['consumerByRegion', [payload.phone], regionId]}
                    ).findOne()
                        .then((consumer) => {
                            return security.generateConsumerJWT(consumer, CONSTANTS.JSON_TOKEN_TYPES.CONSUMER_AUTH);
                        })
                        .then(([user, token]) => {
                            return formSessionObject(user, token);
                        })
                        .then((response) => {
                            res.cookie('jwt', response.jwt.token, { httpOnly: true, maxAge: response.jwt.expiration });
                            return res.json(response);
                        });
                });
            }
        })
        .catch((err) => {
            log.error(err, 'auth::controller::postLoginSMS');
            next(err);
        });
};

/**
 * @swagger
 * '/auth/register/consumer/email/{country_ISO}':
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register consumer by email
 *     description: ''
 *     parameters:
 *       - name: country_ISO
 *         in: path
 *         description: CountryISO for consumer
 *         required: true
 *         type: string
 *         default: 'am'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               email:
 *                  type: string
 *     produces:
 *       -application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 */
 module.exports.registerConsumerByEmail = async (req, res, next) => {
    try {
        let payload = {
            phone: req.body.phone,
            email: req.body.email,
        };
        try {
            await isSchemeValid(schemes.auth.registerConsumerByEmail, payload);
        } catch (err) {
            loggerValidations.error(err, 'consumer::controller::registerConsumerByEmail');
            return res.status(400).json({ message: 'validation error' });
        }
        const regionId = req.region.id;
        const consumer = await Consumers.findOne({ where: { phone: payload.phone, regionId } });
        if (consumer && consumer.registerCompleted) {
            log.error('auth::controller::registerConsumerByEmail::403:phone is verified');
            return res.status(403).json({ message: 'Forbidden' });
        }

        if (consumer && consumer.email && consumer.registerByEmailCompleted && consumer.email !== req.body.email) {
            log.error('auth::controller::registerConsumerByEmail::403:another email is registred');
            return res.status(403).json({ message: 'Forbidden' });
        }

        const isEmailRegistred = await Consumers.findOne({ where: {
            email: payload.email,
            [Op.or]: {
                regionId: {
                    [Op.not]: regionId
                },
                phone: {
                    [Op.not]: payload.phone
                }
            }
        }});
        if (isEmailRegistred) {
            log.error('auth::controller::registerConsumerByEmail::403:email is verified');
            return res.status(403).json({ message: 'Forbidden' });
        }

        const code = createVerificationCode();
        const body = getRegisterVerificationCodeEmailBody(req.body.email, code);
        const title = 'Kerpak verification code';
        await sendEmail([payload.email], [], title, body, NOREPLY, true);

        const bankClientId = await getConsumerBankId();
        if (!consumer) {
            await Consumers.create({
                phone: payload.phone,
                email: payload.email,
                bankClientId: bankClientId,
                regionId,
                // TODO: need to delete
                countryISO: req.params.country_ISO
            });
        } else {
            await Consumers.update(
                { email: payload.email },
                { where: {
                    phone: payload.phone,
                    regionId,
                }}
            );
        }
        const currConsumer = await Consumers.findOne({where: {phone: payload.phone, regionId}});
        const email = await Emails.findOne({where: {consumerId: currConsumer.id}});
        const sendingDate = new Date();
        if (email) {
            await Emails.update({ code, sendingDate, email: payload.email }, { where: { consumerId: currConsumer.id }});
        } else {
            await Emails.create({
                email: payload.email,
                code: code,
                phone: payload.phone,
                sendingDate: sendingDate,
                consumerId: currConsumer.id
            });
        }

        return res.json({message: 'email has been sent'});
    } catch (err) {
        log.error(err, 'auth::controller::registerConsumerByEmail');
        return res.status(500).json({ message: 'server error' });
    }
};

/**
 * @swagger
 * '/auth/login/email/{country_ISO}':
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login via email
 *     description: ''
 *     parameters:
 *       - name: country_ISO
 *         in: path
 *         description: CountryISO for consumer
 *         required: true
 *         type: string
 *         default: 'am'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.postLoginByEmail = async (req, res) => {
    try {
        let payload = {
            phone: req.body.phone,
            email: req.body.email,
            code: req.body.code
        };
        const regionId = req.region.id;
        try {
            await isSchemeValid(schemes.auth.postLoginEmail, payload);
        } catch (err) {
            loggerValidations.error(err, 'consumer::controller::postLoginEmail');
            return res.status(400).json({ message: 'validation error' });
        }

        const email = await Emails.findOne({
            where: {
                email: payload.email,
                phone: payload.phone,
                code: payload.code,
                sendingDate: { [Op.gte]: new Date(Date.now() - verificationCodeExpirationDate) }
            }
        });

        if (!email) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const isRegisteredConsumer = await Consumers.findOne({
            where: {
                regionId,
                [Op.or]: [
                    {email: payload.email},
                    {phone: payload.phone},
                ],
                registerCompleted: true
            }
        });

        if (isRegisteredConsumer) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await Emails.destroy({ where: {email: payload.email} });
        await Consumers.update(
            { registerByEmailCompleted: true},
            {where: {
                email: payload.email,
                phone: payload.phone,
                regionId,
            }}
        );

        const consumer = await Consumers.findOne({
            where: {
                email: payload.email,
                phone: payload.phone,
                regionId,
            }
        });

        const [user, token] = await security.generateConsumerJWT(consumer, CONSTANTS.JSON_TOKEN_TYPES.CONSUMER_AUTH);
        const response = await formSessionObject(user, token);
        res.cookie('jwt', response.jwt.token, { httpOnly: true, maxAge: response.jwt.expiration });
        return res.json(response);
    } catch (err) {
        log.error(err, 'auth::controller::postLoginByEmail');
        return res.status(500).json({ message: 'server error' });
    }
};

module.exports.refreshToken = (req, res, next) => {
    let payload = {
        phone: req.body.phone,
    };
    validate.isSchemeValid(schemes.auth.refreshToken, payload)
        .then(() => {
            return models.consumers.scope(
                {method: ['consumer', [payload.phone]]}
            ).findOne();
        })
        .then((consumer) => {
            return security.generateConsumerJWT(consumer, CONSTANTS.JSON_TOKEN_TYPES.CONSUMER_AUTH);
        })
        .then(([user, token]) => {
            return formSessionObject(user, token);
        })
        .then((response) => {
            res.cookie('jwt', response.jwt.token, { httpOnly: true, maxAge: response.jwt.expiration });
            return res.json(response);
        })
        .catch((err) => {
            log.error(err, 'auth::refreshToken');
            next(err);
        });
};

const formSessionObject = (user, token) => {
    return new Promise((resolve, reject) => {
        try {
            //form the response
            const response = {
                user: {
                    id: user.id,
                    phone: user.phone,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    lastLoginDate: user.lastLoginDate,
                    isKerpakOperator: user.isKerpakOperator,
                    serviceProviderId: user.serviceProviderId,
                    owner: user.owner,
                    serviceProvider: user.serviceProvider
                },
                jwt: token
            };
            return resolve(response);
        } catch(err) {
            log.error(err, 'auth::controller::formSessionObject');
            return reject(err);
        }
    });
};