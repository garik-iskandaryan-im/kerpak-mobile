'use strict';

const cards = require('app/controllers/cards');
const passport = require('../middlewares/passport');
const consumer = require('../middlewares/consumer');

module.exports = (app) => {
    app.route('/mobile/consumer/:id/cards')
        .get(passport.authenticateJWT, consumer.isActionAllowed, cards.list);
    app.route('/mobile/consumer/:id/addCard')
        .post(passport.authenticateJWT, consumer.isActionAllowed, cards.add);
    app.route('/mobile/consumer/:id/card/type/:type')
        .post(passport.authenticateJWT, consumer.isActionAllowed, cards.addCardByType);
    app.route('/mobile/consumer/:id/card/:cardId')
        .post(passport.authenticateJWT, consumer.isActionAllowed, cards.setDefault);
    app.route('/mobile/consumer/:id/card/:cardId')
        .delete(passport.authenticateJWT, consumer.isActionAllowed, cards.delete);
    app.route('/mobile/stripe/customer/:id/confirm/paymentIntent/:setupIntentId')
        .post(passport.authenticateJWT, consumer.isConsumer, cards.stripePaymentResult);
};