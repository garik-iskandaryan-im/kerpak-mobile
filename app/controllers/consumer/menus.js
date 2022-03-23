const {
    menus: Menus,
} = require('app/models/models');
const log = require('app/helpers/logger');

/**
 * @swagger
 * '/mobile/menu/{id}':
 *   get:
 *     tags:
 *       - Mobile public APIs
 *     summary: Get menu by id
 *     description: ''
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for menu
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.get = async (req, res) => {
    const id = req.params.id;
    const payload ={ distinct: true };
    payload.attributes = ['id', 'menuName', 'description'];

    return Menus.findOne(payload)
        .then((menu) => {
            return res.json(menu);
        })
        .catch((err) => {
            log.error(err, 'menu::controller::getMenu');
            return res.status(500).json({ message: 'Error in get menu' });
        });
};