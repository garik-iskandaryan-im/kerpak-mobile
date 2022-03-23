'use strict';

const passport = require('../middlewares/passport');
const consumers = require('app/controllers/consumers');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/consumers')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, consumers.list);
    app.route('/consumers/filterForNotifications')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, consumers.filterConsumerForNotification);
    app.route('/consumers/spdata')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, consumers.listSPData);
    app.route('/consumer/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, consumers.get);
    app.route('/consumer/:id/addBalance')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, consumers.addBalance);
    app.route('/consumers/bulkAddBalance')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, consumers.bulkAddBalance);
};