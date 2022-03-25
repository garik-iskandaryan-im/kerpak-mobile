
const {
    serviceProviders: ServiceProviders,
    kiosks: Kiosks,
    regions: Regions
} = require('app/models/models');
const log = require('app/helpers/logger');
const {
    ORDER: {
        stripe: {
            TEST_PUBLISHABLE_KEY,
            PUBLISHABLE_KEY
        }
    },
    payment: { PROVIDERS }
} = require('app/settings');
const { getRegionConfigForMobile } = require('app/helpers/utils')

/**
 * @swagger
 * '/mobile/serviceProviders/':
 *   get:
 *     tags:
 *       - Public - Service providers
 *     summary: Get service providers
 *     description: ''
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.list = async (req, res) => {
    try {
        let payload = { distinct: true };

        payload.include = [
            {
                model: Kiosks,
                attributes: [
                    'id', 'latitude', 'longitude', 'firstPurchaseDiscount', 'firstPurchaseDiscountAmount', 'timeBasedDiscount',
                    'timeDiscountAmount', 'discountSchedulesFull', 'city', 'address1', 'hostName', 'serviceProviderId', 'status'
                ],
                required: false,
            },
            { model: Regions, attributes: ['isoCode'], required: true }
        ];
        payload.subQuery = false;
        // TODO: need to delete regionalSettings
        payload.attributes = ['id', 'brandName', 'regionalSettings', 'logo', 'isTesting'];
        const serviceProviders = await ServiceProviders.findAll(payload);
        return res.json(serviceProviders);
    } catch (err) {
        log.error(err, 'serviceProvider::controller::getServiceProviders');
        return res.status(500).json({ message: 'Error in get service provider list' });
    }
};

/**
 * @swagger
 * /mobile/serviceProviders/kiosks/{region_code}:
 *   get:
 *     tags:
 *       - Public - Service providers
 *     summary: Get service providers in country
 *     description: ''
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: region_code
 *         in: path
 *         description: Region code for Service Providers
 *         required: false
 *         type: string
 *         default: 'am'
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.getServiceProvidersKiosks = async (req, res) => {
    try {
        let payload = {};
        const regionCode = req.params.region_code;
        const region = await Regions.findOne({ where: { isoCode: regionCode } });
        if (!region) {
            return res.json({ serviceProviders: [], config: {} });
        }
        if (region.paymentMethod === PROVIDERS.STRIPE) {
            region.dataValues.publishableKey = PUBLISHABLE_KEY;
        } else if (region.paymentMethod === PROVIDERS.STRIPE_TEST) {
            region.dataValues.publishableKey = TEST_PUBLISHABLE_KEY;
        }
        // TODO: need to delete regionalSettings
        payload.attributes = ['id', 'brandName', 'regionalSettings', 'logo', 'isTesting'];
        payload.where = { regionId: region.id };
        payload.include = [
            {
                model: Kiosks,
                attributes: [
                    'id', 'latitude', 'longitude', 'firstPurchaseDiscount', 'firstPurchaseDiscountAmount', 'timeBasedDiscount',
                    'timeDiscountAmount', 'discountSchedulesFull', 'city', 'address1', 'hostName', 'serviceProviderId', 'status'
                ],
                required: false,
            },
            { model: Regions, attributes: ['isoCode'], required: true }
        ];
        const serviceProviders = await ServiceProviders.findAll(payload);
        return res.json({
            serviceProviders,
            // TODO: need to delete config
            config: getRegionConfigForMobile(region),
            region
        });
    } catch (err) {
        log.error(err, 'serviceProvider::controller::getServiceProvidersKiosks');
        return res.status(500).json({ message: 'Error in get service providers list together with kiosks' });
    }
};