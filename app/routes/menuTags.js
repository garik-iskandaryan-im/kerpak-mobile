'use strict';

const passport = require('../middlewares/passport');
const menuTags = require('app/controllers/menuTags');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/menuTags')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, menuTags.list);
};