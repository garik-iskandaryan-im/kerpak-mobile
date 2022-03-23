'use strict';

const passport = require('../middlewares/passport');
const regions = require('app/controllers/regions');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/regions')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, regions.getRegions);
    app.route('/serviceProviders/:spId/region')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, regions.getSPRegion);
};