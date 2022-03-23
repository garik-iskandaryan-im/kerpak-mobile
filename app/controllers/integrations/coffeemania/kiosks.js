
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
    Sequelize
} = require('app/models/models');
const { kiosks: kioskValidator } = require('app/schemes');
const { isSchemeValid} = require('app/helpers/validate');
const { getDistanceFromLatLonInKm } = require('app/helpers/utils');

const log = require('app/helpers/logger');

/**
 * @swagger
 * '/integrations/coffeemania/kiosks/{id}':
 *   get:
 *     tags:
 *       - Coffeemania
 *     summary: Get kiosk data
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for kiosk
 *         required: true
 *         type: string
 *     description: 'Содержит информацию о графике работы киоска и графике скидок.'
 *     responses:
 *       '200':
 *         description: Kiosk data.
 *       '400': 
 *         description: Validation error
 *       '403':
 *         description: Token is not valid
 *     security:
 *       - bearerAuth: []
 */
 module.exports.getKiosk = async (req, res) => {
    try {
        const id = Number(req.params.id);
        console.log(id)
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
            { model: DiscountSchedules, as: 'discountSchedules', required: false },
            { model: HoursOfOperations, as: 'hoursOfOperations', required: false }
        ];
        const kiosk = await Kiosks.findOne(payload);

        if (!kiosk) {
            return res.status(404).json({ message: 'kiosk not found' });
        }

        return res.json(kiosk);
    } catch (err) {
        log.error(err, 'kiosk::controller::getKiosk');
        return res.status(400).json({ message: 'validation error' });
    }
};

/**
 * @swagger
 * '/integrations/coffeemania/kiosks/{id}/productItems':
 *   get:
 *     tags:
 *       - Coffeemania
 *     summary: Get Kiosk
 *     description: 'Содержит информацию о товаре:<br /><ul><li>Наименование</li><li>Цена</li><li>Изображение</li><li>Количество товаров в наличии (так же используется для ограничения попыток сканирований штрих-кодов товаров покупателем)</li></ul>'
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for kiosk
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: A list of pets.
 *       '400': 
 *         description: Validation error
 *       '403':
 *         description: Token is not valid
 *     security:
 *       - bearerAuth: []
 */
module.exports.getKioskProductItems = async (req, res) => {
    try {
        const id = Number(req.params.id);
        let payload = {};
        payload.include = [{
                model: ProductItems,
                required: true,
                attributes: [],
                where: { status: 'available', archived: false, kioskId: id  },
            },  {
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
        console.log('err'. err)
        log.error(err, 'kiosk::getKioskProductItems');
        return res.status(400).json({ message: 'validation error' });
    }
};