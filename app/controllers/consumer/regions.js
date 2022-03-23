const {
    regions: Regions,
    serviceProviders: ServiceProviders
} = require('app/models/models');
const log = require('app/helpers/logger');

/**
* @swagger
* '/mobile/regions':
*   get:
*     tags:
*       - Mobile public APIs
*     summary: Get regions
*     description: ''
*     produces:
*       - application/json
*     responses:
*       '200':
*         description: Successful operation
*     security:
*      - cookieAuth: []
*/
module.exports.getRegions = async (req, res) => {
    try {
        const regions = await Regions.findAll({
            attributes: [
                'id', 'isoCode', 'image', 'initialPositionLatitude', 'initialPositionLongitude', 'initialPositionLatitudeDelta', 'initialPositionLongitudeDelta', 'currencyName', 'currencySymbol', 'currencyCode', 'language', 'weightName', 'weightSymbol', 'temperatureName', 'temperatureSymbol', 'paymentMethod', 'timezone'
            ]
        });
        return res.json(regions);
    } catch (err) {
        log.error(err, 'regions::controller::getRegions');
        return res.status(500).json({ message: 'Error to get regions' });
    }
};