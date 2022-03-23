'use strict';

const passport = require('../middlewares/passport');
const notifications = require('app/controllers/notifications');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/notifications')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, notifications.list);
    app.route('/notifications/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, notifications.get);
    app.route('/notification')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, notifications.create);
};