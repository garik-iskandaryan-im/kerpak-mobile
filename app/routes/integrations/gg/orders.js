'use strict';

const orders = require('app/controllers/integrations/gg/orders');
const passport = require('../../../middlewares/passport');

module.exports = (app) => {
    app.route('/integrations/gg/order')
        .put(passport.passportJWTGGService, orders.pay);
};