'use strict';

const jwt = require('jsonwebtoken');
const auth = require('app/controllers/auth');
const validate = require('app/helpers/validate');
const CONSTANTS = require('app/constants');

let jwtAuthOptions;
let jwtSetPasswordOptions;
let jwtRegisterOptions;
let jwtSecret;
let jwtRefreshSecret;
let jwtRefreshAuthOptions;

/**
 * Init security with options
 * @param {obj} settings
 * @param {string} secret
 */
module.exports.use = (settings, secrets) => {
    jwtSecret = secrets.secretKeyBase;
    jwtRefreshSecret = secrets.jwtRefreshSecret;

    jwtAuthOptions = {
        issuer: settings.options.issuer,
        algorithm: settings.options.algorithm,
        expiresIn: settings.tokens.auth.expiration,
    };
    jwtRefreshAuthOptions = {
        issuer: settings.options.issuer,
        algorithm: settings.options.algorithm,
        expiresIn: settings.tokens.auth.refreshExpiration
    };
    jwtSetPasswordOptions = {
        issuer: settings.options.issuer,
        algorithm: settings.options.algorithm,
        expiresIn: settings.tokens.setPassword.expiration
    };
    jwtRegisterOptions = {
        issuer: settings.options.issuer,
        algorithm: settings.options.algorithm,
        expiresIn: settings.tokens.register.expiration
    };
};

/**
 * Generate a user token )
 * @param {obj} user
 * @param {boolean} tokenType - contants: login,registration,etc
 */
module.exports.generateUserJWT = (user, tokenType) => {
    return new Promise((resolve, reject) => {
        let token;
        try {
            //set token options based on user token type
            let tokenOptions;
            switch (tokenType) {
            case CONSTANTS.JSON_TOKEN_TYPES.USER_AUTH:
                tokenOptions = jwtAuthOptions;
                break;
            case CONSTANTS.JSON_TOKEN_TYPES.USER_SET_PASSWORD:
                tokenOptions = jwtSetPasswordOptions;
                break;
            case CONSTANTS.JSON_TOKEN_TYPES.USER_REGISTER:
                tokenOptions = jwtRegisterOptions;
                break;
            default:
                return reject('undefined user token type');
            }

            //construct the token
            //calculate the epoch time of the token expiration
            //where the token expiresIn value is in seconds
            token = {
                token: CONSTANTS.JSON_TOKEN_TYPES.AUTH,
                expiration: Date.now().valueOf() + (tokenOptions.expiresIn * 1000)
            };

            //generate the token and return the token if success
            let payload = {
                type: tokenType,
                user: {
                    id: user.id,
                    email: user.email
                }
            };
            token.token = jwt.sign(payload, jwtSecret, tokenOptions);
        }
        catch(e) {
            return reject(e);
        }
        return resolve([user, token]);
    });
};

module.exports.generateConsumerJWT = (consumer, tokenType) => {
    return new Promise((resolve, reject) => {
        let token;
        try {
            //set token options based on user token type
            let tokenOptions;
            switch (tokenType) {
            case CONSTANTS.JSON_TOKEN_TYPES.CONSUMER_AUTH:
                tokenOptions = jwtAuthOptions;
                break;
            default:
                return reject('undefined user token type');
            }

            token = {
                token: tokenType,
                expiration: Date.now().valueOf() + (tokenOptions.expiresIn * 1000)
            };

            //generate the token and return the token if success
            let payload = {
                type: tokenType,
                user: {
                    id: consumer.id,
                    phone: consumer.phone,
                }
            };
            token.token = jwt.sign(payload, jwtSecret, tokenOptions);
            token.refreshToken = jwt.sign(payload, jwtRefreshSecret, jwtRefreshAuthOptions);
        }
        catch(e) {
            return reject(e);
        }
        return resolve([consumer, token]);
    });
};

module.exports.authenticateUserFromTokenByGuid = (req, user) => {
    return new Promise((resolve, reject) => {
        auth.authenticateUserByEmail(user.email)
            .then((user) => {
                return validate.isUserActive(user);
            })
            .then((user) => {
                return resolve(user);
            })
            .catch((err) => {
                return reject(err);
            });
    });
};

module.exports.authenticateUserFromTokenById = (req, user) => {
    return new Promise((resolve, reject) => {
        auth.authenticateUserFromTokenById(user.id)
            .then((user) => {
                return resolve(user);
            })
            .catch((err) => {
                return reject(err);
            });
    });
};
