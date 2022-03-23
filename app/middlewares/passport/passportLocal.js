'use strict';

const passportLocal = require('passport-local');
const LocalStrategy = passportLocal.Strategy;

const log = require('app/helpers/logger');
const validate = require('app/helpers/validate');
const schemes = require('app/schemes');

module.exports.strategy = () => {
    const strategyOptions = {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true,
        session: false
    };

    /**
     * Strategy callback
     * @param req - the request obj
     * @param email - email address from req.body
     * @param password - password from req.body
     * @param next - callback accepting args (done, user, info)
     */
    const strategy = new LocalStrategy(strategyOptions, function(req, email, password, next) {
        const login = {
            email: email.toLowerCase(),
            password: password
        };

        log.debug('Authenticating regular user with username: %s', login.email, 'passport::local-auth');

        validate.isSchemeValid(schemes.auth.postLogin, login)
            .then((validLogin) => {
                return next(null, validLogin);
            })
            .catch((err) => {
                next(err, null);
            });
    });

    return strategy;
};