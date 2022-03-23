'use strict';

const passportJWT = require('passport-jwt');
const ExtractJWT = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const log = require('app/helpers/logger');
const exception = require('app/helpers/exception');
const CONSTANTS = require('app/constants');

/**
 * Implement passport-jwt strategy
 * @param {*} settings
 * @param {*} secrets
 */
module.exports.strategy = (secret) => {

    const strategyOptions = {
        jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
        secretOrKey: secret,
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
    const strategy = new JwtStrategy(strategyOptions, function(request, payload, next) {
        if(payload.type) {
            const logMessage = {
                type: 'Service',
                token: payload
            };
            switch (payload.type) {
            case CONSTANTS.JSON_TOKEN_TYPES.CONTROLER:
                logMessage.type = 'SERVICE:CONTROLER';
                log.info(logMessage, 'passport::CONTROLER');
                next();
                break;
            default:
                logMessage.type = 'Invalid Token';
                log.warn(logMessage, 'passport::CONTROLER invalid');
                //invalid token
                next(exception.jsonWebTokenInvalidException(), null);
                break;
            }
        }
    });

    return strategy;
};