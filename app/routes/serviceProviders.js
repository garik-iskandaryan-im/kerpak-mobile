'use strict';

const passport = require('../middlewares/passport');
const serviceProviders = require('app/controllers/serviceProviders');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/serviceProviders/names')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, serviceProviders.getNames);
    app.route('/serviceProviders')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, serviceProviders.list);
    app.route('/serviceProvider/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isRecorseAllowed, serviceProviders.get);
    app.route('/serviceProviders/:id/stripe/loginLink')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUserOrOwner, serviceProviders.getStripeLoginLink);
    app.route('/serviceProvider')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, serviceProviders.create);
    app.route('/serviceProvider/:id')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isRecorseAllowed, serviceProviders.update);
};