'use strict';

const passport = require('../middlewares/passport');
const itemTransfers = require('app/controllers/itemTransfers');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/itemTransfers')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemTransfers.list);
    app.route('/itemTransfer/kiosks/:id/menuItems')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemTransfers.getMenuItems);
    app.route('/itemTransfer/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemTransfers.get);
    app.route('/itemTransfer/group')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemTransfers.createTransferGroup);
    app.route('/itemTransfer')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemTransfers.create);
    app.route('/itemTransfer/byProducts')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemTransfers.createItemTransferByProducts);
    app.route('/itemTransfer/xlsx/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemTransfers.exportXLSX);
    app.route('/itemTransfers/xlsx')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemTransfers.exportAllDataXLSX);
    app.route('/itemTransfer/:id/transferItems')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemTransfers.transferItemsList);
    app.route('/itemTransfer/changeTransferItemsStatus')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemTransfers.changeItemsStatus);
    app.route('/itemTransfers/labels')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemTransfers.getLabelsForSelectedGroupInTransfer);
    app.route('/itemTransfer/changeTransferItemsStatusForGroup')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, itemTransfers.changeTransferItemsStatusForGroup);
};