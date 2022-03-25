'use strict';

const regions = require('app/controllers/regions');

module.exports = (app) => {
    app.route('/mobile/regions')
        .get(regions.getRegions);
};