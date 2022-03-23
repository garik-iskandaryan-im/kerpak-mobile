'use strict';

const passport = require('../middlewares/passport');
const organizations = require('app/controllers/organizations');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/organizations')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, organizations.getGroups);
    app.route('/organizations')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, organizations.addGroupOrMembers);
    app.route('/organizations/:organizationId/consumers/:consumerId')
        .delete(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, organizations.deleteGroupMember);
};