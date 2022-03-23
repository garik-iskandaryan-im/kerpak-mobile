'use strict';

const passport = require('../../middlewares/passport');
const consumers = require('app/controllers/consumer/consumers');
const consumer = require('../../middlewares/consumer');

module.exports = (app) => {
    app.route('/mobile/consumer/:id/balance/history')
        .get(passport.authenticateJWT, consumer.isActionAllowed, consumers.getBalanceHistory);
    app.route('/mobile/consumer/:id/balance')
        .get(passport.authenticateJWT, consumer.isActionAllowed, consumers.getBalance);
    app.route('/mobile/consumer/:id')
        .get(passport.authenticateJWT, consumer.isActionAllowed, consumers.get);
    app.route('/mobile/consumer/:id')
        .put(passport.authenticateJWT, consumer.isActionAllowed, consumers.update);
};