const {
    defaultCategories: DefaultCategories,
} = require('app/models/models');
const log = require('app/helpers/logger');

/**
 * @swagger
 * '/defaultCategories':
 *   get:
 *     tags:
 *       - Default categories
 *     summary: Get default categories
 *     description: ''
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
 module.exports.list = async (req, res) => {
    try {
        const defaultCategories = await DefaultCategories.findAll()
        return res.json(defaultCategories);
    } catch (err) {
        log.error(err, 'default categories::controller::list');
        return res.status(500).json({ message: 'Error in get default categories list' });
    }
};
