'use strict';

const passport = require('../../middlewares/passport');
const preOrders = require('app/controllers/consumer/preOrders');

module.exports = (app) => {
    app.route('/mobile/preOrders')
        .get(passport.authenticateJWT, preOrders.getPreOrdersList);
    app.route('/mobile/preOrders/:id')
        .get(passport.authenticateJWT, preOrders.getPreOrder);
    app.route('/mobile/preOrders')
        .post(passport.authenticateJWT, preOrders.create);
    app.route('/mobile/preOrders/:id/decline')
        .put(passport.authenticateJWT, preOrders.reverse);
    app.route('/mobile/preOrders/scan')
        .put(passport.authenticateJWT, preOrders.depositPreOrder);
};