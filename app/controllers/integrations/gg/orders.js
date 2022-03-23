const {
    kiosks: Kiosks,
    consumers: Consumers,
    serviceProviders: ServiceProviders,
    discountSchedules: DiscountSchedules,
    hoursOfOperations: HoursOfOperations,
} = require('app/models/models');
const { orders: ordersValidator } = require('app/schemes/integrations/gg');
const { isSchemeValid } = require('app/helpers/validate');
const {
    calculateTotalPrice,
    updateSession,
    createOrder,
    addBalanceHistory,
    handleSuccessOrder,
} = require('app/services/order');
const log = require('app/helpers/logger');

/**
 * @swagger
 * /integrations/gg/order:
 *   put:
 *     tags:
 *       - GG
 *     summary: Pay order
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               kioskId:
 *                 type: number
 *               sessionId:
 *                 type: number
 *               useBalance:
 *                 type: boolean
 *                 default: false
 *               total:
 *                 type: number
 *               productItems:
 *                 type: array
 *                 items:
 *                    type: object
 *                    properties:
 *                      barcode:
 *                        type: string
 *                      EAN5:
 *                        type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '403':
 *         description: Token is not valid
 *       '404': 
 *         description: Validation error
 *     security:
 *       - bearerAuth: []
 */
module.exports.pay = async (req, res) => {
    try {
        const payload = { ...req.body };
        const params = await isSchemeValid(ordersValidator.pay, payload);
        const kiosk = await Kiosks.findOne(
            {
                where: { id: params.kioskId },
                include: [
                    { model: ServiceProviders, required: false, attributes: ['timezone'] },
                    // TODO need to delete
                    { model: DiscountSchedules, as: 'discountSchedules', required: false },
                    { model: HoursOfOperations, as: 'hoursOfOperations', required: false }
                ]
            });
        const serviceProviderId = kiosk.serviceProviderId;
        const serviceProvider = await ServiceProviders.findOne({ where: { id: serviceProviderId } });
        if (!serviceProvider.isGg) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const { id: consumerId, balance, phone } = await Consumers.findOne({ where: { phone: params.phone } });

        const totalSumObj = await calculateTotalPrice(consumerId, params.productItems, kiosk);
        if (totalSumObj.success === false) {
            return res.status(404).json({ totalSumObj });
        }

        const { totalSum, productItemsArray } = totalSumObj;
        if (payload.total !== totalSum) {
            log.error('order::controller::pay::provided sum is different from expected one.');
            return res.status(403).json({ message: 'Forbidden. Provided sum is different from expected one.' });
        }
        const { useBalance } = payload;
        if (useBalance) {
            if (balance <= 0) {
                return res.status(404).json({ error: 'You have not positive balance', success: false });
            } else if (totalSum <= balance) {
                const order = await createOrder(serviceProvider, totalSumObj, consumerId, kiosk, null, productItemsArray, params.sessionId, true, 'gg');
                if (params.sessionId) {
                    await updateSession(order.orderId, params.sessionId);
                }
                await addBalanceHistory(order.orderDate, consumerId, phone, balance, totalSum, order.orderId);
                await handleSuccessOrder(order.orderDate, order.kioskId, order.orderId, consumerId, productItemsArray);
                return res.json({ success: true, orderId: order.orderId });
            } else {
                totalSumObj.usedBalance = balance;
            }
        } else {
            totalSumObj.usedBalance = 0;
        }
        const order = await createOrder(serviceProvider, totalSumObj, consumerId, kiosk, null, productItemsArray, params.sessionId, null, 'gg', true);
        if (order.success === false) {
            log.error(order, 'order::pay::getOrder');
            return res.status(500).json({ message: 'could not create order' });
        }
        if (params.sessionId) {
            await updateSession(order.orderId, params.sessionId);
        }
        if (useBalance) {
            await addBalanceHistory(order.orderDate, consumerId, phone, balance, totalSum, order.orderId);
        }
        await handleSuccessOrder(order.orderDate, order.kioskId, order.orderId, consumerId, productItemsArray);

        return res.json({ success: true, orderId: order.orderId });
    } catch (err) {
        log.error(err, 'order::pay::server error');
        return res.status(500).json({ message: 'Error in pay order' });
    }
};