const passport = require('passport');

const passportJWT = require('./passportJWT');
const passportJWTRefresh = require('./passportJWTRefresh');
const passportJWTGGService = require('./passportJWTGGService');
const passportJWTCoffeemaniaService = require('./passportJWTCoffeemaniaService');

const exception = require('../../helpers/exception');
const security = require('../../helpers/security');
const log = require('../../helpers/logger');
const CONSTANTS = require('app/constants');

/**
 * Implement passport auth strategies
 * @param {*} settings
 * @param {*} secrets
 */
module.exports.use = (settings, secrets) => {

    /**
     * Init passport strategies
     */
    passport.use('jwtRefresh', passportJWTRefresh.strategy(settings.jwt, secrets));
    passport.use(passportJWT.strategy(settings.jwt, secrets));
    passport.use(CONSTANTS.JSON_TOKEN_TYPES.GG, passportJWTGGService.strategy(secrets.GGSecretKeyBase));
    passport.use(CONSTANTS.JSON_TOKEN_TYPES.COFFEE_MANIA, passportJWTCoffeemaniaService.strategy(secrets.coffeemaniaSecretKeyBase));
    passport.initialize();

    // passport.use('jwtCookie', passportJWTCookie.strategy(settings.jwt, secrets.secretKeyBase));
    // passport.use(CONSTANTS.JSON_TOKEN_TYPES.CONTROLER, passportJWTService.strategy(secrets.secretKeyBase));
    // passport.use(passportLocal.strategy());

    /**
     * Init security with jwt options
     */
    security.use(settings.jwt, secrets);
};

/**
 * Authenticate a user with a static strategy of jwt
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
module.exports.authenticateJWT = (req, res, next) => {
    /**
     * @param err - exception
     * @param response - authentication response (either token or user)
     * @param info - details from the strategy verify callback
     */
    passport.authenticate('jwt', (err, user, info) => {
        if (err) {
            log.error(err, 'passport::jwt');
            return next(err);
        }
        else if (info) {
            log.warn(info, 'passport::jwt');

            switch (info.name) {
                case 'TokenExpiredError':
                    return next(exception.expiredTokenException(info));
                case 'Error':
                case 'JsonWebTokenError':
                    return next(exception.jsonWebTokenException(info));
                case 'NotBeforeError':
                    return next(exception.jsonWebTokenNotBeforeException(info));
                default:
                    return next(exception.exception(info));
            }
        }
        else if (user === false || !user) {
            log.warn({ err: 'user not found' }, 'passport::jwt');
            return next(exception.notAuthenticatedException(), null);
        }
        req.user = user;
        return next(null, user);
    })(req, res, next);
};

module.exports.authenticateJWTRefresh = (req, res, next) => {
    /**
     * @param err - exception
     * @param response - authentication response (either token or user)
     * @param info - details from the strategy verify callback
     */
    passport.authenticate('jwtRefresh', (err, user, info) => {
        if (err) {
            log.error(err, 'passport::jwtRefresh');
            return next(err);
        }
        else if (info) {
            log.warn(info, 'passport::jwtRefresh');

            switch (info.name) {
                case 'TokenExpiredError':
                    return next(exception.expiredTokenException(info));
                case 'Error':
                case 'JsonWebTokenError':
                    return next(exception.jsonWebTokenException(info));
                case 'NotBeforeError':
                    return next(exception.jsonWebTokenNotBeforeException(info));
                default:
                    return next(exception.exception(info));
            }
        }
        else if (user === false || !user) {
            log.warn({ err: 'user not found' }, 'passport::jwt');
            return next(exception.notAuthenticatedException(), null);
        }

        req.user = user;
        return next(null, user);
    })(req, res, next);
};

/**
 * Authenticate a user with a static strategy of jwt
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
module.exports.passportJWTGGService = (req, res, next) => {
    /**
     * @param err - exception
     * @param response - authentication response (either token or user)
     * @param info - details from the strategy verify callback
     */
    passport.authenticate(CONSTANTS.JSON_TOKEN_TYPES.GG, (err, user, info) => {
        if (err) {
            log.error(err, 'passport::GGService');
            return next(err);
        }
        else if (info) {
            log.warn(info, 'passport::GGService');

            switch (info.name) {
                case 'TokenExpiredError':
                    return res.status(403).send({ success: false, message: 'token expired' });
                case 'Error':
                case 'JsonWebTokenError':
                    return res.status(403).send({ success: false, message: 'authentication failed' });
                case 'NotBeforeError':
                    return next(exception.jsonWebTokenNotBeforeException(info));
                default:
                    return next(exception.exception(info));
            }
        }

        return next();
    })(req, res, next);
};

/**
 * Authenticate a user with a static strategy of jwt
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
module.exports.passportJWTCoffeemaniaService = (req, res, next) => {
    /**
     * @param err - exception
     * @param response - authentication response (either token or user)
     * @param info - details from the strategy verify callback
     */
    passport.authenticate(CONSTANTS.JSON_TOKEN_TYPES.COFFEE_MANIA, (err, user, info) => {
        if (err) {
            log.error(err, 'passport::CoffeemaniaService');
            return next(err);
        }
        else if (info) {
            log.warn(info, 'passport::CoffeemaniaService');

            switch (info.name) {
                case 'TokenExpiredError':
                    return res.status(403).send({ success: false, message: 'token expired' });
                case 'Error':
                case 'JsonWebTokenError':
                    return res.status(403).send({ success: false, message: 'authentication failed' });
                case 'NotBeforeError':
                    return next(exception.jsonWebTokenNotBeforeException(info));
                default:
                    return next(exception.exception(info));
            }
        }

        return next();
    })(req, res, next);
};