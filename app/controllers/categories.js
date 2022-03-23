const {
    categories: Categories,
    defaultCategories: DefaultCategories,
} = require('app/models/models');
const log = require('app/helpers/logger');
const { getListPayload } = require('./common');

/**
 * @swagger
 * '/categories/sp/{id}':
 *   get:
 *     tags:
 *       - Categories
 *     summary: Get service provider categories
 *     description: ''
 *     parameters:
 *       - name: id
 *         in: path
 *         description: SP ID
 *         required: true
 *         type: string
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.listBySp = async (req, res) => {
    try {
        const spId = req.params.id;
        let payload = {
            where: { serviceProviderId: spId },
            include: [
                { model: DefaultCategories, required: false }
            ]
        };

        const categories = await Categories.findAll(payload)
        return res.json(categories);
    } catch (err) {
        log.error(err, 'categories::listBySp::server error');
        return res.status(500).json({ message: 'Error in get categories list' });
    }
};

/**
 * @swagger
 * '/categories':
 *   get:
 *     tags:
 *       - Categories
 *     summary: Get all categories
 *     description: ''
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.listCategories = async (req, res) => {
    try {
        let payload = getListPayload(req);

        if (!req.user.isKerpakOperator && payload.where.serviceProviderId !== req.user.serviceProviderId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        payload.include = [
            { model: DefaultCategories, required: false }
        ];

        const categories = await Categories.findAll(payload)
        return res.json(categories);
    } catch (err) {
        log.error(err, 'categories::listCategories::server error');
        return res.status(500).json({ message: 'Error in get categories list' });
    }
};
