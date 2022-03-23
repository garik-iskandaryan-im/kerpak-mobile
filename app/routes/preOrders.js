'use strict';

const passport = require('../middlewares/passport');
const preOrders = require('app/controllers/preOrders');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/kiosks/:kioskId/preOrders')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, preOrders.getPreOrders);
    app.route('/preOrders')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, preOrders.getPreOrdersAll);
    app.route('/preOrders/xlsx')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, preOrders.exportPreOrdersXLSX);
    app.route('/preOrders/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, preOrders.getPreOrder);
    app.route('/preOrders/:id/decline')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, preOrders.cancelPreOrder);
    app.route('/preOrders/:id/accept')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, preOrders.acceptPreOrder);
    app.route('/preOrders/:id/scan')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, preOrders.depositPreOrder);
    app.route('/preOrders/transfers/cancel')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, preOrders.removeFromTransfer);
    app.route('/transfers/:transferId/preOrders')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, preOrders.transferPreOrdersList);
    app.route('/preOrders/xlsx/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, preOrders.exportXLSXList);
    app.route('/preOrders/:id/kiosk')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, preOrders.changeKiosk);
    app.route('/serviceProviders/:spId/preOrders')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, preOrders.getSpPreOrders);
    app.route('/preOrders/:id/expectedDeliveryDate')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, preOrders.changeExpectedDeliveryDate);
};