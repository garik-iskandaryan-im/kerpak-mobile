'use strict';

const passport = require('../middlewares/passport');
const reviews = require('app/controllers/reviews');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/reviews')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, reviews.list);
    app.route('/reviews/consumer/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, reviews.listForConsumer);
    app.route('/reviews/xlsx')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, reviews.exportAllDataXLSX);
};