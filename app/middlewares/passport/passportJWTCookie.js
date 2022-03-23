'use strict';

const passportJWT = require('passport-jwt');
const JwtStrategy = passportJWT.Strategy;

const log = require('../../helpers/logger');
const exception = require('../../helpers/exception');
const security = require('../../helpers/security');
const validate = require('../../helpers/validate');
const schemes = require('app/schemes');
const CONSTANTS = require('app/constants');

/**
 * Implement passport-jwt strategy
 * @param {*} settings
 * @param {*} secrets
 */
module.exports.strategy = (settings, secret) => {
    const cookieExtractor = function(req) {
        let token = null;
        if (req && req.cookies) {
            token = req.cookies['jwt'];
        }
        return token;
    };

    const strategyOptions = {
        issuer: settings.options.issuer,
        jwtFromRequest: cookieExtractor,
        secretOrKey: secret,
        jwtSession: settings.options.jwtSession,
        ignoreExpiration: false,
        passReqToCallback: true,
        algorithms: ['HS256']
    };

    const strategy = new JwtStrategy(strategyOptions, function(request, payload, next) {
        if(payload.type) {
            const logMessage = {
                type: 'User',
                token: payload
            };
            switch (payload.type) {
            case CONSTANTS.JSON_TOKEN_TYPES.USER_AUTH:
            case CONSTANTS.JSON_TOKEN_TYPES.USER_SET_PASSWORD:
            case CONSTANTS.JSON_TOKEN_TYPES.USER_REGISTER:
                logMessage.type = 'User';
                validateUserRequest(request, payload, next);
                break;
            default:
                logMessage.type = 'Invalid Token';
                log.warn(logMessage, 'passport::jwt-auth invalid');
                //invalid token
                next(exception.jsonWebTokenInvalidException(), null);
                break;
            }
        }
    });

    return strategy;
};

const validateUserRequest = (req, payload, next) => {
    validate.isSchemeValid(schemes.auth.userToken, payload)
        .then((token) => {
            return security.authenticateUserFromTokenByGuid(req, token.user);
        })
        .then((user) => {
            if(user) {
                return next(null, user);
            }
            return next(exception.notAuthenticatedException(), null);
        })
        .catch((err) => {
            next(err, null);
        });
};