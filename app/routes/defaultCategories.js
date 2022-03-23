'use strict';

const passport = require('../middlewares/passport');
const defaultCategories = require('app/controllers/defaultCategories');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/defaultCategories')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, defaultCategories.list);
};