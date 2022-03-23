'use strict';

const passport = require('../../middlewares/passport');
const authConsumer = require('app/controllers/consumer/auth');

module.exports = (app) => {
    app.route('/mobile/auth/login/sms/')
        .post(authConsumer.postLoginSMS);
    app.route('/mobile/auth/login/email/')
        .post(authConsumer.postLoginByEmail);
    app.route('/mobile/auth/register/consumer/email/')
        .post(authConsumer.registerConsumerByEmail);
    app.route('/mobile/auth/register/consumer/')
        .post(authConsumer.registerConsumer);
    app.route('/mobile/auth/refresh/token')
        .post(passport.authenticateJWTRefresh, authConsumer.refreshToken);
    app.route('/mobile/region/iso2/:iso2')
        .post(passport.authenticateJWT, authConsumer.changeRegion);
};