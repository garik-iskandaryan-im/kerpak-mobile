'use strict';

const passport = require('../middlewares/passport');
const kiosks = require('app/controllers/kiosks');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/kiosks')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, kiosks.list);
    app.route('/kiosk/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, kiosks.get);
    app.route('/kiosk')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, kiosks.create);
    app.route('/kiosk/:id')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, kiosks.update);
    app.route('/kiosks/names')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, kiosks.getNames);
    app.route('/kiosk/:id/name')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, kiosks.getName);
    app.route('/kiosks/productItems')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, kiosks.availableItemsByKiosk);
    app.route('/serviceProviders/:spId/kiosks')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, kiosks.getKiosksBySP);
};