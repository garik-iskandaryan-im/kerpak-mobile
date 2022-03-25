'use strict';

const passport = require('../middlewares/passport');
const device = require('app/controllers/device');

module.exports = (app) => {
    app.route('/mobile/device/opendoor/:id')
        .put(passport.authenticateJWT, device.openDoor);
};