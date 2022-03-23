'use strict';

const passport = require('../middlewares/passport');
const auth = require('app/controllers/auth');
const consumer = require('../middlewares/consumer');

module.exports = (app) => {
    app.route('/auth/login')
        .post(passport.authenticateLocal, auth.postLogin);
    app.route('/auth/login/sms/:country_ISO')
        .post(consumer.validateRegion, auth.postLoginSMS);
    app.route('/auth/login/email/:country_ISO')
        .post(consumer.validateRegion, auth.postLoginByEmail);
    app.route('/auth/register/consumer/email/:country_ISO')
        .post(consumer.validateRegion, auth.registerConsumerByEmail);
    app.route('/auth/register/consumer/:country_ISO')
        .post(consumer.validateRegion, auth.registerConsumer);
    app.route('/auth/refresh/token')
        .post(passport.authenticateJWTRefresh, auth.refreshToken);
};