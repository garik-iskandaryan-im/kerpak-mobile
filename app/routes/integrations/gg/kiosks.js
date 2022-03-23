'use strict';

const kiosks = require('app/controllers/integrations/gg/kiosks');
const passport = require('../../../middlewares/passport');

module.exports = (app) => {
    app.route('/integrations/gg/kiosks/:id/productItems')
        .get(passport.passportJWTGGService, kiosks.getKioskProductItems);
    app.route('/integrations/gg/kiosks/:id')
        .get(passport.passportJWTGGService, kiosks.getKiosk);
};