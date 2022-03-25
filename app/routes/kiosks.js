'use strict';

const kiosks = require('app/controllers/kiosks');

module.exports = (app) => {
    app.route('/mobile/kiosk/menu/:id')
        .get(kiosks.getKioskMenuById)
    app.route('/mobile/kiosk/:id/hoursOfOperations')
        .get(kiosks.getHoursOfOperations);
    app.route('/mobile/kiosk/:id/discountSchedules')
        .get(kiosks.getDiscountSchedules);
    app.route('/mobile/kiosk/:id')
        .get(kiosks.get);
    app.route('/mobile/kiosks/lat/:lat/lon/:lon')
        .get(kiosks.getWithDistances);
    app.route('/mobile/kiosks')
        .get(kiosks.getKiosksList);
    app.route('/mobile/kiosk/:id/productItems')
        .get(kiosks.getKioskProductItems);
    app.route('/mobile/kiosks/:region_code')
        .get(kiosks.getKiosksListByRegion);

};