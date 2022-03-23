'use strict';

const productItems = require('app/controllers/consumer/productItems');
const passport = require('../../middlewares/passport');
const consumer = require('../../middlewares/consumer');

module.exports = (app) => {
    app.route('/mobile/productItem/:spID/:EAN13/:EAN5/:kioskID')
        .get(passport.authenticateJWT, consumer.isConsumer, productItems.getStatus);
};

