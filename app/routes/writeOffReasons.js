'use strict';

const passport = require('../middlewares/passport');
const writeOffReasons = require('app/controllers/writeOffReasons');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/reasons/sp/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isRecorseAllowed, writeOffReasons.list);
};