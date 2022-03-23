'use strict';

const checkToken = require('app/controllers/integrations/gg/checkToken');
const passport = require('../../../middlewares/passport');

module.exports = (app) => {
    app.route('/integrations/gg/check/token')
        .get(passport.passportJWTGGService, checkToken.checkToken);
};