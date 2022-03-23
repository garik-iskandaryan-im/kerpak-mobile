'use strict';

const passport = require('../middlewares/passport');
const transactions = require('app/controllers/transactions');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/transactions')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, transactions.list);
    app.route('/transaction/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, transactions.get);
};