'use strict';

const passport = require('../middlewares/passport');
const menus = require('app/controllers/menus');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/menus')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menus.list);
    app.route('/menus/:id/clone')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menus.clone);
    app.route('/menus/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menus.get);
    app.route('/menus')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menus.create);
    app.route('/menus/:id')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menus.update);
    app.route('/menus')
        .delete(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menus.delete);
};