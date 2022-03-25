const {
    cards: Cards,
    stripeCards: StripeCards,
    stripeAccountCustomers: StripeAccountCustomers,
    orders: Orders,
    consumers: Consumers,
    productItems: ProductItems,
    serviceProviders: ServiceProviders,
    ordersProductItems: OrdersProductItems,
    menuItems: MenuItems,
    reviews: Reviews,
    kiosks: Kiosks,
    hoursOfOperations: HoursOfOperations,
    discountSchedules: DiscountSchedules,
    regions: Regions
} = require('app/models/models');
const { orders: ordersValidator } = require('app/schemes');
const { isSchemeValid } = require('app/helpers/validate');
const {
    calculateTotalPrice,
    updateOrder,
    updateSession,
    createOrder,
    addBalanceHistory,
    handleSuccessOrder,
    getTransactionId,
    createTransaction,
    handleSuccessFullBalanceOrder
} = require('app/services/order');
const { shouldAllowPayment } = require('app/services/payment');
const { pushCredit } = require('app/services/coffeeMachine');
const {
    ORDER: {
        idBank: {
            BINDING: { BINDING_RETURN_URL },
            REQUEST_TO_BANK_WAITING_TIME
        },
    },
    payment: { TYPE, PROVIDERS }
} = require('app/settings');
const { PAGE_VIEW } = require('app/constants');
const { calculatePrice } = require('app/controllers/common');
const { addNotEnoughMoneyMsg } = require('app/helpers/utils');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');
const payHelper = require('app/helpers/payment/pay');
const { getBankClient } = require('app/helpers/payment/common');

const getDefaultCard = async (paymentMethod, consumerId, paymentType = TYPE.BANK_CARD) => {
    const payload = {
        where: {
            consumerId: consumerId,
            isDefault: true,
        }
    };
    let cardModel;
    if (paymentMethod === PROVIDERS.ID_BANK) {
        cardModel = Cards;
    } else {
        cardModel = StripeCards;
        payload.where.paymentType = paymentType;
    }
    return await cardModel.findOne(payload);
};

/**
 * @swagger
 * /mobile/orders/consumerId/{id}:
 *   get:
 *     tags:
 *       - Private - Orders
 *     summary: Get consumer orders
 *     description: ''
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for consumer
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.list = async (req, res) => {
    try {
        const consumerId = req.params.id;
        let payload = { where: { consumerId: consumerId } };
        payload.attributes = ['id', 'orderDate', 'purchaseStatus', 'price', 'kioskName'];

        payload.include = [
            {
                // TODO: need to delete regionalSettings
                model: ServiceProviders, attributes: ['regionalSettings'], required: false,
                include: [{ model: Regions, required: true, attributes: ['isoCode'] }]
            },
            { model: Reviews, attributes: ['rating'], required: false },
        ];
        const { count, rows } = await Orders.findAndCountAll(payload);
        return res.json({ count, data: rows });
    } catch (err) {
        log.error(err, 'order::controller::getOrders');
        return res.status(500).json({ message: 'Error in get user list' });
    }
};

/**
 * @swagger
 * /mobile/order/{orderId}/consumerId/{id}:
 *   get:
 *     tags:
 *       - Private - Orders
 *     summary: Get consumer order
 *     description: ''
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for consumer
 *         required: true
 *         type: string
 *       - name: orderId
 *         in: path
 *         description: orderId
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.getOrder = async (req, res) => {
    try {
        const consumerId = req.params.id;
        const orderId = req.params.orderId;

        let payload = { where: { consumerId: consumerId, id: orderId } };

        payload.include = [
            { model: OrdersProductItems, attributes: ['name', 'price', 'barcode'], required: false },
            {
                // TODO: need to delete regionalSettings
                model: ServiceProviders, attributes: ['regionalSettings'], required: false,
                include: [{ model: Regions, required: true, attributes: ['isoCode'] }]
            },
            { model: Reviews, attributes: ['rating'], required: false },
        ];

        payload.attributes = ['id', 'orderDate', 'purchaseStatus', 'price', 'firstPurchaseDiscount', 'timeDiscountAmount',
            'discount', 'deliveryDiscountAmount', 'kioskName', 'maskedPan', 'usedBalance'
        ];
        const order = await Orders.findOne(payload);
        return res.json(order);
    } catch (err) {
        log.error(err, 'order::controller::getOrder');
        return res.status(500).json({ message: 'Error in get Order' });
    }
};

/**
 * @swagger
 * /mobile/order/{orderId}/consumerId/{id}:
 *   put:
 *     tags:
 *       - Private - Orders
 *     summary: RePay the order
 *     description: 'Try to rePay the order'
 *     parameters:
 *      - in: path
 *        name: orderId
 *        description: order ID
 *        required: true
 *        type: number
 *      - in: path
 *        name: id
 *        description: Consumer ID
 *        required: true
 *        type: number
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.rePay = async (req, res) => {
    try {
        const orderId = Number(req.params.orderId);
        const consumerId = Number(req.params.id);
        const order = await Orders.findOne({
            where: {
                consumerId: consumerId,
                orderStatus: 'pending',
                id: orderId,
                paymentType: TYPE.BANK_CARD
            },
            include: [
                { model: ServiceProviders, required: true },
                { model: Consumers, required: true, include: [{ model: Regions, required: true }] },
            ]
        });

        if (!order) {
            log.error('default card not found', 'order::rePay::notOrderFound');
            return res.status(404).json({ message: 'not order found' });
        }
        if (!order.consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'order::rePay::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        if (order.consumer.region.id !== order.serviceProvider.regionId) {
            log.error('Forbidden. User region does not match with sp region.', 'order::rePay::regionsMismatches');
            return res.status(403).json({ message: 'Forbidden. User region does not match with sp region.' });
        }

        const defaultCard = await getDefaultCard(order.consumer.region.paymentMethod, consumerId);
        if (!defaultCard) {
            log.error('default card not found', 'order::rePay::getDefaultCard');
            return res.status(500).json({ message: 'default card not found' });
        }

        const totalSum = order.price - order.usedBalance;
        const transactionId = await getTransactionId();
        const orderPayload = await payHelper.pay.payload({
            transactionId,
            amount: totalSum,
            serviceProvider: order.serviceProvider,
            defaultCard,
            consumer: order.consumer,
            orderId: order.id,
            kioskName: order.kioskName
        });
        let response;
        const client = getBankClient(order.consumer.region.paymentMethod, order.serviceProvider.id);
        try {
            response = await client.payOrder(orderPayload);
        } catch (err) {
            log.error(err, 'order::rePay::payOrder');
            return res.status(500).json({ hasError: true, err: err, orderId: order.id });
        }
        const bankOrderId = payHelper.pay.getBankOrderId(order.consumer.region.paymentMethod, response);
        const transactionData = payHelper.pay.transactionData({
            transactionId,
            amount: totalSum,
            orderId: order.id,
            description: `Kerpak - ${order.serviceProvider.legalName}`,
            serviceProviderId: order.serviceProvider.id,
            bankOrderId,
            consumer: order.consumer
        });
        if (response.hasError) {
            await createTransaction(transactionData, response, order.consumer.region.paymentMethod, true);
            log.error(response, 'order::rePay::payOrder::hasError');
            if (order.consumer.region.paymentMethod === PROVIDERS.ID_BANK) {
                addNotEnoughMoneyMsg(response);
            }
            return res.status(500).json({ ...response, orderId: order.id });
        }
        await createTransaction(transactionData, response, order.consumer.region.paymentMethod);
        await updateOrder(order.id, 'completed', 'successful', null, bankOrderId);
        await Consumers.update(
            {
                lastOrderDate: order.orderDate,
                kioskIdOfLastOrder: order.kioskId
            },
            {
                where: { id: consumerId }
            }
        );
        const productItemsArray = await OrdersProductItems.findAll({
            where: {
                orderId: order.id
            }
        });
        for (let i in productItemsArray) {
            const menuItem = await MenuItems.findOne({
                where: {
                    barcode: productItemsArray[i].barcode,
                    serviceProviderId: order.serviceProviderId,
                }
            });
            if (menuItem) {
                let productItemPayload = {
                    where: {
                        menuItemId: menuItem.id,
                        kioskId: order.kioskId,
                        serviceProviderId: order.serviceProviderId
                    }
                };
                if (productItemsArray[i].EAN5) {
                    productItemPayload.where.EAN5 = productItemsArray[i].EAN5;
                } else {
                    productItemPayload.where.status = 'available';
                }
                const product = await ProductItems.findOne(productItemPayload);
                if (product && product.status !== 'sold') {
                    await ProductItems.update({ status: 'sold', orderId: order.id }, {
                        where: {
                            id: product.id
                        }
                    });
                } else {
                    await Orders.update({ hasDoubleSold: true }, { where: { id: order.id } });
                    await OrdersProductItems.update({ doubleSold: true }, { where: { id: productItemsArray[i].id } });
                }
            }
        }
        return res.json({ success: true });
    } catch (err) {
        log.error(err, 'order::rePay::server error');
        return res.status(500).json({ message: 'Error in rePay' });
    }
};

/**
 * @swagger
 * /mobile/v2/order:
 *   post:
 *     tags:
 *       - Private - Orders
 *     summary: Create order
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kioskId:
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
 *     security:
 *      - bearerAuth: []
 */
module.exports.create = async (req, res) => {
    try {
        let payload;
        try {
            payload = await isSchemeValid(ordersValidator.create, req.body);
        } catch (err) {
            loggerValidations.error(err, 'order::create::validation');
            return res.status(400).json({ err, message: 'validation error' });
        }
        const { kioskId, productItems } = payload;
        const kiosk = await Kiosks.findOne({
            where: { id: kioskId },
            include: [
                { model: ServiceProviders, required: false, attributes: ['timezone'] },
                // TODO need to remove
                { model: DiscountSchedules, as: 'discountSchedules', required: false },
                { model: HoursOfOperations, as: 'hoursOfOperations', required: false }
            ]
        });
        if (!kiosk) {
            return res.status(404).json({ message: 'kiosk not found' });
        }
        const totalSumObj = await calculateTotalPrice(req.user.id, productItems, kiosk);
        if (totalSumObj.success === false) {
            return res.status(404).json({ totalSumObj });
        }
        const { totalSum, firstPurchaseDiscount, timeDiscountAmount, discount } = totalSumObj;
        return res.json({ totalSum, firstPurchaseDiscount, timeDiscountAmount, discount });
    } catch (err) {
        log.error(err, 'order::create::server error');
        return res.status(500).json({ message: 'Error in create order' });
    }
};

/**
 * @swagger
 * /mobile/v2/order:
 *   put:
 *     tags:
 *       - Private - Orders
 *     summary: Pay order
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kioskId:
 *                 type: number
 *               sessionId:
 *                 type: number
 *               useBalance:
 *                 type: boolean
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
 *     security:
 *      - bearerAuth: []
 */
module.exports.pay = async (req, res) => {
    try {
        const payload = { ...req.body };
        let params;
        try {
            params = await isSchemeValid(ordersValidator.pay, payload);
        } catch (err) {
            loggerValidations.error(err, 'order::controller::pay::validation');
            return res.status(400).json({ err, message: 'validation error' });
        }
        const { kioskId, productItems, sessionId, useBalance } = params;
        const consumer = await Consumers.findOne({
            where: { id: req.user.id },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'order::controller::pay::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        const kiosk = await Kiosks.findOne(
            {
                where: { id: kioskId },
                include: [
                    { model: ServiceProviders, required: true },
                    // TODO need to remove
                    { model: DiscountSchedules, as: 'discountSchedules', required: false },
                    { model: HoursOfOperations, as: 'hoursOfOperations', required: false }
                ]
            }
        );
        if (!kiosk) {
            log.error('Kiosk not found', 'order::controller::pay::kioskNotFound');
            return res.status(404).json({ message: 'Kiosk not found' });
        }
        if (consumer.region.id !== kiosk.serviceProvider.regionId) {
            log.error('Forbidden. User region does not match with sp region.', 'order::controller::pay::regionsMismatches');
            return res.status(403).json({ message: 'Forbidden. User region does not match with sp region.' });
        }
        const defaultCard = await getDefaultCard(consumer.region.paymentMethod, req.user.id);
        if (!defaultCard) {
            log.error('default card not found', 'order::controller::pay::getDefaultCard');
            return res.status(500).json({ message: 'default card not found' });
        }

        const totalSumObj = await calculateTotalPrice(req.user.id, productItems, kiosk);
        if (totalSumObj.success === false) {
            log.error(totalSumObj, 'order::controller::V2::pay::calculateTotalPrice');
            return res.status(404).json({ totalSumObj });
        }

        const { totalSum, productItemsArray } = totalSumObj;
        let orderTotalSum = totalSum;
        if (useBalance) {
            if (consumer.balance <= 0) {
                log.error({ consumerId: consumer.id }, 'order::controller::V2::pay::positiveBalance');
                return res.status(404).json({ error: 'You have not positive balance', success: false });
            } else if (totalSum <= consumer.balance) {
                const successData = await handleSuccessFullBalanceOrder(consumer, totalSumObj, sessionId, kiosk, defaultCard, productItemsArray);
                return res.json({ success: true, orderId: successData.orderId });
            } else {
                orderTotalSum = totalSum - consumer.balance;
                totalSumObj.usedBalance = consumer.balance;
            }
        } else {
            totalSumObj.usedBalance = 0;
        }

        const order = await createOrder(kiosk.serviceProvider, totalSumObj, consumer.id, kiosk, defaultCard, productItemsArray, sessionId, null, null, null, consumer.region.paymentMethod);
        if (order.success === false) {
            log.error(order, 'order::controller::createOrder');
            return res.status(500).json({ message: 'could not create order' });
        }
        if (sessionId) {
            await updateSession(order.orderId, sessionId);
        }
        if (useBalance) {
            await addBalanceHistory(order.orderDate, req.user.id, consumer.phone, consumer.balance, totalSum, order.orderId);
        }

        const transactionId = await getTransactionId();
        const orderPayload = await payHelper.pay.payload({
            transactionId,
            amount: orderTotalSum,
            serviceProvider: kiosk.serviceProvider,
            defaultCard,
            consumer,
            orderId: order.orderId,
            kioskName: kiosk.displayName,
        });
        let response;
        const client = getBankClient(consumer.region.paymentMethod, kiosk.serviceProvider.id);
        try {
            response = await client.payOrder(orderPayload);
        } catch (err) {
            log.error(err, 'order::controller::V2::pay::payOrder');
            return res.status(500).json({ hasError: true, err: err, orderId: order.orderId });
        }
        const bankOrderId = payHelper.pay.getBankOrderId(consumer.region.paymentMethod, response);
        const transactionData = payHelper.pay.transactionData({
            transactionId,
            amount: orderTotalSum,
            orderId: order.orderId,
            description: `Kerpak - ${kiosk.serviceProvider.legalName}`,
            serviceProviderId: kiosk.serviceProvider.id,
            bankOrderId,
            consumer
        });
        if (response.hasError) {
            await createTransaction(transactionData, response, consumer.region.paymentMethod, true);
            const checkError = await payHelper.pay.checkError({
                response,
                orderId: order.orderId,
                totalSum: totalSumObj.totalSum,
                serviceProvider: kiosk.serviceProvider,
                consumer: consumer
            });
            if (checkError.success) {
                return res.json(checkError);
            }
            return res.status(500).json(checkError);
        }
        if ((consumer.region.paymentMethod === PROVIDERS.STRIPE || consumer.region.paymentMethod === PROVIDERS.STRIPE_TEST) && !orderPayload.connectedAccountCustomer) {
            await StripeAccountCustomers.create({
                consumerId: consumer.id,
                serviceProviderId: kiosk.serviceProvider.id,
                customerId: response.customerForConnectedAccount
            });
        }
        await createTransaction(transactionData, response, consumer.region.paymentMethod);
        const updatedOrder = await updateOrder(order.orderId, 'completed', 'successful', null, bankOrderId);
        await handleSuccessOrder(updatedOrder.orderDate, updatedOrder.kioskId, order.orderId, req.user.id, productItemsArray);
        return res.json({ success: true, orderId: order.orderId });
    } catch (err) {
        log.error(err, 'order::controller::pay::generic');
        return res.status(500).json({ message: 'Error in pay' });
    }
};

/**
 * @swagger
 * /mobile/order/register:
 *   put:
 *     tags:
 *       - Private - Orders
 *     summary: Register order
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kioskId:
 *                 type: number
 *               sessionId:
 *                 type: number
 *               cardType:
 *                 type: string
 *               useBalance:
 *                 type: boolean
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
 *     security:
 *      - bearerAuth: []
 */

module.exports.register = async (req, res) => {
    try {
        let payload;
        try {
            payload = await isSchemeValid(ordersValidator.register, { ...req.body });
        } catch (err) {
            loggerValidations.error(err, 'order::controller::register::validation');
            return res.status(400).json({ err, message: 'validation error' });
        }
        const { kioskId, productItems, sessionId, useBalance, cardType } = payload;
        const consumer = await Consumers.findOne({
            where: { id: req.user.id },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'order::controller::register::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        const kiosk = await Kiosks.findOne(
            {
                where: { id: kioskId },
                include: [
                    { model: ServiceProviders, required: true }
                ]
            }
        );
        if (!kiosk) {
            log.error('Kiosk not found', 'order::controller::register::kioskNotFound');
            return res.status(404).json({ message: 'Kiosk not found' });
        }
        if (consumer.region.id !== kiosk.serviceProvider.regionId) {
            log.error('Forbidden. User region does not match with sp region.', 'order::controller::pay::regionsMismatches');
            return res.status(403).json({ message: 'Forbidden. User region does not match with sp region.' });
        }

        if (!(consumer.region.paymentMethod === PROVIDERS.STRIPE || consumer.region.paymentMethod === PROVIDERS.STRIPE_TEST)) {
            log.error('FORBIDDEN', 'order::controller::register::paymentMethod');
            return res.status(403).json({ error: 'FORBIDDEN' });
        }
        const paymentType = payHelper.register.getPaymentTypeType(cardType);
        const defaultCard = await getDefaultCard(consumer.region.paymentMethod, req.user.id, paymentType);
        if (!defaultCard) {
            log.error('default card not found', 'order::controller::register::getDefaultCard');
            return res.status(500).json({ message: 'default card not found' });
        }
        const totalSumObj = await calculateTotalPrice(consumer.id, productItems, kiosk);
        if (totalSumObj.success === false) {
            log.error(totalSumObj, 'order::controller::register::calculateTotalPrice');
            return res.status(404).json({ totalSumObj });
        }

        const { totalSum, productItemsArray } = totalSumObj;
        let orderTotalSum = totalSum;
        if (useBalance) {
            if (consumer.balance <= 0) {
                log.error({ consumerId: consumer.id }, 'order::controller::register::positiveBalance');
                return res.status(404).json({ error: 'You have not positive balance', success: false });
            } else if (totalSum <= consumer.balance) {
                const successData = await handleSuccessFullBalanceOrder(consumer, totalSumObj, sessionId, kiosk, defaultCard, productItemsArray);
                return res.json({ success: true, orderId: successData.orderId, complete: true });
            } else {
                orderTotalSum = totalSum - consumer.balance;
                totalSumObj.usedBalance = consumer.balance;
            }
        } else {
            totalSumObj.usedBalance = 0;
        }

        const order = await createOrder(kiosk.serviceProvider, totalSumObj, consumer.id, kiosk, defaultCard, productItemsArray, sessionId, null, null, null, consumer.region.paymentMethod);
        if (order.success === false) {
            log.error(order, 'order::controller::register::createOrder');
            return res.status(500).json({ message: 'could not create order' });
        }
        if (sessionId) {
            await updateSession(order.orderId, sessionId);
        }
        if (useBalance) {
            await addBalanceHistory(order.orderDate, req.user.id, consumer.phone, consumer.balance, totalSum, order.orderId);
        }

        const orderDescription = `Kerpak - ${kiosk.serviceProvider.legalName}`;
        const transactionId = await getTransactionId();
        const orderPayload = await payHelper.register.payload({
            amount: orderTotalSum,
            currency: consumer.region.currencyName,
            kiosk,
            consumer,
            orderId: order.orderId,
        });
        let response;
        const client = getBankClient(consumer.region.paymentMethod, kiosk.serviceProvider.id);
        try {
            response = await client.registerOrder(orderPayload);
        } catch (err) {
            log.error(err, 'order::controller::register::registerOrder');
            return res.status(500).json({ hasError: true, err: err, orderId: order.orderId });
        }
        const transactionData = {
            transactionId,
            paymentType,
            paymentProvider: consumer.region.paymentMethod,
            amount: orderTotalSum,
            orderId: order.orderId,
            description: orderDescription,
            serviceProviderId: kiosk.serviceProvider.id,
            mdOrder: response.data?.id,
            clientId: consumer.stripeCustomerId,
        };
        if (response.hasError) {
            await createTransaction(transactionData, response, consumer.region.paymentMethod, true);
            log.error(response, 'order::controller::register::registerOrder::hasError');
            return res.status(500).json({ success: false, ...response, orderId: order.orderId });
        }
        if (!orderPayload.connectedAccountCustomer) {
            await StripeAccountCustomers.create({
                consumerId: consumer.id,
                serviceProviderId: kiosk.serviceProvider.id,
                customerId: response.customerForConnectedAccount
            });
        }
        await createTransaction(transactionData, response, consumer.region.paymentMethod);
        await Orders.update({ bankOrderId: response.data.id }, { where: { id: order.orderId } });
        return res.json({ success: true, complete: false, orderId: order.orderId, clientSecret: response.data.client_secret });
    } catch (err) {
        log.error(err, 'order::controller::register::generic');
        return res.status(500).json({ success: false, message: 'Error in register order' });
    }
};

/**
 * @swagger
 * /mobile/orders/{orderId}/consumers/{id}/confirm:
 *   put:
 *     tags:
 *       - Private - Orders
 *     summary: Confirm order
 *     description: ''
 *     parameters:
 *      - in: path
 *        name: orderId
 *        description: order ID
 *        required: true
 *        type: number
 *      - in: path
 *        name: id
 *        description: consumer ID
 *        required: true
 *        type: number
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardType:
 *                 type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */

module.exports.confirmOrder = async (req, res) => {
    try {
        let payload;
        try {
            payload = await isSchemeValid(ordersValidator.confirm, {
                orderId: req.params.orderId,
                consumerId: req.params.id,
                ...req.body
            });
        } catch (err) {
            loggerValidations.error(err, 'order::controller::confirmOrder::validation');
            return res.status(400).json({ err, message: 'validation error' });
        }
        const { orderId, consumerId, cardType } = payload;
        const consumer = await Consumers.findOne({
            where: { id: consumerId },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'order::controller::confirmOrder::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        const paymentType = payHelper.register.getPaymentTypeType(cardType);
        const order = await Orders.findOne(
            {
                where: {
                    id: orderId,
                    orderStatus: 'pending',
                    paymentType
                },
                include: [
                    { model: ServiceProviders, required: true }
                ]
            }
        );
        if (!order) {
            log.error('Order not found', 'order::controller::confirmOrder::orderNotFound');
            return res.status(404).json({ message: 'Order not found' });
        }
        if (!order.bankOrderId) {
            log.error('can\'t confirm order. don\'t have a bank order ID', 'order::controller::confirmOrder::bankOrderId');
            return res.status(409).json({ error: 'can\'t confirm order. don\'t have a bank order ID' });
        }

        if (!(consumer.region.paymentMethod === PROVIDERS.STRIPE || consumer.region.paymentMethod === PROVIDERS.STRIPE_TEST)) {
            log.error('FORBIDDEN', 'order::controller::confirmOrder::paymentMethod');
            return res.status(500).json({ error: 'FORBIDDEN' });
        }
        const orderPayload = payHelper.checkStatus.payload(consumer.region.paymentMethod, { mdOrder: order.bankOrderId, stripeAccount: order.serviceProvider.stripeId });
        const client = getBankClient(consumer.region.paymentMethod, order.serviceProvider.id);
        let orderRes;
        try {
            orderRes = await client.getOrderStatus(orderPayload);
        } catch (err) {
            log.error(err, 'order::controller::confirmOrder::getOrderStatus');
            return res.status(500).json({ hasError: true, err: err });
        }
        const hasError = payHelper.checkStatus.checkError(consumer.region.paymentMethod, orderRes);
        if (hasError) {
            log.error(orderRes, 'order::controller::confirmOrder::getOrderStatus::hasError');
            return res.json({ success: false, orderRes });
        }
        const productItemsArray = await OrdersProductItems.findAll({ where: { orderId: order.id } });
        for (let i in productItemsArray) {
            const menuItem = await MenuItems.findOne({
                where: {
                    barcode: productItemsArray[i].barcode,
                    serviceProviderId: order.serviceProviderId,
                }
            });
            if (menuItem) {
                let productItemPayload = {
                    where: {
                        menuItemId: menuItem.id,
                        kioskId: order.kioskId,
                        serviceProviderId: order.serviceProviderId
                    }
                };
                if (productItemsArray[i].EAN5) {
                    productItemPayload.where.EAN5 = productItemsArray[i].EAN5;
                } else {
                    productItemPayload.where.status = 'available';
                }
                const product = await ProductItems.findOne(productItemPayload);
                if (product && product.status !== 'sold') {
                    await ProductItems.update({ status: 'sold', orderId: order.id }, {
                        where: {
                            id: product.id
                        }
                    });
                } else {
                    await Orders.update({ hasDoubleSold: true }, { where: { id: order.id } });
                    await OrdersProductItems.update({ doubleSold: true }, { where: { id: productItemsArray[i].id } });
                }
            }
        }
        const orderDate = Date.now();
        await Orders.update({
            orderStatus: 'successful',
            purchaseStatus: 'completed',
            orderDate,
        }, { where: { id: order.id } });

        const consumerPayload = {
            lastOrderDate: orderDate,
            kioskIdOfLastOrder: order.kioskId,
        };
        await Consumers.update(
            consumerPayload,
            {
                where: { id: consumerId }
            }
        );
        return res.json({ success: true });
    } catch (err) {
        log.error(err, 'order::controller::register::generic');
        return res.status(500).json({ success: false, message: 'Error in confirm order' });
    }
};

/**
 * @swagger
 * /mobile/v2/coffeemachine/order:
 *   put:
 *     tags:
 *       - Private - Orders
 *     summary: Pay order
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kioskId:
 *                 type: number
 *               useBalance:
 *                 type: boolean
 *               productItems:
 *                 type: array
 *                 items:
 *                    type: object
 *                    properties:
 *                      barcode:
 *                        type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.payCoffeemachineOrder = async (req, res) => {
    const payload = { ...req.body };
    isSchemeValid(ordersValidator.payCoffeemachineOrder, payload)
        .then(async params => {
            const consumer = await Consumers.findOne({
                where: { id: req.user.id },
                include: [
                    { model: Regions, required: true }
                ]
            });
            if (consumer.region.isoCode !== 'am') {
                log.error('FORBIDDEN isoCode', 'order::controller::consumer::payCoffeemachineOrder');
                return res.status(403).json({ message: 'FORBIDDEN' });
            }
            if (!consumer.region.paymentMethod) {
                log.error('There are no supported payment methods in the region.', 'order::controller::payCoffeemachineOrder::noPaymentMethod');
                return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
            }
            const kiosk = await Kiosks.findOne(
                {
                    where: { id: params.kioskId },
                    include: [
                        { model: ServiceProviders, required: false, attributes: ['timezone'] },
                        // TODO need to remove
                        { model: DiscountSchedules, as: 'discountSchedules', required: false },
                        { model: HoursOfOperations, as: 'hoursOfOperations', required: false }
                    ]
                });
            const coffemashinId = kiosk.coffeeMachineID;
            const serviceProviderId = kiosk.serviceProviderId;
            const serviceProvider = await ServiceProviders.findOne({ where: { id: serviceProviderId } });
            const defaultCard = await Cards.findOne({
                where: {
                    consumerId: req.user.id, active: true, isDefault: true, paymentType: TYPE.BANK_CARD
                }
            });
            if (!defaultCard) {
                updateOrder();
                log.error('default card not found', 'order::controller::getOrder');
                return res.status(500).json({ message: 'default card not found' });
            }
            const { id: consumerId, bankClientId, balance, phone } = await Consumers.findOne({ where: { id: req.user.id } });
            const bindingId = defaultCard.bindingId;

            const totalSumObj = await calculateTotalPrice(req.user.id, params.productItems, kiosk);
            if (totalSumObj.success === false) {
                log.error(totalSumObj, 'order::controller::V2::pay::calculateTotalPrice');
                return res.status(404).json({ totalSumObj });
            }

            const { totalSum, sumWithoutDiscount, productItemsArray } = totalSumObj;
            let orderTotalSum = totalSum;
            const { useBalance } = payload;
            if (useBalance) {
                if (balance <= 0) {
                    log.error({ consumerId: consumerId }, 'order::controller::V2::pay::possitiveBalance');
                    return res.status(404).json({ error: 'You have not possitive balance', success: false });
                } else if (totalSum <= balance) {
                    const order = await createOrder(serviceProvider, totalSumObj, consumerId, kiosk, defaultCard, productItemsArray, params.sessionId, true);
                    if (params.sessionId) {
                        await updateSession(order.orderId, params.sessionId);
                    }
                    await addBalanceHistory(order.orderDate, req.user.id, phone, balance, totalSum, order.orderId);
                    await handleSuccessOrder(order.orderDate, order.kioskId, order.orderId, req.user.id, productItemsArray);
                    await pushCredit(coffemashinId, sumWithoutDiscount);
                    return res.json({ success: true, orderId: order.orderId });
                } else {
                    orderTotalSum = totalSum - balance;
                    totalSumObj.usedBalance = balance;
                }
            } else {
                totalSumObj.usedBalance = 0;
            }

            const order = await createOrder(serviceProvider, totalSumObj, consumerId, kiosk, defaultCard, productItemsArray, params.sessionId);
            if (order.success === false) {
                log.error(order, 'order::controller::createOrder');
                return res.status(500).json({ message: 'could not create order' });
            }
            if (params.sessionId) {
                await updateSession(order.orderId, params.sessionId);
            }
            if (useBalance) {
                await addBalanceHistory(order.orderDate, req.user.id, phone, balance, totalSum, order.orderId);
            }

            const orderDescription = `Kerpak - ${serviceProvider.legalName}`;
            const transactionId = await getTransactionId();
            const orderPayload = {
                orderNumber: transactionId,
                amount: calculatePrice(orderTotalSum),
                clientId: bankClientId,
                returnUrl: BINDING_RETURN_URL,
                description: orderDescription,
                currency: consumer.region.currencyCode, // NOTE: allow only IDRAM (AM) for current step (need to update when integrate STRIPE).
                language: consumer.region.language,
                pageView: PAGE_VIEW.DESKTOP,
                bindingId,
                useBinding: true,
            };
            let response;
            try {
                const client = getBankClient(PROVIDERS.ID_BANK, serviceProviderId);
                response = await client.payOrder(orderPayload);
            } catch (err) {
                log.error(err, 'order::controller::V2::pay::payOrder');
                return res.status(500).json({ hasError: true, err: err, orderId: order.orderId });
            }
            const transactionData = {
                clientId: bankClientId,
                transactionId,
                paymentType: TYPE.BANK_CARD,
                paymentProvider: PROVIDERS.ID_BANK,
                amount: orderTotalSum,
                orderId: order.orderId,
                description: orderDescription,
                serviceProviderId,
                mdOrder: response.register?.orderId,
            };
            if (response.hasError) {
                await createTransaction(transactionData, response, PROVIDERS.ID_BANK, true);
                if (response.register?.orderId) {
                    await Orders.update(
                        { bankOrderId: response.register.orderId },
                        { where: { id: order.orderId } }
                    );
                }
                if (response.err?.name === 'TimeoutError') {
                    if (await shouldAllowPayment(totalSumObj.totalSum, serviceProvider, consumerId)) {
                        await Orders.update({ isRegisterTimeout: true }, { where: { id: order.orderId } });
                        return res.json({ success: true, orderId: order.orderId });
                    }
                    log.error(response, 'order::controller::pay::payOrder::TimeoutError');
                    return res.status(500).json({ error: 'Order not processed', success: false, orderId: order.orderId, info: `timeout after ${REQUEST_TO_BANK_WAITING_TIME} seconds` });
                }
                addNotEnoughMoneyMsg(response);
                log.error(response, 'order::controller::pay::payOrder::hasError');
                return res.status(500).json({ ...response, orderId: order.orderId });
            }
            await createTransaction(transactionData, response, PROVIDERS.ID_BANK);
            const updatedOrder = await updateOrder(order.orderId, 'completed', 'successful', null, response.register.orderId);
            await handleSuccessOrder(updatedOrder.orderDate, updatedOrder.kioskId, order.orderId, req.user.id, productItemsArray);
            await pushCredit(coffemashinId, sumWithoutDiscount);
            return res.json({ success: true, orderId: order.orderId });
        })
        .catch(err => {
            log.error(err, 'order::controller::pay::generic');
            return res.status(404).json({ message: 'validation error' });
        });
};

/**
 * @swagger
 * /mobile/orders/{id}/status:
 *   put:
 *     tags:
 *       - Private - Orders
 *     summary: Get status of the order
 *     description: 'Try to get status of the order'
 *     parameters:
 *      - in: path
 *        name: id
 *        description: order ID
 *        required: true
 *        type: number
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.status = async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const consumer = await Consumers.findOne({
            where: { id: req.user.id },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'order::controller::status::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        const order = await Orders.findOne({
            where: {
                orderStatus: ['pending', 'successful'],
                id: orderId,
                paymentType: TYPE.BANK_CARD
            },
            include: [{ model: ServiceProviders, required: true }]
        });
        if (!order) {
            log.error('order not found', 'order::controller::status');
            return res.status(404).json({ message: 'not order found' });
        }
        if (consumer.region.id !== order.serviceProvider.regionId) {
            log.error('Forbidden. User region does not match with sp region.', 'order::controller::status::regionsMismatches');
            return res.status(403).json({ message: 'Forbidden. User region does not match with sp region.' });
        }
        if (order.orderStatus === 'successful') {
            return res.json({ success: true, status: 'successful' });
        }
        const mdOrder = order.bankOrderId;
        const client = getBankClient(consumer.region.paymentMethod, order.serviceProvider.id);
        const orderPayload = payHelper.checkStatus.payload(consumer.region.paymentMethod, { mdOrder, stripeAccount: order.serviceProvider.stripeId });
        let orderRes;
        try {
            orderRes = await client.getOrderStatus(orderPayload);
        } catch (err) {
            log.error(err, 'order::controller::status::getOrderStatus');
            return res.status(500).json({ hasError: true, err: err });
        }
        const orderDescription = `Kerpak - ${order.serviceProvider.legalName}`;
        const transactionId = await getTransactionId();
        const transactionData = {
            transactionId,
            paymentType: TYPE.BANK_CARD,
            paymentProvider: consumer.region.paymentMethod,
            amount: order.price - order.usedBalance,
            orderId: order.id,
            description: orderDescription,
            serviceProviderId: order.serviceProvider.id,
            mdOrder
        };
        const hasError = payHelper.checkStatus.checkError(consumer.region.paymentMethod, orderRes);
        if (hasError) {
            await createTransaction(transactionData, orderRes, consumer.region.paymentMethod, true);
            log.error(orderRes, 'order::controller::status::orderRes');
            return res.json({ success: true, status: 'pending', message: orderRes.errorMessage, mdOrder });
        }
        await createTransaction(transactionData, orderRes, consumer.region.paymentMethod);
        await updateOrder(orderId, 'completed', 'successful');
        await Consumers.update(
            {
                lastOrderDate: order.orderDate,
                kioskIdOfLastOrder: order.kioskId
            },
            {
                where: { id: consumer.id }
            }
        );
        const productItemsArray = await OrdersProductItems.findAll({
            where: {
                orderId: order.id
            }
        });
        for (let i in productItemsArray) {
            const menuItem = await MenuItems.findOne({
                where: {
                    barcode: productItemsArray[i].barcode,
                    serviceProviderId: order.serviceProvider.id,
                    archived: false
                }
            });
            let productItemPayload = {
                where: {
                    menuItemId: menuItem.id,
                    kioskId: order.kioskId,
                    serviceProviderId: order.serviceProvider.id
                }
            };
            if (productItemsArray[i].EAN5) {
                productItemPayload.where.EAN5 = productItemsArray[i].EAN5;
            } else {
                productItemPayload.where.status = 'available';
            }
            const product = await ProductItems.findOne(productItemPayload);
            if (product && product.status !== 'sold') {
                await ProductItems.update({ status: 'sold', orderId: order.id }, {
                    where: {
                        id: product.id
                    }
                });
            } else {
                await Orders.update({ hasDoubleSold: true }, { where: { id: order.id } });
                await OrdersProductItems.update({ doubleSold: true }, { where: { id: productItemsArray[i].id } });
            }
        }
        return res.json({ success: true, status: 'successful' });

    } catch (err) {
        log.error(err, 'order::controller::status::generic');
        return res.status(500).json({ success: false });
    }
};