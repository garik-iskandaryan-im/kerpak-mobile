const {
    productItems: ProductItems,
    menuItems: MenuItems,
} = require('app/models/models');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');

const { productItems: productItemsValidator } = require('app/schemes');
const { isSchemeValid } = require('app/helpers/validate');

/**
 * @swagger
 * '/mobile/productItem/{spID}/{EAN13}/{EAN5}/{kioskID}':
 *   get:
 *     tags:
 *       - Mobile APIs
 *     summary: Get product item by spID, EAN13, EAN5, kioskID
 *     description: ''
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: spID
 *         in: path
 *         description: spID
 *         required: true
 *         type: string
 *       - name: EAN13
 *         in: path
 *         description: EAN13
 *         required: true
 *         type: string
 *       - name: EAN5
 *         in: path
 *         description: EAN5
 *         required: true
 *         type: string
 *       - name: kioskID
 *         in: path
 *         description: kioskID
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
 module.exports.getStatus = async (req, res) => {
    try {
        const EAN13 = req.params.EAN13;
        const EAN5 = req.params.EAN5;
        const spID = req.params.spID;
        const kioskID = req.params.kioskID;
        try {
            await isSchemeValid(productItemsValidator.check, { spID, EAN13, EAN5 });
        } catch (err) {
            loggerValidations.error(err, 'productItems::getStatus::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        let payload = { distinct: true };
        payload.where = {
            archived: false,
            barcode: EAN13,
            serviceProviderId: spID,
        };
        payload.attributes = ['id', 'barcode', 'image', 'name', 'price', 'description', 'ingredients', 'weight', 'caloriesCount'];
        const menuItem = await MenuItems.findOne(payload);
        if (!menuItem) {
            return res.status(409).json({ status: 'not found', message: 'Cataloge is not found' });
        }
        payload.where = {
            archived: false,
            menuItemId: menuItem.id,
            serviceProviderId: spID,
            EAN5: EAN5,
            kioskId: kioskID
        };
        payload.attributes = ['id', 'expirationDate', 'status'];
        const productItems = await ProductItems.findOne(payload);
        if (!productItems) {
            return res.status(409).json({ status: 'not found', message: 'Product is not found' });
        }

        if (productItems.expirationDate < new Date()) {
            return res.status(409).json({ status: 'expaired', message: 'Product is expaired' });
        }

        if (productItems.status === 'written-off') {
            return res.status(409).json({status: 'written-off', message: 'productIem is written-off'});
        }

        return res.json({ status: 'available', data: {
            id: menuItem.id,
            barcode: menuItem.barcode,
            image: menuItem.image,
            name: menuItem.name,
            price: menuItem.price,
            description: menuItem.description,
            ingredients: menuItem.ingredients,
            weight: menuItem.weight,
            caloriesCount: menuItem.caloriesCount
        }});
    } catch (err) {
        log.error(err, 'productItems::getStatus::server error');
        return res.status(500).json({ message: 'server error' });
    }
};