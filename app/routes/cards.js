'use strict';

const cards = require('app/controllers/cards');
const passport = require('../middlewares/passport');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/card/paymentResult').get(cards.paymentResult);
    app.route('/card/consumer/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, cards.list);
};