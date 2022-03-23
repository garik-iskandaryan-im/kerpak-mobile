const {
    regions: Regions,
    serviceProviders: ServiceProviders
} = require('app/models/models');
const log = require('app/helpers/logger');

/**
* @swagger
* '/regions':
*   get:
*     tags:
*       - Regions
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
                'id', 'isoCode', 'isDefault', 'currencyName', 'currencySymbol', 'weightName', 'weightSymbol',
                'temperatureName', 'temperatureSymbol', 'timezone', 'image'
            ]
        });
        return res.json(regions);
    } catch (err) {
        log.error(err, 'regions::controller::getRegions');
        return res.status(500).json({ message: 'Error to get regions' });
    }
};

/**
* @swagger
* '/serviceProviders/{spId}/region':
*   get:
*     tags:
*       - Regions
*     summary: Get sp region
*     description: ''
*     parameters:
*      - in: path
*        name: serviceProviderID
*        description: Service provider ID
*        required: true
*        type: number
*     produces:
*       - application/json
*     responses:
*       '200':
*         description: Successful operation
*     security:
*      - cookieAuth: []
*/
module.exports.getSPRegion = async (req, res) => {
    try {
        const sp = await ServiceProviders.findOne({ where: {id: req.params.spId}, include: [{model: Regions, attributes: ['id', 'isoCode', 'currencyName', 'currencySymbol', 'timezone', 'image', 'isDefault'], required: true}], attributes: ['id'] });
        return res.json(sp);
    } catch (err) {
        log.error(err, 'regions::controller::getSPRegion');
        return res.status(500).json({ message: 'Error to get SP region' });
    }
};