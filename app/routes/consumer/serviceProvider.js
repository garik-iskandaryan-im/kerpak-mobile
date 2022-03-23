'use strict';

const serviceProviders = require('app/controllers/consumer/serviceProviders');
const passport = require('../../middlewares/passport');

module.exports = (app) => {
    app.route('/mobile/serviceProviders')
        .get(serviceProviders.list);
    app.route('/mobile/serviceProviders/kiosks/:region_code')
        .get(serviceProviders.getServiceProvidersKiosks);
};