const {
    writeOffReasons: WriteOffReasons
} = require('app/models/models');
const log = require('app/helpers/logger');

/**
 * @swagger
 * '/reasons/sp/{id}':
 *   get:
 *     tags:
 *       - reasons
 *     summary: Get SP reasons
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
 */
module.exports.list = async (req, res) => {
    const spId = req.params.id;
    let payload = {
        where: {serviceProviderId: spId},
    };

    WriteOffReasons.findAll(payload)
        .then((rows) => {
            return res.json(rows);
        })
        .catch((err) => {
            log.error(err, 'reasons::controller::list');
            return res.status(500).json({ message: 'Error in get reasons list' });
        });
};
