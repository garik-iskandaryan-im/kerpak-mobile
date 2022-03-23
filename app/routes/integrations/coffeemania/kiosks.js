'use strict';

const kiosks = require('app/controllers/integrations/coffeemania/kiosks');
const passport = require('../../../middlewares/passport');

module.exports = (app) => {
    app.route('/integrations/coffeemania/kiosks/:id/productItems')
        .get(passport.passportJWTCoffeemaniaService, kiosks.getKioskProductItems);
    app.route('/integrations/coffeemania/kiosks/:id')
        .get(passport.passportJWTCoffeemaniaService, kiosks.getKiosk);
};