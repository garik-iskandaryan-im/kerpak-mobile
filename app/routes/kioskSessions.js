'use strict';

const passport = require('../middlewares/passport');
const kioskSessions = require('app/controllers/kioskSessions');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/kioskSessions')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, kioskSessions.list);
    app.route('/kioskSession/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, kioskSessions.get);
    app.route('/kioskSession/:id/previous')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, kioskSessions.getPrevious);
    app.route('/kioskSession/:id/next')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, kioskSessions.getNext);
    app.route('/kioskSessions/consumer/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, kioskSessions.listForConsumer);
};