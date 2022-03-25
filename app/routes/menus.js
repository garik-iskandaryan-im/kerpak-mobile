'use strict';

const menus = require('app/controllers/menus');

module.exports = (app) => {
    app.route('/mobile/menu/:id')
        .get(menus.get);
};