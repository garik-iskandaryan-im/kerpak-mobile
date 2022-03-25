'use strict';

const { Op } = require('sequelize');
const models = require('app/models/models');
const {
    consumers: Consumers,
    emails: Emails,
    regions: Regions,
} = require('app/models/models');
const { isSchemeValid } = require('app/helpers/validate');

const security = require('app/helpers/security');
const schemes = require('app/schemes');
const CONSTANTS = require('app/constants');
const twilio = require('app/helpers/sms/twilio');
const SNS = require('app/helpers/sms/aws');
const { getOperatorsEmails } = require('app/helpers/email/service');
const { sendEmail, getRegisterVerificationCodeEmailBody } = require('app/helpers/email/adapters/aws');
const {
    SMS: { SINGLE_USER_lIMIT, DAY_LIMIT },
    s3: { SES: { NOREPLY } },
    auth: { verificationCodeExpirationDate }
} = require('app/settings');
const { createVerificationCode, makeId } = require('app/helpers/utils');
const loggerMobileAuth = require('app/helpers/loggerMobileAuth');
const log = require('app/helpers/logger');

const getConsumerBankId = async () => {
    const bankClientId = makeId(17);
    const consumer = await models.consumers.findOne({ where: { bankClientId } });
    if (consumer) {
        return await getConsumerBankId();
    }
    return bankClientId;
};

const getRegionId = async (country_ISO) => {
    if (country_ISO) {
        const { id } = await Regions.findOne({ where: { isoCode: country_ISO } });
        return id;
    }
    return null;
};

const getJWTToken = async (consumer) => {
    const [user, token] = await security.generateConsumerJWT(consumer, CONSTANTS.JSON_TOKEN_TYPES.CONSUMER_AUTH);
    const response = await formSessionObject(user, token);
    return response;
};

/**
 * @swagger
 * '/mobile/auth/register/consumer/':
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register consumer
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               country_ISO:
 *                  type: ['string','null']
 *                  default: null
 *                  nullable: true
 *                  required: false
 *                  example: null
 *     produces:
 *       -application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.registerConsumer = async (req, res, next) => {
    try {
        let payload = {
            phone: req.body.phone,
            hash: req.body.hash || '',
            country_ISO: req.body.country_ISO || null
        };

        try {
            await isSchemeValid(schemes.auth.registerConsumer, payload);
        } catch (err) {
            loggerMobileAuth.error(err, req, 'consumer::auth::registerConsumer::validation error');
            return res.status(400).json({ message: 'validation error' });
        }
        const phone = payload.phone;
        const regionId = await getRegionId(payload.country_ISO);

        let consumer = await models.consumers.scope({ method: ['consumerByRegion', [phone], regionId] }).findOne();

        if (!consumer) {
            const bankClientId = await getConsumerBankId();
            consumer = await models.consumers.create({
                phone: phone,
                bankClientId: bankClientId,
                regionId,
            });
        }
        const code = createVerificationCode();
        let message = twilio.compileMessage(null, { code });
        if (payload.hash) {
            message = `<#> ${message} \r\n${payload.hash}`;
        }
        const currentDate = new Date();
        let limitForSingleUser = await models.smsLog.count({
            where: {
                phone,
                regionId,
                createdAt: {
                    [Op.gte]: new Date(currentDate.getTime() - 15 * 60 * 1000)
                }
            }
        });
        if (limitForSingleUser > SINGLE_USER_lIMIT - 1) {
            loggerMobileAuth.error({}, req, 'consumer::auth::registerConsumer::SMS confirmation request limit reached');
            return res.status(403).json({ message: 'SMS confirmation request limit reached' });
        }
        let limitForDay = await models.smsLog.count({
            where: {
                createdAt: {
                    [Op.gte]: new Date(currentDate.getTime() - 24 * 60 * 60 * 1000)
                }
            }
        });
        if (limitForDay > DAY_LIMIT - 1) {
            const title = 'Kerpak | Platform | OTP Requests daily limit reached';
            const body = 'The 500 OTP requests limit was reached, please take action.';
            const emails = await getOperatorsEmails();
            await sendEmail(emails, [], title, body);
            loggerMobileAuth.error({}, req, 'consumer::auth::registerConsumer::SMS confirmation request day limit reached');
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
        const sms = await models.sms.findOne({ where: { phone: phone, regionId } });
        if (sms) {
            await models.sms.update({ code: code }, { where: { phone: phone, regionId } })
        } else {
            await models.sms.create({ phone, code, regionId })
        }
        return res.json({ phone, message: 'sms has been sent' });
    } catch (err) {
        loggerMobileAuth.error(err, req, 'consumer::auth::registerConsumer::server error');
        return res.status(500).json({ message: 'server error' });
    }
};

/**
 * @swagger
 * '/mobile/auth/login/sms/':
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login via SMS
 *     description: ''
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
 *               country_ISO:
 *                  type: ['string','null']
 *                  default: null
 *                  nullable: true
 *                  required: false
 *                  example: null
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.postLoginSMS = async (req, res, next) => {
    try {
        let payload = {
            phone: req.body.phone,
            code: req.body.code,
            country_ISO: req.body.country_ISO || null
        };

        try {
            await isSchemeValid(schemes.auth.postLoginSMS, payload);
        } catch (err) {
            loggerMobileAuth.error(err, req, 'consumer::auth::postLoginSMS::validation error');
            return res.status(400).json({ message: 'validation error' });
        }

        const regionId = await getRegionId(payload.country_ISO);
        const sms = await models.sms.scope({ method: ['authenticate', [payload.phone], payload.code, regionId] }).findOne();
        if (!sms) {
            loggerMobileAuth.error({}, req, 'consumer::auth::postLoginSMS::forbidden');
            return res.status(403).send({ message: 'forbidden' });
        } else {
            await models.consumers.update({ registerCompleted: true }, { where: { phone: payload.phone, regionId } });
            await models.sms.destroy({ where: { phone: payload.phone, regionId, code: payload.code } });
            const consumer = await models.consumers.scope({ method: ['consumerByRegion', [payload.phone], regionId] }).findOne();
            const response = await getJWTToken(consumer);
            res.cookie('jwt', response.jwt.token, { httpOnly: true, maxAge: response.jwt.expiration });
            return res.json(response);
        }
    } catch (err) {
        loggerMobileAuth.error(err, req, 'consumer::auth::postLoginSMS::server error');
        return res.status(500).json({ message: 'server error' });
    }
};

/**
 * @swagger
 * '/mobile/auth/register/consumer/email/':
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register consumer by email
 *     description: ''
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
 *               country_ISO:
 *                  type: ['string','null']
 *                  default: null
 *                  nullable: true
 *                  required: false
 *                  example: null
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
            country_ISO: req.body.country_ISO || null
        };
        try {
            await isSchemeValid(schemes.auth.registerConsumerByEmail, payload);
        } catch (err) {
            loggerMobileAuth.error(err, req, 'consumer::auth::registerConsumerByEmail::validation error');
            return res.status(400).json({ message: 'validation error' });
        }

        const regionId = await getRegionId(payload.country_ISO);

        const consumer = await Consumers.findOne({ where: { phone: payload.phone, regionId } });
        if (consumer && consumer.registerCompleted) {
            loggerMobileAuth.error({}, req, 'consumer::auth::registerConsumer::phone is verified via sms');
            return res.status(403).json({ message: 'Forbidden' });
        }

        if (consumer && consumer.email && consumer.registerByEmailCompleted && consumer.email !== req.body.email) {
            loggerMobileAuth.error({}, req, 'consumer::auth::registerConsumerByEmail::validation error::forbidden::email is already registered');
            return res.status(403).json({ message: 'Forbidden' });
        }

        const isEmailRegistred = await Consumers.findOne({
            where: {
                email: payload.email,
                [Op.or]: {
                    regionId: {
                        [Op.not]: regionId
                    },
                    phone: {
                        [Op.not]: payload.phone
                    }
                }
            }
        });
        if (isEmailRegistred) {
            loggerMobileAuth.error({}, req, 'consumer::auth::registerConsumerByEmail::validation error::forbidden::consumer with email is already registered vie phone');
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
                {
                    where: {
                        phone: payload.phone,
                        regionId,
                    }
                }
            );
        }
        const currConsumer = await Consumers.findOne({ where: { phone: payload.phone, regionId } });
        const email = await Emails.findOne({ where: { consumerId: currConsumer.id } });
        const sendingDate = new Date();
        if (email) {
            await Emails.update({ code, sendingDate, email: payload.email }, { where: { consumerId: currConsumer.id } });
        } else {
            await Emails.create({
                email: payload.email,
                code: code,
                phone: payload.phone,
                sendingDate: sendingDate,
                consumerId: currConsumer.id
            });
        }

        return res.json({ message: 'email has been sent' });
    } catch (err) {
        loggerMobileAuth.error(err, req, 'consumer::auth::registerConsumerByEmail::server error');
        return res.status(500).json({ message: 'server error' });
    }
};

/**
 * @swagger
 * '/mobile/auth/login/email/':
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login via email
 *     description: ''
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
 *               country_ISO:
 *                  type: ['string','null']
 *                  default: null
 *                  nullable: true
 *                  required: false
 *                  example: null
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
            code: req.body.code,
            country_ISO: req.body.country_ISO || null
        };

        try {
            await isSchemeValid(schemes.auth.postLoginEmail, payload);
        } catch (err) {
            loggerMobileAuth.error(err, req, 'consumer::auth::postLoginByEmail::validation error');
            return res.status(400).json({ message: 'validation error' });
        }

        const regionId = await getRegionId(payload.country_ISO);

        const email = await Emails.findOne({
            where: {
                email: payload.email,
                phone: payload.phone,
                code: payload.code,
                sendingDate: { [Op.gte]: new Date(Date.now() - verificationCodeExpirationDate) }
            }
        });

        if (!email) {
            loggerMobileAuth.error({}, req, 'consumer::auth::postLoginByEmail::Forbidden:email not found');
            return res.status(403).json({ message: 'Forbidden' });
        }

        const isRegisteredConsumer = await Consumers.findOne({
            where: {
                regionId,
                [Op.or]: [
                    { email: payload.email },
                    { phone: payload.phone },
                ],
                registerCompleted: true
            }
        });

        if (isRegisteredConsumer) {
            loggerMobileAuth.error({}, req, 'consumer::auth::postLoginByEmail::Forbidden:Consumer verified vie sms');
            return res.status(403).json({ message: 'Forbidden' });
        }

        await Emails.destroy({ where: { email: payload.email } });
        await Consumers.update(
            { registerByEmailCompleted: true },
            {
                where: {
                    email: payload.email,
                    phone: payload.phone,
                    regionId,
                }
            }
        );

        const consumer = await Consumers.findOne({
            where: {
                email: payload.email,
                phone: payload.phone,
                regionId,
            }
        });

        const response = await getJWTToken(consumer);
        res.cookie('jwt', response.jwt.token, { httpOnly: true, maxAge: response.jwt.expiration });
        return res.json(response);
    } catch (err) {
        loggerMobileAuth.error(err, req, 'consumer::auth::postLoginByEmail::server error');
        return res.status(500).json({ message: 'server error' });
    }
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
        } catch (err) {
            loggerMobileAuth.error(err, 'consumer::auth::formSessionObject::server error');
            return reject(err);
        }
    });
};

/**
 * @swagger
 * /mobile/auth/refresh/token:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Get refresh token
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.refreshToken = (req, res, next) => {
    let payload = {
        phone: req.body.phone,
    };
    isSchemeValid(schemes.auth.refreshToken, payload)
        .then(() => {
            return models.consumers.scope(
                { method: ['consumer', [payload.phone]] }
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
            loggerMobileAuth.error(err, req, 'consumer::auth::refreshToken::server error');
            next(err);
        });
};

/**
 * @swagger
 * /mobile/region/iso2/{iso2}:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Change consumer region
 *     description: ''
 *     parameters:
 *       - name: iso2
 *         in: path
 *         description: iso2 of the region
 *         required: true
 *         type: string
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.changeRegion = async (req, res) => {
    try {
        const { iso2 } = req.params;
        const region = await Regions.findOne({ where: { isoCode: iso2 } });
        let currentConsumer = await Consumers.findOne({ where: { id: req.user.id } });
        let consumer = await Consumers.findOne({ where: { phone: currentConsumer.phone, regionId: region.id } });
        if (currentConsumer.regionId === null && !consumer) {
            await Consumers.update({ regionId: region.id }, { where: { id: currentConsumer.id } });
            consumer = await Consumers.findOne({ where: { id: currentConsumer.id } });
        } else if (!consumer) {
            const bankClientId = await getConsumerBankId();
            consumer = await Consumers.create({
                regionId: region.id,
                phone: currentConsumer.phone,
                email: currentConsumer.email,
                firstName: currentConsumer.firstName,
                lastName: currentConsumer.lastName,
                registerCompleted: currentConsumer.registerCompleted,
                registerByEmailCompleted: currentConsumer.registerByEmailCompleted,
                bankClientId: bankClientId,
            });
        } else if (consumer) {
            if (currentConsumer.registerCompleted !== consumer.registerCompleted) {
                loggerMobileAuth.error({}, req, 'consumer::auth::changeRegion::forbidden::phone is verified');
                return res.status(403).json({ message: 'Forbidden' });
            }
        }
        const response = await getJWTToken(consumer);
        res.cookie('jwt', response.jwt.token, { httpOnly: true, maxAge: response.jwt.expiration });
        return res.json(response);
    } catch (err) {
        loggerMobileAuth.error(err, req, 'consumer::auth::changeRegion::server error');
        return res.status(500).json({ message: 'Error to change region' });
    }
};

module.exports.authenticateUserFromTokenById = (id) => {
    return models.consumers.scope(
        { method: ['id', id] })
        .findOne()
        .then((user) => {
            return user;
        })
        .catch((err) => {
            log.error(err, 'auth::authenticateUserFromTokenById');
            return err;
        });
};