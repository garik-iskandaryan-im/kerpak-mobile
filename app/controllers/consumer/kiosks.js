
const { Op } = require('sequelize');
const {
    kiosks: Kiosks,
    discountSchedules: DiscountSchedules,
    hoursOfOperations: HoursOfOperations,
    serviceProviders: ServiceProviders,
    productItems: ProductItems,
    menuItems: MenuItems,
    menus: Menus,
    dietaryMarkers: DietaryMarkers,
    nutritionFacts: NutritionFacts,
    allergens: Allergens,
    menuCategories: MenuCategories,
    menuCategoriesMenuItems: MenuCategoriesMenuItems,
    categories: Categories,
    defaultCategories: DefaultCategories,
    foodProviders: FoodProviders,
    regions: Regions,
    Sequelize
} = require('app/models/models');
const { kiosks: kioskValidator } = require('app/schemes');
const { isSchemeValid} = require('app/helpers/validate');
const { getDistanceFromLatLonInKm, getRegionConfigForMobile } = require('app/helpers/utils');
const {
    ORDER: {
        stripe: {
            TEST_PUBLISHABLE_KEY,
            PUBLISHABLE_KEY
        }
    },
    payment: { PROVIDERS }
} = require('app/settings');

const log = require('app/helpers/logger');


/**
 * @swagger
 * '/mobile/kiosk/{id}':
 *   get:
 *     tags:
 *       - Mobile public APIs
 *     summary: Get kiosk
 *     description: 'Get kiosk by id'
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for kiosk
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *           description: Get kiosk.
 */
module.exports.get = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await isSchemeValid(kioskValidator.get, { id });
        let payload = { where: { id } };
        payload.distinct = true 

        payload.attributes = ["displayName", "description", "address1", "city", "public", "hostName", 
            "hoursOfOperationsFull", "latitude", "longitude", "menuId", "image", "status", "temperature",
            "serviceProviderId", "timeBasedDiscount", "discountSchedulesFull",
            "timeDiscountAmount", "firstPurchaseDiscount", "firstPurchaseDiscountAmount", "isCoffeeMachine",
            "deliveryIsKioskAllow", "deliveryTransferTimeTo", "deliveryTransferTimeFrom", "deliveryMinAllowedTime",
            "deliveryMonday", "deliveryTuesday", "deliveryWednesday", "deliveryThursday", "deliveryFriday", "deliverySaturday", "deliverySunday",
            "deliveryDiscount", "deliveryDiscountAmount"
        ];
        payload.subQuery = false;

        payload.include = [
            { 
                model: ProductItems,
                required: false,
                attributes: ['rfId', 'status'],
                where: { status: 'available', archived: false },
                include: {
                    model: MenuItems,
                    required: true,
                    attributes: [
                        'id',
                        'name',
                        'description',
                        'barcode',
                        'image',
                        'caloriesCount',
                        'price',
                        'weight',
                        'ingredients',
                        'isGenerateUniqueEAN5',
                        'category',
                        'category1',
                        'category2',
                        'serviceProviderId',
                    ],
                    where: { archived: false },
                }
            },
            {
                // TODO: need to delete regionalSettings
                model: ServiceProviders, attributes: ['id', 'regionalSettings', 'legalName', 'brandName', 'description', 'logo', 'catalogueImage', 'isSpAllowDelivery', 'stripeId'], required: false,
                include: [ { model: Regions, attributes: ['isoCode'], required: true }]
            },
        ];
        const kiosk = await Kiosks.findOne(payload);

        if (!kiosk) {
            return res.status(404).json({ message: 'kiosk not found' });
        }

        return res.json(kiosk);
    } catch (err) {
        log.error(err, 'kiosk::getKioskList');
        return res.status(400).json({ message: 'validation error' });
    }
};

module.exports.getHoursOfOperations = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await isSchemeValid(kioskValidator.get, { id });
        let payload = { where: { id } };
        payload.distinct = true;

        payload.attributes = [
            "displayName", "description", "address1", "city", "public", "hostName",
            "hoursOfOperationsFull", "latitude", "longitude", "menuId", "image", "status", "temperature",
            "serviceProviderId", "timeBasedDiscount", "discountSchedulesFull",
            "timeDiscountAmount", "firstPurchaseDiscount", "firstPurchaseDiscountAmount",
            "hoursOfOperationsMonday", "hoursOfOperationsMondayFrom", "hoursOfOperationsMondayTo",
            "hoursOfOperationsTuesday", "hoursOfOperationsTuesdayFrom","hoursOfOperationsTuesdayTo",
            "hoursOfOperationsWednesday","hoursOfOperationsWednesdayFrom","hoursOfOperationsWednesdayTo",
            "hoursOfOperationsThursday","hoursOfOperationsThursdayFrom","hoursOfOperationsThursdayTo",
            "hoursOfOperationsFriday","hoursOfOperationsFridayFrom","hoursOfOperationsFridayTo",
            "hoursOfOperationsSaturday","hoursOfOperationsSaturdayFrom","hoursOfOperationsSaturdayTo",
            "hoursOfOperationsSunday","hoursOfOperationsSundayFrom","hoursOfOperationsSundayTo",
        ];
        payload.subQuery = false;

        // TODO need to remove
        payload.include = [
            { model: HoursOfOperations, as: 'hoursOfOperations', required: false }
        ];
        const kiosk = await Kiosks.findOne(payload);

        if (!kiosk) {
            return res.status(404).json({ message: 'kiosk not found' });
        }

        return res.json(kiosk);
    } catch (err) {
        log.error(err, 'kiosk::getHoursOfOperations');
        return res.status(400).json({ message: 'validation error' });
    }
};

module.exports.getDiscountSchedules = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await isSchemeValid(kioskValidator.get, { id });
        let payload = { where: { id } };
        payload.distinct = true;

        payload.attributes = [
            "displayName", "description", "address1", "city", "public", "hostName",
            "hoursOfOperationsFull", "latitude", "longitude", "menuId", "image", "status", "temperature",
            "serviceProviderId", "timeBasedDiscount", "discountSchedulesFull",
            "timeDiscountAmount", "firstPurchaseDiscount", "firstPurchaseDiscountAmount",
            "discountSchedulesMonday", "discountSchedulesMondayFrom", "discountSchedulesMondayTo",
            "discountSchedulesTuesday", "discountSchedulesTuesdayFrom","discountSchedulesTuesdayTo",
            "discountSchedulesWednesday","discountSchedulesWednesdayFrom","discountSchedulesWednesdayTo",
            "discountSchedulesThursday","discountSchedulesThursdayFrom","discountSchedulesThursdayTo",
            "discountSchedulesFriday","discountSchedulesFridayFrom","discountSchedulesFridayTo",
            "discountSchedulesSaturday","discountSchedulesSaturdayFrom","discountSchedulesSaturdayTo",
            "discountSchedulesSunday","discountSchedulesSundayFrom","discountSchedulesSundayTo",
        ];
        payload.subQuery = false;
        // TODO need to remove
        payload.include = [
            { model: DiscountSchedules, as: 'discountSchedules', required: false }
        ];
        const kiosk = await Kiosks.findOne(payload);

        if (!kiosk) {
            return res.status(404).json({ message: 'kiosk not found' });
        }

        return res.json(kiosk);
    } catch (err) {
        log.error(err, 'kiosk::getDiscountSchedules');
        return res.status(400).json({ message: 'validation error' });
    }
};

/**
 * @swagger
 * '/mobile/kiosk/menu/{id}':
 *   get:
 *     tags:
 *       - Mobile public APIs
 *     summary: Get kiosk's menu by id
 *     description: ''
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for Menu
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *           description: Menu item.
 */
module.exports.getKioskMenuById = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await isSchemeValid(kioskValidator.get, { id });
        let payload = { where: { id } };
        payload.distinct = true;

        payload.subQuery = false;

        payload.include = [
            { model: MenuCategories, required: false, include: [
                { model: MenuCategoriesMenuItems, required: false, include: [
                    {
                        model: MenuItems,
                        required: true,
                        attributes: ['id', 'name', 'description', 'image', 'imageMedium', 'imageSmall', 'caloriesCount', 'price', 'weight', 'ingredients', 'category', 'category1', 'category2', 'serviceProviderId', 'itemAvailability', 'barcode', 'createdAt'],
                        where: { archived: false },
                        include: [
                            { model: DietaryMarkers, attributes: ['name'], required: false },
                            { model: Allergens, attributes: ['name'], required: false },
                            { model: NutritionFacts, attributes: ['name', 'value'], required: false },
                        ]
                    },
                ]},
                { model: Categories, required: false, include: [
                    { model: DefaultCategories, required: false},
                ]},
            ]},
        ];
        const kiosk = await Menus.findOne(payload);

        if (!kiosk) {
            return res.status(404).json({ message: 'kiosk not found' });
        }

        return res.json(kiosk);
    } catch (err) {
        log.error(err, 'kiosk::getKioskMenuById');
        return res.status(400).json({ message: 'validation error' });
    }
};

/**
 * @swagger
 * '/mobile/kiosks/lat/{lat}/lon/{lon}':
 *   get:
 *     tags:
 *       - Mobile public APIs
 *     summary: Get kiosks by lat and lon
 *     description: ''
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: lat
 *         in: path
 *         description: User lat
 *         required: true
 *         type: string
 *       - name: lon
 *         in: path
 *         description: User lon
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.getWithDistances = async (req, res) => {
    const lat = req.params.lat;
    const lon = req.params.lon;
    let payload = {
        where: {
            status: 'active',
        },
        attributes: [
            'id', 'latitude', 'longitude', 'firstPurchaseDiscount', 'firstPurchaseDiscountAmount', 'timeBasedDiscount',
            'timeDiscountAmount', 'discountSchedulesFull', 'city', 'address1', 'hostName', 'serviceProviderId', 'status'
        ],
    };

    return Kiosks.findAndCountAll(payload)
        .then(({ count, rows }) => {
            let kiosks = JSON.parse(JSON.stringify(rows));
            for (let i in kiosks) {
                if (kiosks[i].latitude && kiosks[i].longitude) {
                    const distance = getDistanceFromLatLonInKm(lat, lon, kiosks[i].latitude, kiosks[i].longitude);
                    kiosks[i].distance = distance;
                } else {
                    kiosks[i].distance = null;
                }
            }
            return res.json({ count, data: kiosks });
        })
        .catch((err) => {
            log.error(err, 'kiosks::getWithDistances');
            return res.status(500).json({ message: 'Error in get Kioks list' });
        });
};

/**
 * @swagger
 * '/mobile/kiosks':
 *   get:
 *     tags:
 *       - Mobile public APIs
 *     summary: Get kiosks list
 *     description: ''
 *     responses:
 *       '200':
 *           description: A list of kiosks.
 */
module.exports.getKiosksList = async (req, res) => {
    try {
        let payload = {};
        payload.attributes = [
            'id', 'displayName', 'description', 'public', 'latitude', 'longitude', 'image', 'hoursOfOperationsFull',
            'timeBasedDiscount', 'discountSchedulesFull', 'timeDiscountAmount', 'firstPurchaseDiscount', 'firstPurchaseDiscountAmount',
            'status', 'isCoffeeMachine', 'deliveryIsKioskAllow', 'deliveryTransferTimeTo', 'deliveryTransferTimeFrom', 'deliveryMinAllowedTime',
            'deliveryMonday', 'deliveryTuesday', 'deliveryWednesday', 'deliveryThursday', 'deliveryFriday', 'deliverySaturday', 'deliverySunday',
            "hoursOfOperationsMonday", "hoursOfOperationsMondayFrom", "hoursOfOperationsMondayTo",
            "hoursOfOperationsTuesday", "hoursOfOperationsTuesdayFrom","hoursOfOperationsTuesdayTo",
            "hoursOfOperationsWednesday","hoursOfOperationsWednesdayFrom","hoursOfOperationsWednesdayTo",
            "hoursOfOperationsThursday","hoursOfOperationsThursdayFrom","hoursOfOperationsThursdayTo",
            "hoursOfOperationsFriday","hoursOfOperationsFridayFrom","hoursOfOperationsFridayTo",
            "hoursOfOperationsSaturday","hoursOfOperationsSaturdayFrom","hoursOfOperationsSaturdayTo",
            "hoursOfOperationsSunday","hoursOfOperationsSundayFrom","hoursOfOperationsSundayTo",
            "discountSchedulesMonday", "discountSchedulesMondayFrom", "discountSchedulesMondayTo",
            "discountSchedulesTuesday", "discountSchedulesTuesdayFrom","discountSchedulesTuesdayTo",
            "discountSchedulesWednesday","discountSchedulesWednesdayFrom","discountSchedulesWednesdayTo",
            "discountSchedulesThursday","discountSchedulesThursdayFrom","discountSchedulesThursdayTo",
            "discountSchedulesFriday","discountSchedulesFridayFrom","discountSchedulesFridayTo",
            "discountSchedulesSaturday","discountSchedulesSaturdayFrom","discountSchedulesSaturdayTo",
            "discountSchedulesSunday","discountSchedulesSundayFrom","discountSchedulesSundayTo",
        ];
        payload.subQuery = false;

        payload.include = [
            { model: ServiceProviders, required: false, attributes: ['logo', 'isTesting'] },
            // TODO need to remove
            { model: DiscountSchedules, as: 'discountSchedules', required: false },
            { model: HoursOfOperations, as: 'hoursOfOperations', required: false },
        ];
        payload.where = { status: { [Op.not]: 'pending' } };
        Kiosks.findAndCountAll(payload)
            .then(({ rows }) => {
                return res.json(rows);
            })
            .catch((err) => {
                log.error(err, 'kiosks::getKiosksList');
                return res.status(500).json({ message: 'Error in get kiosks list' });
            });
    } catch (err) {
        log.error(err, 'kiosks::getKiosksList::server error');
        return res.status(500).json({ message: 'Error in get kiosks list' });
    }
};

/**
 * @swagger
 * '/mobile/kiosk/{id}/productItems':
 *   get:
 *     tags:
 *       - Mobile public APIs
 *     summary: Get kiosk product items
 *     description: 'Get product items list from kiosk'
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Kiosk id
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Bad request
 *       '403':
 *         description: Forbidden
 */
module.exports.getKioskProductItems = async (req, res) => {
    try {
        const id = Number(req.params.id);
        let payload = {};
        payload.include = [{
            model: ProductItems,
            required: true,
            attributes: [],
            where: { status: 'available', archived: false, kioskId: id },
        }, {
            model: FoodProviders,
            required: false,
        }
        ];
        payload.subQuery = false;
        payload.group = [Sequelize.col('menuItems.id')];
        payload.attributes = ['barcode', 'name', 'description', 'image', 'price', [Sequelize.fn("COUNT", Sequelize.col('productItems.id')), 'productItemsCount']];
        payload.where = {
            archived: false
        };
        const productItems = await MenuItems.findAll(payload)
        return res.json(productItems);
    } catch (err) {
        log.error(err, 'kiosk::getKioskProductItems');
        return res.status(400).json({ message: 'validation error' });
    }
};

/**
 * @swagger
 * '/mobile/kiosks/{region_code}':
 *   get:
 *     tags:
 *       - Mobile public APIs
 *     summary: Get kiosks list by region
 *     description: ''
 *     parameters:
 *       - name: region_code
 *         in: path
 *         description: Region code for Service Providers
 *         required: false
 *         type: string
 *         default: 'am'
 *     responses:
 *       '200':
 *           description: A list of kiosks.
 */
module.exports.getKiosksListByRegion = async (req, res) => {
    try {
        const regionCode = req.params.region_code;

        const region = await Regions.findOne({where: {isoCode: regionCode}});
        if (!region) {
            return res.json({ kiosks: [], config: {} });
        }
        if (region.paymentMethod === PROVIDERS.STRIPE) {
            region.dataValues.publishableKey = PUBLISHABLE_KEY;
        } else if (region.paymentMethod === PROVIDERS.STRIPE_TEST) {
            region.dataValues.publishableKey = TEST_PUBLISHABLE_KEY;
        }

        let payload = {};
        payload.attributes = [
            'id', 'displayName', 'description', 'public', 'latitude', 'longitude', 'image', 'hoursOfOperationsFull',
            'timeBasedDiscount', 'discountSchedulesFull', 'timeDiscountAmount', 'firstPurchaseDiscount', 'firstPurchaseDiscountAmount',
            'status', 'isCoffeeMachine', 'deliveryIsKioskAllow', 'deliveryTransferTimeTo', 'deliveryTransferTimeFrom', 'deliveryMinAllowedTime',
            'deliveryMonday', 'deliveryTuesday', 'deliveryWednesday', 'deliveryThursday', 'deliveryFriday', 'deliverySaturday', 'deliverySunday',
            "hoursOfOperationsMonday", "hoursOfOperationsMondayFrom", "hoursOfOperationsMondayTo",
            "hoursOfOperationsTuesday", "hoursOfOperationsTuesdayFrom","hoursOfOperationsTuesdayTo",
            "hoursOfOperationsWednesday","hoursOfOperationsWednesdayFrom","hoursOfOperationsWednesdayTo",
            "hoursOfOperationsThursday","hoursOfOperationsThursdayFrom","hoursOfOperationsThursdayTo",
            "hoursOfOperationsFriday","hoursOfOperationsFridayFrom","hoursOfOperationsFridayTo",
            "hoursOfOperationsSaturday","hoursOfOperationsSaturdayFrom","hoursOfOperationsSaturdayTo",
            "hoursOfOperationsSunday","hoursOfOperationsSundayFrom","hoursOfOperationsSundayTo",
            "discountSchedulesMonday", "discountSchedulesMondayFrom", "discountSchedulesMondayTo",
            "discountSchedulesTuesday", "discountSchedulesTuesdayFrom","discountSchedulesTuesdayTo",
            "discountSchedulesWednesday","discountSchedulesWednesdayFrom","discountSchedulesWednesdayTo",
            "discountSchedulesThursday","discountSchedulesThursdayFrom","discountSchedulesThursdayTo",
            "discountSchedulesFriday","discountSchedulesFridayFrom","discountSchedulesFridayTo",
            "discountSchedulesSaturday","discountSchedulesSaturdayFrom","discountSchedulesSaturdayTo",
            "discountSchedulesSunday","discountSchedulesSundayFrom","discountSchedulesSundayTo",
        ];
        payload.subQuery = false;

        payload.include = [
            { model: ServiceProviders, where: {regionId: region.id}, required: true, attributes: ['logo', 'isTesting'] },
            // TODO need to remove
            { model: DiscountSchedules, as: 'discountSchedules', required: false },
            { model: HoursOfOperations, as: 'hoursOfOperations', required: false },
        ];
        payload.where = { status: { [Op.not]: 'pending' } };
        Kiosks.findAndCountAll(payload)
            .then(({ rows }) => {
                const result = {
                    kiosks: rows,
                    // TODO: need to delete config
                    config: getRegionConfigForMobile(region),
                    region
                };
                return res.json(result);
            })
            .catch((err) => {
                log.error(err, 'kiosks::getKiosksListByRegion');
                return res.status(500).json({ message: 'Error in get kiosks list' });
            });
    } catch (err) {
        log.error(err, 'kiosks::getKiosksListByRegion::server error');
        return res.status(500).json({ message: 'Error in get kiosks list' });
    }
};