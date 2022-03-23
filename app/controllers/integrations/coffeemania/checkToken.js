/**
 * @swagger
 * '/integrations/coffeemania/check/token':
 *   get:
 *     tags:
 *       - Coffeemania
 *     summary: API to check token
 *     description: 'JWT/Bearer token для проверки интеграции. Если в ответ возвращает { success: true, message: "Token is valid" } значит все работает корректно.'
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