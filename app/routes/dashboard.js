'use strict';

const passport = require('../middlewares/passport');
const dashboard = require('app/controllers/dashboard');
const kerpakUser = require('../middlewares/kerpakUser');

module.exports = (app) => {
    app.route('/dashboard/bestSellers')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, dashboard.getBestSellers);
    app.route('/dashboard/topKiosks')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, dashboard.getTopKiosks);
    app.route('/dashboard/ordersForSales')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, dashboard.salesDashboard);
    app.route('/dashboard/ordersTotal')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, dashboard.transactionsDashboard);
    app.route('/dashboard/salesByCategory')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, dashboard.getSalesByCategory);
    app.route('/dashboard/logs')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isKerpakUser, dashboard.getLogs);
    app.route('/dashboard/kiosksVitals')
        .get(passport.authenticateJWTFromCookie, kerpakUser.isAuthValid, dashboard.getKiosksVitals);
};
