'use strict';

const serviceProviders = require('app/controllers/integrations/coffeemania/serviceProviders');
const passport = require('../../../middlewares/passport');

module.exports = (app) => {
    app.route('/integrations/coffeemania/serviceProviders')
        .get(passport.passportJWTCoffeemaniaService, serviceProviders.list);
};