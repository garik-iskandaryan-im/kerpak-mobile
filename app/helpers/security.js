'use strict';

const jwt = require('jsonwebtoken');
const auth = require('app/controllers/auth');
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
            console.log('\n\n\n\n tokenOptions =', jwtSecret, tokenOptions)
            token.token = jwt.sign(payload, jwtSecret, tokenOptions);
            token.refreshToken = jwt.sign(payload, jwtRefreshSecret, jwtRefreshAuthOptions);
        }
        catch (e) {
            return reject(e);
        }
        return resolve([consumer, token]);
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