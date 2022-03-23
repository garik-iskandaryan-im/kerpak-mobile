'use strict';

const checkToken = require('app/controllers/integrations/coffeemania/checkToken');
const passport = require('../../../middlewares/passport');

module.exports = (app) => {
    app.route('/integrations/coffeemania/check/token')
        .get(passport.passportJWTCoffeemaniaService, checkToken.checkToken);
};