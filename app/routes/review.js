'use strict';

const passport = require('../middlewares/passport');
const review = require('app/controllers/review');
const consumer = require('../middlewares/consumer');

module.exports = (app) => {
    app.route('/mobile/review')
        .post(passport.authenticateJWT, consumer.isConsumer, review.create);
};