
'use strict';

const device = require('app/controllers/integrations/gg/device');
const passport = require('../../../middlewares/passport');

module.exports = (app) => {
    app.route('/integrations/gg/devices/:id/opendoor')
        .put(passport.passportJWTGGService, device.openDoor);
};