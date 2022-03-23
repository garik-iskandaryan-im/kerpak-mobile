'use strict';

const passport = require('../middlewares/passport');

const productItems = require('app/controllers/productItems');
const menuItems = require('app/controllers/menuItems');
const kiosks = require('app/controllers/kiosks');

const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/productItems')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, productItems.list);
    app.route('/productItem/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, productItems.get);
    app.route('/productItem')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, productItems.create);
    app.route('/productItems')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, productItems.createMany);
    app.route('/productItem/:id')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, productItems.update);
    app.route('/productItems/kiosks/names')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, productItems.getNamesBySelectedItems);
    app.route('/productItems/kiosk/:kioskId')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, productItems.listByKiosk);
    app.route('/kiosk/:id/productItems')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, productItems.productItemsListByKiosk);
    app.route('/kiosk/:kioskId/productItem/:menuItemId')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, productItems.productItemDetailList);
    app.route('/productItems/kiosk/:id/xlsx')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, productItems.productItemsExportXLSX);
    app.route('/productItems/createMany')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, productItems.createManyDifferentItems);
};