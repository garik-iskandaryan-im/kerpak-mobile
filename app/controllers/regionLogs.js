const {
    regionLogs: RegionLogs,
} = require('app/models/models');
const log = require('app/helpers/logger');

/**
 * @swagger
 * /mobile/region:
 *   post:
 *     tags:
 *       - Public - Regions
 *     summary: Add region
 *     description: 'This API for testing'
*     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               countryCode:
 *                 type: string
 *               extraData:
 *                 type: string
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.add = async (req, res) => {
    try {
        const payload = { ...req.body };
        await RegionLogs.create(payload);
        return res.status(200).json({ success: true });
    } catch (err) {
        log.error(err, 'region::controller::add');
        return res.status(500).json({ message: 'Error in add log' });
    }
};