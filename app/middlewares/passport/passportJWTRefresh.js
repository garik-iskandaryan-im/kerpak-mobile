'use strict';

const passportJWT = require('passport-jwt');
const ExtractJWT = passportJWT.ExtractJwt;
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
module.exports.strategy = (settings, secrets) => {
    const strategyOptions = {
        issuer: settings.options.issuer,
        jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
        secretOrKey: secrets.jwtRefreshSecret,
        jwtSession: settings.options.jwtSession,
        ignoreExpiration: false,
        passReqToCallback: true,
        algorithms: ['HS256']
    };

    /**
     * Strategy callback
     * @param request - request object for the authentication request
     * @param payload - deserialized token
     * @param next - callback accepting args (done, user, info)
     */
    const strategy = new JwtStrategy(strategyOptions, function (request, payload, next) {
        if (payload.type) {
            const logMessage = {
                type: 'User',
                token: payload
            };
            switch (payload.type) {
                /**
                     * Customer user token authentication
                     */
                case CONSTANTS.JSON_TOKEN_TYPES.CONSUMER_AUTH:
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

/**
 * Validate the user request
 * @param {*} req
 * @param {*} payload
 * @param {*} next
 */
const validateUserRequest = (req, payload, next) => {
    validate.isSchemeValid(schemes.auth.userToken, payload)
        .then((token) => {
            return security.authenticateUserFromTokenById(req, token.user);
        })
        .then((user) => {
            //if user is valid with auth token, continue request
            if (user) {
                return next(null, user);
            }
            return next(exception.notAuthenticatedException(), null);
        })
        .catch((err) => {
            next(err, null);
        });
};