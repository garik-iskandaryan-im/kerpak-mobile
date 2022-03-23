'use strict';

const passport = require('../../middlewares/passport');
const menus = require('app/controllers/consumer/menus');

module.exports = (app) => {
    app.route('/mobile/menu/:id')
        .get(menus.get);
};