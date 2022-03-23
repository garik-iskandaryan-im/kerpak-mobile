const passport = require('../middlewares/passport');
const warehouses = require('app/controllers/warehouses');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/warehouses')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, warehouses.list);
    app.route('/warehouses/names')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, warehouses.getNames);
    app.route('/warehouse/:id/productItems')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, warehouses.productItemsList);
    app.route('/warehouse/:warehouseId/productItem/:menuItemId')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, warehouses.productItemDetailList);
    app.route('/warehouse/:id')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, warehouses.get);
    app.route('/warehouse')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, warehouses.create);
    app.route('/warehouse/:id')
        .put(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, warehouses.update);
    app.route('/warehouse/labels')
        .post(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, warehouses.createPDF);
    app.route('/warehouse/:id/labels/pdf/name/:name')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, warehouses.getPDF);
    app.route('/warehouse/:id/name')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, warehouses.getName);
    app.route('/warehouse/:id/productItems/xlsx')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, warehouses.productItemsListExport);
};