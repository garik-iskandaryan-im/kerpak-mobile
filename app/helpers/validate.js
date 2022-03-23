'use strict';

const models = require('app/models/models');
const exception = require('app/helpers/exception');
const validator = require('validator');
const AJV = require('ajv').default;
const ajvFormats = require('ajv-formats');
const ajvKeywords = require('ajv-keywords');

const zxcvbn = require('zxcvbn');
const crypt = require('./crypt');
const CONSTANTS = require('app/constants');

const minimumPasswordScore = 3;

const ajv = new AJV({coerceTypes: true, useDefaults: true});
ajvFormats(ajv);
ajvKeywords(ajv);
/**
 * Validator ext methods
 */
module.exports = {
    all: (validations) => {
        return Promise.all(validations);
    },
    isIn: (needle, haystack) => {

        return new Promise(function (resolve, reject) {
            if(! validator.isIn(needle, haystack)) {
                return reject(exception.invalidParameterException(needle, haystack));
            }
            return resolve([needle, haystack]);
        });
    },
    isEmail: (string, options) => {

        return new Promise((resolve, reject) => {
            //normalize the email with all defaults
            string = validator.normalizeEmail(string);
            //validate
            if(! validator.isEmail(string, options)) {
                return reject(exception.invalidEmailException(string));
            }
            return resolve(string);
        });
    },
    isNotEmpty: (string) => {

        return new Promise((resolve, reject) => {
            if(validator.isEmpty(string)) {
                return reject(exception.nullException());
            }
            return resolve(string);
        });
    },
    isNotUndefined: (obj) => {
        return new Promise((resolve, reject) => {
            if(! obj) {
                return reject(exception.nullException());
            }
            return resolve(obj);
        });
    },
    isUserLoginFound: (user) => {
        return new Promise((resolve, reject) => {
            if(! user) {
                return reject(exception.userLoginNotFoundException());
            }
            return resolve(user);
        });
    },
    isUserHasPasswordHash: (user) => {
        return new Promise((resolve, reject) => {
            if(!user || !user.passwordHash) {
                return reject(exception.userLoginNotFoundException());
            }
            return resolve(user);
        });
    },
    isResetPasswordValid: (req, user) => {
        if (!user || !req.headers.authorization
                || user.resetPasswordToken !== req.headers.authorization.split(' ')[1]) {
            throw exception.invalidResetPasswordException();
        }
        return user;
    },
    isUserActive: (user) => {
        return new Promise((resolve, reject) => {
            if(!user || user.isActive === false) {
                return reject(exception.inactiveUserException(user.email));
            }
            return resolve(user);
        });
    },
    isUserChangingPassword: (user) => {
        return new Promise((resolve, reject) => {
            if(!user || user.isChangingPassword === true) {
                return reject(exception.userChangingPasswordException(user.email));
            }
            return resolve(user);
        });
    },
    isSchemeValid: (scheme, data) => {
        return new Promise((resolve, reject) => {
            try {
                let validate = ajv.compile(scheme);//returns true or false
                if(validate(data) === false) {
                    return reject(exception.schemeIsInvalidException(validate.errors));
                }
                return resolve(data);
            }
            catch(err) {
                return reject(err);
            }
        });
    },
    isValidUserPassword: (password) => {
        return new Promise((resolve, reject) => {
            let results = zxcvbn(password);
            if(results.score < minimumPasswordScore) {
                const {warning = '', suggestions = []} = results.feedback;
                const details = [warning, ...suggestions];
                let score = {
                    score: results.score,
                    details: details.join('\n')
                };
                return reject(exception.lowPasswordScoreException(score));
            }
            return resolve(password);
        });
    },
    isArray: (value) => {
        return new Promise((resolve, reject) => {
            const s = typeof value;
            if (s === 'object' && value) {
                if (value instanceof Array) {
                    return resolve(value);
                }
            }
            return reject(exception.nullException());
        });
    },
    isPasswordPreviouslyUsed: (user, password, transaction) => {
        return new Promise((resolve, reject) => {
            crypt.hash(password).then((newPassword) => {
                models.usersPasswordHistory.findAll({ where: {userId: user.id}, order: [['id', 'ASC']], attributes: ['id', 'userId', 'passwordHash'] })
                    .then((userPasswordHistory) => {
                        const userPasswords = userPasswordHistory.map(item => item.dataValues.passwordHash);
                        crypt.isPasswordFromList(password, userPasswords).then(result => {
                            if(result) {
                                return reject(exception.previouslyUsedPasswordException());
                            }
                            if (newPassword) {
                                return models.usersPasswordHistory.create({ userId: user.id, passwordHash: newPassword }, {transaction}).then(() => {
                                    if (userPasswordHistory.length === CONSTANTS.PREVIOUS_PASSWORD_HISTORY_COUNT) {
                                        models.usersPasswordHistory.destroy({where: {id: userPasswordHistory[0].id}, transaction}).then(() => {
                                            return resolve();
                                        });
                                    }
                                    return resolve();
                                });
                            } else {
                                return resolve();
                            }
                        });
                    });
            });
        });
    },
    isSchemeValidSync: (scheme, data) => {
        const validate = ajv.compile(scheme);
        validate.isValid = validate(data);
        validate.data = data;
        return validate;
    }
};