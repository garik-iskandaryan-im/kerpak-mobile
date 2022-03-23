'use strict';

const passport = require('../middlewares/passport');
const categories = require('app/controllers/categories');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/categories/sp/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isRecorseAllowed, categories.listBySp);
    app.route('/categories')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, categories.listCategories);
};