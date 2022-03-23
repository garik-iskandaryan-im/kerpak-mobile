'use strict';

const regions = require('app/controllers/consumer/regions');

module.exports = (app) => {
    app.route('/mobile/regions')
        .get(regions.getRegions);
};