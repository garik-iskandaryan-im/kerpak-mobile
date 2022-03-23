'use strict';

const passport = require('../middlewares/passport');
const users = require('app/controllers/users');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/users')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, users.getUsers);
    app.route('/user/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, users.getUser);
    app.route('/user/check/token/:token')
        .get(users.checkResetToken);
    app.route('/user/password/reset')
        .put(users.changePasswordByToken);
    app.route('/user/password/reset')
        .post(users.sendResetEmail);
    app.route('/user/password/change')
        .put(users.changePassword);
    app.route('/user/invite')
        .post(passport.authenticateJWTFromCookie, kerpakUser.hasUserManagePermission, users.inviteUser);
    app.route('/user')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, users.create);
    app.route('/user/:id/password')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isOwner, users.changeUserPassword);
    app.route('/user/:id')
        .put(passport.authenticateJWTFromCookie, kerpakUser.hasUserManagePermission, users.updateUser);
};