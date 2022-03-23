'use strict';

const passport = require('../middlewares/passport');
const integrations = require('app/controllers/integrations');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/integrations')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, integrations.list);
    app.route('/integration/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, integrations.get);
    app.route('/integration')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, integrations.create);
    app.route('/integration/:id')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, integrations.update);
};