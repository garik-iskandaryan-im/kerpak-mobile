'use strict';

const orders = require('app/controllers/integrations/coffeemania/orders');
const passport = require('../../../middlewares/passport');

module.exports = (app) => {
    app.route('/integrations/coffeemania/order')
        .put(passport.passportJWTCoffeemaniaService, orders.pay);
};