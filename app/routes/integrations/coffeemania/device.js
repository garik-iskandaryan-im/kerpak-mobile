
'use strict';

const device = require('app/controllers/integrations/coffeemania/device');
const passport = require('../../../middlewares/passport');

module.exports = (app) => {
    app.route('/integrations/coffeemania/devices/:id/opendoor')
        .put(passport.passportJWTCoffeemaniaService, device.openDoor);
};