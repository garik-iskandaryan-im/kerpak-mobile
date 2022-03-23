const regionLogs = require('app/controllers/consumer/regionLogs');

module.exports = (app) => {
    app.route('/mobile/region')
        .post(regionLogs.add)
}