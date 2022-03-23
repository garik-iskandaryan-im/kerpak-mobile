const {
    menuTags: MenuTags
} = require('app/models/models');
const log = require('app/helpers/logger');

/**
 * @swagger
 * '/menuTags':
 *   get:
 *     tags:
 *       - Menu tags
 *     summary: Get menu tags
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
    MenuTags.findAll()
        .then((rows) => {
            return res.json(rows);
        })
        .catch((err) => {
            log.error(err, 'tags::controller::list');
            return res.status(500).json({ message: 'Error in get tags list' });
        });
};