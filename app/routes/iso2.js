const iso2 = require('app/controllers/iso2');

module.exports = (app) => {
    app.route('/mobile/country/iso2/')
        .get(iso2.getCountryByIp);
};