'use strict';

const passport = require('../middlewares/passport');
const foodProviders = require('app/controllers/foodProviders');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/foodProviders/sp/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isRecorseAllowed, foodProviders.list);
};