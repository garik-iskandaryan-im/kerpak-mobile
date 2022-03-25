'use strict';

const passport = require('../middlewares/passport');
const orders = require('app/controllers/orders');
const consumer = require('../middlewares/consumer');

module.exports = (app) => {
    app.route('/mobile/orders/consumerId/:id')
        .get(passport.authenticateJWT, consumer.isActionAllowed, orders.list);
    app.route('/mobile/order/:orderId/consumerId/:id')
        .get(passport.authenticateJWT, consumer.isActionAllowed, orders.getOrder);
    app.route('/mobile/order/:orderId/consumerId/:id')
        .put(passport.authenticateJWT, consumer.isActionAllowed, orders.rePay);
    app.route('/mobile/v2/order')
        .post(passport.authenticateJWT, orders.create);
    app.route('/mobile/v2/order')
        .put(passport.authenticateJWT, orders.pay);
    app.route('/mobile/order/register')
        .put(passport.authenticateJWT, orders.register);
    app.route('/mobile/orders/:orderId/consumers/:id/confirm')
        .put(passport.authenticateJWT, consumer.isActionAllowed, orders.confirmOrder);
    app.route('/mobile/v2/coffeemachine/order')
        .put(passport.authenticateJWT, orders.payCoffeemachineOrder);
    app.route('/mobile/orders/:id/status')
        .put(passport.authenticateJWT, orders.status);
};