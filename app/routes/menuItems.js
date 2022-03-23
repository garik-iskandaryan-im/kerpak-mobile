'use strict';

const passport = require('../middlewares/passport');
const menuItems = require('app/controllers/menuItems');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/menuItems')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuItems.list);
    app.route('/menuItem/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuItems.get);
    app.route('/menuItem')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuItems.create);
    app.route('/menuItem/:id')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuItems.update);
    app.route('/menuItems')
        .delete(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuItems.delete);
    app.route('/menuItem/sp/:id/import')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuItems.importCSV);
    app.route('/menuItem/:id/name')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuItems.getName);
    app.route('/menuItems/count')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuItems.getCatalogCount);
    app.route('/menuItems/download/csv/example')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuItems.getCSV);
    app.route('/menuItems/restore')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuItems.restore);
    app.route('/menuItems/archive')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuItems.archive);
    app.route('/menuItems/xlsx')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuItems.exportXLSX);
    app.route('/menuItems/csv')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuItems.exportCSV);
};
