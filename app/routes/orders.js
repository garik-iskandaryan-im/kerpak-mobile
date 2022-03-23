'use strict';

const passport = require('../middlewares/passport');
const orders = require('app/controllers/orders');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/orders')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, orders.list);
    app.route('/order/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, orders.get);
    app.route('/order/:id/consumer/:consumerId')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, orders.rePay);
    app.route('/ordersForSales/xlsx')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, orders.exportOrdersForSalesXLSX);
    app.route('/orders/xlsx')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, orders.exportOrdersXLSX);
    app.route('/ordersForSales')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, orders.listForSales);
    app.route('/order/pay')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, orders.pay);
    app.route('/order/:id/refund')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, orders.refund);
    app.route('/order/:id/status')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, orders.status);
    app.route('/order/:id/cancel')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, orders.cancel);
    app.route('/order/:id/refund')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, orders.getRefundHistory);
};