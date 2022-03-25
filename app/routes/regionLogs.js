const regionLogs = require('app/controllers/regionLogs');

module.exports = (app) => {
    app.route('/mobile/region')
        .post(regionLogs.add);
};