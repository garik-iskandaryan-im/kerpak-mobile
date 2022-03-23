const ipInfo = require("ipinfo");
const log = require('app/helpers/logger');
const { IPINFO: { TOKEN } } = require('app/settings');

/**
 * @swagger
 * /mobile/country/iso2/:
 *   get:
 *     tags:
 *       - Mobile APIs
 *     summary: Get consumer country by ip
 *     description: ''
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 */
module.exports.getCountryByIp = async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const ipData = await ipInfo(ip, TOKEN);
        return res.json(ipData);
    } catch (err) {
        log.error(err, 'ip::controller::getCountryByIp');
        return res.status(500).json({ message: 'Error to get country ISO2 from IP' });
    }
};