/**
 * @swagger
 * '/integrations/gg/check/token':
 *   get:
 *     tags:
 *       - GG
 *     summary: API to check token
 *     description: 'This API is being used for testing to make sure JWT bearer token is valid'
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '403':
 *         description: Token is not valid
 *     security:
 *       - bearerAuth: []
 */
 module.exports.checkToken = async (req, res) => {
    return res.json({success: true, messsage: 'Token is valid'});
};