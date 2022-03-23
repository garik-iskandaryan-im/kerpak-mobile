'use strict';

const serviceProviders = require('app/controllers/integrations/gg/serviceProviders');
const passport = require('../../../middlewares/passport');

module.exports = (app) => {
    app.route('/integrations/gg/serviceProviders')
        .get(passport.passportJWTGGService, serviceProviders.list);
};