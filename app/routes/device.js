'use strict';

const passport = require('../middlewares/passport');
const device = require('app/controllers/device');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/device/temperature')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, device.temperature);
    app.route('/device/status/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, device.status);
    app.route('/device/door')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, device.door);
    app.route('/device/status')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, device.setStatus);
    app.route('/device/opendoor/:id')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, device.openDoor);
    app.route('/device/video')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, device.getVideo);
};