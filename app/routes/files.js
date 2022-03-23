'use strict';

const passport = require('../middlewares/passport');
const files = require('app/controllers/files');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/fileupload')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, files.create);
};