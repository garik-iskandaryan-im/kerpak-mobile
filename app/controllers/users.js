'use strict';
const { Op } = require('sequelize');
const settings = require('app/settings');

const crypt = require('app/helpers/crypt');
const validate = require('app/helpers/validate');
const messages = require('app/helpers/messages');
const { users } = require('app/schemes');
const log = require('app/helpers/logger');
const CONSTANTS = require('app/constants');
const {
    users: Users,
    serviceProviders: ServiceProviders,
    usersFailedEmails: UsersFailedEmails,
    sequelize,
} = require('app/models/models');
const { makeId, validatePassword, getPasswordLengthByUserType, hasSpace } = require('app/helpers/utils');
const { sendEmail, getResetPasswordEmailBody, getInvitationEmailBody } = require('app/helpers/email/adapters/aws');
const { getListPayload, getOnePayload, addOrderById } = require('app/controllers/common');

const userInvitation = '/user/invitation';
const resetPassword = '/reset/password';
const invitationTitle = 'Invitation to join Kerpak Hub';
const resetPasswordTitle = 'Request to reset password';

module.exports.getUsers = async (req, res) => {
    let payload = getListPayload(req);
    payload.attributes = { exclude: ['passwordHash', 'password'] };
    payload.where.archived = false;
    payload.include = [
        { model: ServiceProviders, attributes: ['legalName'], required: false }
    ];
    payload = addOrderById(payload);
    return Users.findAndCountAll(payload)
        .then(({ count, rows }) => {
            return res.json({ count, data: rows });
        })
        .catch((err) => {
            log.error(err, 'auth::controller::getUsers');
            return res.status(500).json({ message: 'Error in get user list' });
        });
};

module.exports.getUser = async (req, res) => {
    const id = req.params.id;
    const payload = getOnePayload(req, id);
    if (req.user && req.user.isKerpakOperator) {
        payload.attributes = ['id', 'email', 'firstName', 'lastName', 'phone', 'isKerpakOperator', 'serviceProviderId'];
    } else {
        payload.attributes = ['email', 'firstName', 'lastName', 'phone', 'owner', 'isKerpakOperator'];
    }
    return Users.findOne(payload)
        .then((user) => {
            const passwordLength = getPasswordLengthByUserType(user.dataValues);
            return res.json({...user.dataValues, passwordLength});
        })
        .catch((err) => {
            log.error(err, 'auth::controller::getUser');
            return res.status(500).json({ message: 'Error in get user' });
        });
};

module.exports.create = async (req, res) => {
    const payload = { ...req.body };
    validate.isSchemeValid(users.createUser, payload)
        .then(({ email, ...user }) => {
            Users
                .findOne({ where: { email } })
                .then(async exist => {
                    if (exist) {
                        return res.status(409).json({ message: messages.validations.email.isNotUnique(exist.email) });
                    }
                    user.owner = req.user.isKerpakOperator ? true : false;
                    user.email = email;

                    const token = makeId(32);
                    const date = new Date();
                    date.setDate(date.getDate() + 2);

                    user.resetPasswordToken = token;
                    user.resetPasswordExpairationDate = date;
                    Users.create(user).then(async (createdUser) => {
                        if (createdUser) {
                            try {
                                const emails = [payload.email];
                                const emailResetLink = `${settings.domains.sendEmailDomain}${userInvitation}?token=${token}`;
                                const invitedBy = `${req.user.firstName} ${req.user.lastName}`;
                                const invitedUser = `${user.firstName} ${user.lastName}`;
                                const body = getInvitationEmailBody(emailResetLink, invitedBy, invitedUser);
                                await sendEmail(emails, [], invitationTitle, body, settings.s3.SES.NOREPLY);
                                return res.json({ user: createdUser, message: 'User has been created. Invitation email was been sent' });
                            } catch (err) {
                                log.error(err, 'user::create::sendEmail');
                                return res.status(500).json({ message: 'can not send invitation email' });
                            }
                        }
                        return res.status(500).json({ message: 'Error in create user' });
                    }).catch(err => {
                        log.error(err, 'user::create::createUser');
                        return res.status(500).json({ message: 'Error in create user' });
                    });
                })
                .catch((err) => {
                    log.error(err, 'user::create::getUser');
                    return res.status(500).json({ message: 'Error in get user' });
                });
        })
        .catch(err => {
            log.error(err, 'user::create::validation');
            return res.status(404).json({ message: 'validation error' });
        });
};

/**
 * @swagger
 * /user/invite/:
 *   post:
 *     tags:
 *       - Users
 *     summary: Invite new user
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               serviceProviderId:
 *                 type: number
 *               phone:
 *                 type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.inviteUser = async (req, res) => {
    const payload = { ...req.body };
    validate.isSchemeValid(users.inviteUser, payload)
        .then(({email, ...user }) => {
            Users
                .findOne({ where: { email } })
                .then(async exist => {
                    if (exist) {
                        return res.status(409).json({ message: messages.validations.email.isNotUnique(exist.email) });
                    }
                    user.owner = false;
                    user.email = email;

                    const token = makeId(32);
                    const date = new Date();
                    date.setDate(date.getDate() + 2);

                    user.resetPasswordToken = token;
                    user.resetPasswordExpairationDate = date;
                    Users.create(user).then(async (createdUser) => {
                        if (createdUser) {
                            try {
                                const emails = [payload.email];
                                const emailResetLink = `${settings.domains.sendEmailDomain}${userInvitation}?token=${token}`;
                                const invitedBy = `${req.user.firstName} ${req.user.lastName}`;
                                const invitedUser = `${user.firstName} ${user.lastName}`;
                                const body = getInvitationEmailBody(emailResetLink, invitedBy, invitedUser);
                                await sendEmail(emails, [], invitationTitle, body, settings.s3.SES.NOREPLY);
                                return res.json({ user: createdUser, message: 'User has been created. Invitation email was been sent' });
                            } catch (err) {
                                log.error(err, 'user::inviteUser::sendEmail');
                                return res.status(500).json({ message: 'can not send invitation email' });
                            }
                        }
                        return res.status(500).json({ message: 'Error in create user' });
                    }).catch(err => {
                        log.error(err, 'user::inviteUser::createUser');
                        return res.status(500).json({ message: 'Error in create user' });
                    });
                })
                .catch((err) => {
                    log.error(err, 'user::inviteUser::getUser');
                    return res.status(500).json({ message: 'Error in get user' });
                });
        })
        .catch(err => {
            log.error(err, 'user::inviteUser::validation');
            return res.status(404).json({ message: 'validation error' });
        });
};

module.exports.updateUser = async (req, res) => {
    const id = Number(req.params.id);
    const payload = req.body;
    payload.id = id;
    validate.isSchemeValid(users.putUser, payload)
        .then(() => {
            Users.scope({ method: ['email', payload.email] })
                .findOne({ where: { id: { [Op.ne]: id } } })
                .then(async exist => {
                    if (exist) {
                        return res.status(409).json({ message: messages.validations.email.isNotUnique(payload.user.email) });
                    }
                    delete payload.email;
                    delete payload.isKerpakOperator;
                    delete payload.serviceProviderId;
                    delete payload.id;
                    Users.update(payload, { where: { id } }).then(async ([updated]) => {
                        if (updated) {
                            return Users.scope(
                                { method: ['user', id] })
                                .findOne()
                                .then(async (user) => {
                                    return res.json({ user, message: 'user has been updated' });
                                })
                                .catch((err) => {
                                    log.error(err, 'user::updateUser::error in get user');
                                    return res.status(500).json({ message: 'Error in get user' });
                                });
                        }
                        return res.status(404).json({ message: 'user not found' });
                    }).catch((err) => {
                        log.error(err, 'user::updateUser::can not update user');
                        return res.status(500).json({ message: 'can not update user' });

                    });
                })
                .catch((err) => {
                    log.error(err, 'user::updateUser::getUser');
                    return res.status(500).json({ message: 'error in get user' });
                });
        })
        .catch((err) => {
            log.error(err, 'user::updateUser::validation');
            return res.status(400).json({ message: 'validation error' });
        });
};

const validateUserAndPassword = (user, payload, withToken = false) => {
    // validate password field for spaces
    if (payload.currentPassword && hasSpace(payload.currentPassword)) {
        return {hasError: true, status: 400, message: 'Validation error.'};
    }
    if (payload.oldPassword && hasSpace(payload.oldPassword)) {
        return {hasError: true, status: 400, message: 'Validation error.'};
    }
    if (payload.newPassword && hasSpace(payload.newPassword)) {
        return {hasError: true, status: 400, message: 'Validation error.'};
    }
    if (payload.repeatNewPassword && hasSpace(payload.repeatNewPassword)) {
        return {hasError: true, status: 400, message: 'Validation error.'};
    }

    if (!user) {
        return {hasError: true, status: 404, message: withToken ? 'Token not found' : 'User not found.'};
    }
    if (payload.newPassword !== payload.repeatNewPassword) {
        return {hasError: true, status: 403, message: 'Passwords are not equal.'};
    }
    const {hasError, message, status} = validatePassword(user, payload.newPassword);
    return {hasError, message, status};
};

/**
 * @swagger
 * /user/{id}/password:
 *   put:
 *     tags:
 *       - Users
 *     summary: Change user password
 *     description: ''
 *     parameters:
 *      - in: path
 *        name: id
 *        description: user id
 *        required: true
 *        type: number
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               repeatNewPassword:
 *                 type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.changeUserPassword = async (req, res) => {
    const id = Number(req.params.id);
    const payload = req.body;
    let transaction;
    validate.isSchemeValid(users.changeUserPassword, payload)
        .then(() => {
            Users.scope({ method: ['withPasswords', id] })
                .findOne({ where: { id: id } })
                .then(async user => {
                    const {hasError: validateError, message: validateMessage, status: validateStatus} = validateUserAndPassword(user, payload, false);
                    if (validateError) {
                        return res.status(validateStatus).json({ message: validateMessage });
                    }
                    let validPassword = await crypt.compare(payload.currentPassword, user.passwordHash);
                    if (!validPassword) {
                        return res.status(403).json({ message: 'Wrong password provided.' });
                    }
                    transaction = await sequelize.transaction();
                    const newPassword = await crypt.hash(payload.newPassword);
                    try {
                        await validate.isPasswordPreviouslyUsed(user, payload.newPassword, transaction);
                    } catch(err) {
                        log.error(err, 'user::changeUserPassword::isPasswordPreviouslyUsed');
                        await transaction.rollback();
                        return res.status(err.status).json({ message: err.message });
                    }

                    const updatePayload = {
                        passwordHash: newPassword,
                        passwordExpireDate: new Date(Date.now() + CONSTANTS.PASSWORD_EXPIRE_DAYS * 24 * 60 * 60 * 1000),
                        isActive: true,
                    };
                    await UsersFailedEmails.destroy({ where: { email: user.email } });
                    Users.update(updatePayload, { where: { id }, transaction }).then(async ([updated]) => {
                        if (updated) {
                            await transaction.commit();
                            return res.json({ message: 'user has been updated' });
                        }
                        await transaction.rollback();
                        return res.status(500).json({ message: 'can not update user' });
                    }).catch(async (err) => {
                        await transaction.rollback();
                        log.error(err, 'user::changeUserPassword::users::update');
                        return res.status(500).json({ message: 'can not update user' });

                    });
                })
                .catch(async (err) => {
                    if (transaction) {
                        await transaction.rollback();
                    }
                    log.error(err, 'user::changeUserPassword::getUser');
                    return res.status(500).json({ message: 'can not update user' });
                });
        })
        .catch(async (err) => {
            if (transaction) {
                await transaction.rollback();
            }
            log.error(err, 'user::changeUserPassword::validation');
            return res.status(500).json({ message: 'Error in change user password' });
        });
};

/**
 * @swagger
 * /user/password/reset/:
 *   post:
 *     tags:
 *       - Users
 *     summary: Send reset password link
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.sendResetEmail = async (req, res) => {
    const payload = req.body;
    validate.isSchemeValid(users.resetPassword, payload)
        .then(() => {
            Users.findOne({ where: { email: payload.email } })
                .then(async user => {
                    if (!user) {
                        log.error(`${payload.email} not found`, 'user::sendResetEmail::sentEmail');
                        return res.json({ message: 'The email has been sent.' });
                    }
                    const token = makeId(32);
                    const date = new Date();
                    date.setDate(date.getDate() + 2);

                    const updatePayload = {
                        resetPasswordToken: token,
                        resetPasswordExpairationDate: date,
                    };
                    Users.update(updatePayload, { where: { email: payload.email } }).then(async ([updated]) => {
                        if (updated) {
                            try {
                                const emails = [payload.email];
                                const emailResetLink = `${settings.domains.sendEmailDomain}${resetPassword}?token=${token}`;
                                const body = getResetPasswordEmailBody(emailResetLink);
                                await sendEmail(emails, [], resetPasswordTitle, body, settings.s3.SES.NOREPLY);
                                return res.json({ message: 'The email has been sent.' });
                            } catch (err) {
                                log.error(err, 'user::sendResetEmail::sendEmail');
                                return res.status(500).json({ message: 'can not send reset email' });
                            }

                        }
                        return res.status(500).json({ message: 'can not send reset email' });
                    }).catch(err => {
                        log.error(err, 'user::sendResetEmail::update');
                        return res.status(500).json({ message: 'can not update user' });

                    });
                })
                .catch((err) => {
                    log.error(err, 'auth::sendResetEmail::getUser');
                    return res.status(500).json({ message: 'can not get user' });
                });
        })
        .catch(err => {
            log.error(err, 'user::sendResetEmail::validation');
            return res.status(400).json({ message: 'validation error' });
        });
};

/**
 * @swagger
 * /user/check/token/{token}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Check reset token
 *     description: ''
 *     parameters:
 *      - in: path
 *        name: token
 *        description: reset token
 *        required: true
 *        type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.checkResetToken = async (req, res) => {
    const token = req.params.token;
    if (!token) {
        log.error(`${token} not provided`, 'user::checkResetToken::validation');
        return res.status(404).json({ message: 'validation error' });
    }
    const date = new Date();
    Users.findOne({ where: { resetPasswordToken: token, resetPasswordExpairationDate: { [Op.gte]: date} } })
        .then(async user => {
            if (!user) {
                log.error(`${token} not found`, 'user::checkResetToken::user not found');
                return res.status(404).json({ message: 'user not found' });
            }
            const passwordLength = getPasswordLengthByUserType(user);
            return res.json({ message: 'token is valid', passwordLength });
        }).catch(err => {
            log.error(err, 'user::checkResetToken::server error');
            return res.status(500).json({ message: 'can not reset token' });
        });
};

/**
 * @swagger
 * /user/password/reset:
 *   put:
 *     tags:
 *       - Users
 *     summary: Reset user password
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               repeatNewPassword:
 *                 type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.changePasswordByToken = async (req, res) => {
    let transaction;
    const payload = req.body;
    validate.isSchemeValid(users.changePasswordByToken, payload)
        .then(() => {
            const date = new Date();
            Users.findOne({ where: { resetPasswordToken: payload.token, resetPasswordExpairationDate: { [Op.gte]: date} } })
                .then(async user => {
                    const {hasError, message, status} = validateUserAndPassword(user, payload, true);
                    if (hasError) {
                        return res.status(status).json({ message });
                    }

                    const newPassword = await crypt.hash(payload.newPassword);
                    transaction = await sequelize.transaction();
                    try {
                        await validate.isPasswordPreviouslyUsed(user, payload.newPassword, transaction);
                    } catch(err) {
                        log.error(err, 'user::changePasswordByToken::isPasswordPreviouslyUsed');
                        await transaction.rollback();
                        return res.status(err.status).json({ message: err.message });
                    }

                    const updatePayload = {
                        passwordHash: newPassword,
                        resetPasswordExpairationDate: null,
                        resetPasswordToken: null,
                        passwordExpireDate: new Date(Date.now() + CONSTANTS.PASSWORD_EXPIRE_DAYS * 24 * 60 * 60 * 1000),
                        isActive: true,
                    };
                    await UsersFailedEmails.destroy({ where: { email: user.email } });
                    Users.update(updatePayload, { where: { id: user.id }, transaction }).then(async ([updated]) => {
                        if (updated) {
                            await transaction.commit();
                            return res.json({ message: 'password has been updated' });
                        }
                        await transaction.rollback();
                        return res.status(500).json({ message: 'can not update user' });
                    }).catch(async (err) => {
                        await transaction.rollback();
                        log.error(err, 'user::changePasswordByToken::updateUser');
                        return res.status(500).json({ message: 'can not update user' });

                    });
                })
                .catch(async (err) => {
                    if (transaction) {
                        await transaction.rollback();
                    }
                    log.error(err, 'user::changePasswordByToken::getUser');
                    return res.status(500).json({ message: 'can not get user' });
                });
        })
        .catch(async (err) => {
            if (transaction) {
                await transaction.rollback();
            }
            log.error(err, 'user::changePasswordByToken::validation');
            return res.status(400).json({ message: 'validation error' });
        });
};

/**
 * @swagger
 * /user/password/change:
 *   put:
 *     tags:
 *       - users
 *     summary: change user password
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               repeatNewPassword:
 *                 type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.changePassword = async (req, res) => {
    let transaction;
    const payload = req.body;
    validate.isSchemeValid(users.changePassword, payload).then(() => {
        Users.findOne({ where: { email: payload.email }, attributes: {include: ['passwordHash']} }).then(async user => {
            const {hasError: requirementsHasError, message: errMessage, status: resStatus} = validateUserAndPassword(user, payload, false);
            if (requirementsHasError) {
                return res.status(resStatus).json({ message: errMessage });
            }
            let validPassword = await crypt.compare(payload.oldPassword, user.passwordHash);
            if (!validPassword) {
                return res.status(403).json({ message: 'Wrong password provided.' });
            }
            transaction = await sequelize.transaction();
            const newPassword = await crypt.hash(payload.newPassword);

            try {
                await validate.isPasswordPreviouslyUsed(user, payload.newPassword, transaction);
            } catch(err) {
                log.error(err, 'user::changePassword::isPasswordPreviouslyUsed');
                await transaction.rollback();
                return res.status(err.status).json({ message: err.message });
            }

            const updatePayload = {
                passwordHash: newPassword,
                passwordExpireDate: new Date(Date.now() + CONSTANTS.PASSWORD_EXPIRE_DAYS * 24 * 60 * 60 * 1000),
                isActive: true,
            };
            await UsersFailedEmails.destroy({ where: { email: user.email } });
            Users.update(updatePayload, { where: { id: user.id }, transaction }).then(async ([updated]) => {
                if (updated) {
                    await transaction.commit();
                    return res.json({ message: 'Password has been updated.' });
                }
                await transaction.rollback();
                return res.status(500).json({ message: 'Can not update user.' });
            }).catch(async (err) => {
                await transaction.rollback();
                log.error(err, 'user::changePassword::updateUser');
                return res.status(500).json({ message: 'Can not update user.' });
            });
        }).catch(async (err) => {
            if (transaction) {
                await transaction.rollback();
            }
            log.error(err, 'user::changePassword::getUser');
            return res.status(500).json({ message: 'Can not get user.' });
        });
    }).catch(async (err) => {
        if (transaction) {
            await transaction.rollback();
        }
        log.error(err, 'user::changePassword::validation');
        return res.status(400).json({ message: 'validation error' });
    });
};