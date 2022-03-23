
const {
    serviceProviders: ServiceProviders,
    kiosks: Kiosks,
    regions: Regions
} = require('app/models/models');
const log = require('app/helpers/logger');

/**
 * @swagger
 * '/integrations/coffeemania/serviceProviders':
 *   get:
 *     tags:
 *       - Coffeemania
 *     summary: Get service providers
 *     description: 'Возвращает список Сервисных Парнтеров (serviceProviders). <br /> В данном случае будут один объект - партнерский аккаунт Кофемании.<br /><br />Содержит список киосков с локациями (координаты широта/долгота) для отображения на карте.'
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '403':
 *         description: Token is not valid
 *     security:
 *       - bearerAuth: []
 */
module.exports.list = async (req, res) => {
    try {
        let payload = { distinct: true, where: { isCoffeemania: true } };
        payload.include = [
            {
                model: Kiosks,
                attributes: [
                    'id', 'latitude', 'longitude', 'firstPurchaseDiscount', 'firstPurchaseDiscountAmount', 'timeBasedDiscount',
                    'timeDiscountAmount', 'discountSchedulesFull', 'city', 'address1', 'hostName', 'serviceProviderId', 'status'
                ],
                required: false,
            },
            { model: Regions, attributes: ['isoCode'] ,required: true }
        ];
        payload.subQuery = false;
        // TODO: need to delete regionalSettings
        payload.attributes = ['id', 'brandName', 'regionalSettings', 'logo', 'isTesting'];
        const rows = await ServiceProviders.findAll(payload);
        return res.json(rows);
    } catch (err) {
        log.error(err, 'serviceProvider::controller::getServiceProviders');
        return res.status(500).json({ message: 'Error in get service provider list' });
    }
};