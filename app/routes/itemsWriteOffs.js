'use strict';

const passport = require('../middlewares/passport');
const itemsWriteOffs = require('app/controllers/itemsWriteOffs');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/itemsWriteOffs')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemsWriteOffs.list);
    app.route('/itemsWriteOff/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemsWriteOffs.get);
    app.route('/itemsWriteOff/group')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemsWriteOffs.createWriteOffForGroups);
    app.route('/itemsWriteOff')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemsWriteOffs.create);
    app.route('/itemWriteOffs/xlsx/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemsWriteOffs.exportXLSX);
    app.route('/itemWriteOffs/xlsx')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemsWriteOffs.exportXLSXList);
};