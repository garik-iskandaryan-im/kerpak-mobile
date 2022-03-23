const {
    foodProviders: FoodProviders,
} = require('app/models/models');
const log = require('app/helpers/logger');

/**
* @swagger
* '/foodProviders/sp/{id}':
*   get:
*     tags:
*       - Food providers
*     summary: Get foodProviders by sp id
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
module.exports.list = async (req, res) => {
    try {
        const spId = req.params.id;
        let payload = {
            where: { serviceProviderId: spId },
        };
        const foodProviders = await FoodProviders.findAll(payload);
        return res.json(foodProviders);
    } catch (err) {
        log.error(err, 'foodProviders::list');
        return res.status(500).json({ message: 'Error in get foodProviders list' });
    }
};