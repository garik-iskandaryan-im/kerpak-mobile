const Gateways = require('easy-payment');
const IDBANK = require('@easy-payment/idbank').gateway;
const {
    cards: Cards,
    stripeCards: StripeCards,
    stripeAccountCustomers: StripeAccountCustomers,
    orders: Orders,
    kiosks: Kiosks,
    consumers: Consumers,
    productItems: ProductItems,
    serviceProviders: ServiceProviders,
    ordersProductItems: OrdersProductItems,
    menuItems: MenuItems,
    balanceHistary: BalanceHistary,
    ordersRefund: OrdersRefund,
    regions: Regions,
    sequelize,
    Sequelize
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
const { getSPAuthSettings } = require('app/services/payment');
const {
    ORDER: {
        idBank: {
            BINDING: { BINDING_RETURN_URL }
        }
    },
    payment: { TYPE, PROVIDERS }
} = require('../settings');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');
const { getListPayload, getOnePayload, addOrderById, calculatePrice } = require('app/controllers/common');
const { sendNotification } = require('app/services/firebase');
const pupa = require('pupa');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { getSPTimeZone, addNotEnoughMoneyMsg } = require('app/helpers/utils');
const { PAGE_VIEW } = require('app/constants');
const payHelper = require('app/helpers/payment/pay');
const { getBankClient } = require('app/helpers/payment/common');

module.exports.list = async (req, res) => {
    try {
        const aggregateFunctions = [
            [Sequelize.literal('orders.discount_sum + orders.price'), 'orderAmount']
        ];
        let payload = getListPayload(req, false, aggregateFunctions);
        payload.attributes = [
            'id', 'orderDate', 'purchaseStatus', 'orderStatus', 'price', 'firstPurchaseDiscount', 'timeDiscountAmount', 'discountSum', 'kioskName',
            'kioskAddress', 'SPName', 'productsCount', 'consumerId', 'kioskId', 'serviceProviderId', 'refund', 'usedBalance',
            [Sequelize.literal('discount_sum + price'), 'orderAmount']
        ];
        if (req.user.isKerpakOperator) {
            payload.attributes.push('maskedPan', 'cardHolderName');
        }
        payload.include = [
            { model: OrdersProductItems, required: false },
            {
                model: ServiceProviders, attributes: ['id', 'legalName', 'regionId'], required: false,
                include: [{ model: Regions, attributes: ['currencyName', 'currencySymbol'], required: true }]
            },
        ];
        payload.group = ['id'];
        payload = addOrderById(payload);
        const { count, rows } = await Orders.findAndCountAll(payload);
        res.json({ count: count.length, data: rows });
    } catch (err) {
        log.error(err, 'order::controller::getOrders');
        return res.status(500).json({ err, message: 'Error in get orders list' });
    }
};

module.exports.get = async (req, res) => {
    try {
        const id = req.params.id;
        const payload = {
            ...getOnePayload(req, id),
            include: [
                { model: OrdersProductItems, required: false },
                {
                    model: ServiceProviders, attributes: ['id', 'legalName'], required: false,
                    include: [{ model: Regions, attributes: ['isoCode', 'currencySymbol', 'currencyName'], required: true }]
                },
                { model: Consumers, attributes: ['id'], required: false },
            ],
            attributes: ['id', 'orderDate', 'purchaseStatus', 'orderStatus', 'price', 'firstPurchaseDiscount', 'timeDiscountAmount',
                'kioskName', 'kioskAddress', 'productsCount', 'consumerId', 'kioskId', 'serviceProviderId', 'deliveryDiscountAmount',
                [Sequelize.literal('orders.discount_sum + orders.price'), 'orderAmount'], 'usedBalance', 'isRegisterTimeout',
                'isPayTimeout', 'isStatusTimeout', 'paymentMethod', 'bankOrderId', 'refund'
            ]
        };
        if (req.user.isKerpakOperator) {
            payload.attributes.push('maskedPan', 'cardHolderName');
        }
        const order = await Orders.findOne(payload)
        return res.json(order);
    } catch(err) {
        log.error(err, 'order::controller::getOrder');
        return res.status(500).json({ message: 'Error in get order' });
    }
};

module.exports.exportOrdersXLSX = async (req, res) => {
    try {
        const aggregateFunctions = [
            [Sequelize.literal('orders.discount_sum + orders.price'), 'orderAmount']
        ];
        let payload = {
            ...getListPayload(req, false, aggregateFunctions),
            attributes: [
                'id', 'kioskName', 'orderStatus', 'consumerId', [Sequelize.literal('discount_sum + price'), 'orderAmount'],
                'discountSum', 'price', 'refund', 'orderDate', 'usedBalance'
            ],
            raw: true,
            group: ['id']
        }
        payload = addOrderById(payload);
        const orders = await Orders.findAll(payload);
        const fileName = 'orders.xlsx';
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales');

        worksheet.columns = [
            { header: 'Order ID', key: 'A', width: 14 },
            { header: 'Kiosk', key: 'B', width: 30 },
            { header: 'Status', key: 'C', width: 16 },
            { header: 'Customer', key: 'D', width: 14 },
            { header: 'Order amount', key: 'E', width: 16 },
            { header: 'Discount', key: 'F', width: 16 },
            { header: 'Applied balance ', key: 'G', width: 16 },
            { header: 'Paid amount ', key: 'H', width: 16 },
            { header: 'Refund', key: 'I', width: 14 },
            { header: 'Order Date', key: 'J', width: 16 },
        ];

        orders.forEach(order => {
            worksheet.addRow({
                A: order.id,
                B: order.kioskName,
                C: order.orderStatus,
                D: order.consumerId,
                E: order.orderAmount,
                F: order.discountSum,
                G: order.usedBalance,
                H: order.price,
                I: order.refund,
                J: order.orderDate ? moment(order.orderDate).utcOffset(getSPTimeZone(req.user)).format('DD.MM.YYYY, HH:mm') : '-',
            });
        });

        worksheet.getRow(1).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);

        await workbook.xlsx.write(res);

        res.end();
    } catch (err) {
        log.error(err, 'itemTransfers::exportOrdersXLSX');
        return res.status(500).json({ message: 'Error in get XLSX' });
    }
};

module.exports.exportOrdersForSalesXLSX = async (req, res) => {
    try {
        const aggregateFunctions = [
            [Sequelize.literal('orders.discount_sum + orders.price'), 'orderAmount']
        ];
        let payload = getListPayload(req, false, aggregateFunctions);
        payload.include = [
            { model: Kiosks, attributes: ['id', 'displayName'], required: false },
            { model: OrdersProductItems, attributes: ['id', 'sku', 'name', 'price', 'foodProvider'], required: false },
            { model: ServiceProviders, attributes: ['id', 'legalName'], required: false },
        ];
        payload.group = ['id', 'ordersProductItems.id'];

        const user = req.user;
        payload = addOrderById(payload);
        const orders = await Orders.findAll(payload);
        const fileName = 'sales.xlsx';
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales');

        worksheet.columns = [
            { header: 'Order Id', key: 'A', width: 14 },
            { header: 'Kiosk', key: 'B', width: 30 },
            { header: 'Consumer', key: 'C', width: 14 },
            { header: 'Order Status', key: 'D', width: 16 },
            { header: 'SKU', key: 'E', width: 16 },
            { header: 'Item', key: 'F', width: 16 },
            { header: 'Price', key: 'G', width: 14 },
            { header: 'Discount', key: 'H', width: 14 },
            { header: 'Amount Paid', key: 'I', width: 16 },
            { header: 'Order Date', key: 'J', width: 16 },
            { header: 'Service Provider', key: 'K', width: 16 },
            { header: 'Food Provider', key: 'L', width: 16 }
        ];

        orders.forEach(order => {
            const menuItems = JSON.parse(JSON.stringify(order.ordersProductItems));
            menuItems.map(menuItem => {
                let discountedSum = menuItem.price;
                let discount = 0;
                const foodProvider = menuItem.foodProvider;
                if (order.discount) {
                    discountedSum = menuItem.price * ((100 - order.discount) / 100);
                    discountedSum = Math.round(discountedSum * 100) / 100;
                    discount = menuItem.price - discountedSum;
                }
                worksheet.addRow({
                    A: order.id,
                    B: order.kioskName,
                    C: order.consumerId,
                    D: order.orderStatus,
                    E: menuItem.sku,
                    F: menuItem.name,
                    G: menuItem.price,
                    H: discount,
                    I: discountedSum,
                    J: order.orderDate ? moment(order.orderDate).utcOffset(getSPTimeZone(req.user)).format('DD.MM.YYYY, HH:mm') : '-',
                    K: order.serviceProvider.legalName,
                    L: foodProvider
                });
            });
        });

        if (!user.isKerpakOperator) {
            worksheet.spliceColumns(11, 1);
            const sp = await ServiceProviders.findOne({ where: { id: user.serviceProviderId }, attributes: ['id', 'multiTenantSupport'] });
            if (!sp.multiTenantSupport) {
                worksheet.spliceColumns(11, 1);
            }
        }

        worksheet.getRow(1).font = { bold: true };
        worksheet.getCell('E2').alignment = { horizontal: 'left' };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);

        await workbook.xlsx.write(res);

        res.end();
    } catch (err) {
        log.error(err, 'itemTransfers::exportOrdersForSalesXLSX');
        return res.status(500).json({ message: 'Error in get XLSX' });
    }
};

module.exports.listForSales = async (req, res) => {
    try {
        let payload = getListPayload(req, false);
        payload.attributes = ['id', 'price'];
        payload.include = [
            {
                model: ServiceProviders, attributes: ['id', 'regionId'], required: false,
                include: [{ model: Regions, attributes: ['currencySymbol'], required: true }]
            },
        ];
        if (!payload.where) {
            payload.where = {};
        }
        payload.where.orderStatus = 'successful';
        const data = await Orders.findAll(payload);
        return res.json({ data });
    } catch (err) {
        log.error(err, 'order::controller::listForSales');
        return res.status(500).json({ message: 'Error in get orders list' });
    }
};

const getCardModel = paymentMethod => paymentMethod === PROVIDERS.ID_BANK ? Cards : StripeCards;

/**
 * @swagger
 * /order/{id}/consumer/{consumerId}:
 *   put:
 *     tags:
 *       - Orders
 *     summary: RePay the order
 *     description: 'Try to rePay the order'
 *     parameters:
 *      - in: path
 *        name: id
 *        description: order ID
 *        required: true
 *        type: number
 *      - in: path
 *        name: consumerId
 *        description: Consumer ID
 *        required: true
 *        type: number
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.rePay = async (req, res) => {
    const orderId = Number(req.params.id);
    const consumerId = Number(req.params.consumerId);
    const { bankClientId, region } = await Consumers.findOne({
        where: { id: consumerId },
        include: [
            { model: Regions, required: true },
        ]
    });
    if (region.isoCode !== 'am') {
        log.error('FORBIDDEN isoCode', 'order::rePay::isoCode');
        return res.status(403).json({ message: 'FORBIDDEN' });
    }
    if (!region.paymentMethod) {
        log.error('There are no supported payment methods in the region.', 'order::rePay::noPaymentMethod');
        return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
    }
    const order = await Orders.findOne({
        where: {
            consumerId: consumerId,
            orderStatus: 'pending',
            id: orderId
        },
        include: [
            { model: ServiceProviders }
        ]
    });

    if (!order) {
        log.error('default card not found', 'order::rePay::not order found');
        return res.status(404).json({ message: 'not order found' });
    }
    if (region.id !== order.serviceProvider.regionId) {
        log.error('Forbidden. User region does not match with sp region.', 'order::rePay::regionsMismatches');
        return res.status(403).json({ message: 'Forbidden. User region does not match with sp region.' });
    }
    const defaultCard = await Cards.findOne({
        where: {
            consumerId: consumerId, active: true, isDefault: true
        }
    });
    if (!defaultCard) {
        updateOrder();
        log.error('default card not found', 'order::rePay::default card not found');
        return res.status(500).json({ message: 'default card not found' });
    }
    const bindingId = defaultCard.bindingId;
    const totalSum = order.price - order.usedBalance;
    const orderDescription = `Kerpak - ${order.serviceProvider.legalName}`;
    const transactionId = await getTransactionId();
    const orderPayload = {
        orderNumber: transactionId,
        amount: calculatePrice(totalSum),
        clientId: bankClientId,
        returnUrl: BINDING_RETURN_URL,
        description: orderDescription,
        currency: region.currencyCode, // NOTE: allow only IDRAM (AM) for current step (need to update when integrate STRIPE).
        language: region.language,
        pageView: PAGE_VIEW.DESKTOP,
        bindingId: bindingId,
        useBinding: true,
    };
    let response;
    try {
        const client = Gateways.create(IDBANK, getSPAuthSettings(order.serviceProvider.id));
        response = await client.payOrder(orderPayload);
    } catch (err) {
        log.error(err, 'order::rePay::payOrder');
        return res.status(500).json({ hasError: true, err: err });
    }
    const transactionData = {
        clientId: bankClientId,
        transactionId,
        paymentType: TYPE.BANK_CARD,
        paymentProvider: PROVIDERS.ID_BANK,
        amount: totalSum,
        orderId,
        description: orderDescription,
        serviceProviderId: order.serviceProvider.id,
        mdOrder: response.register?.orderId,
    };
    if (response.hasError) {
        await createTransaction(transactionData, response, PROVIDERS.ID_BANK, true);
        if (response.register?.orderId) {
            await Orders.update(
                { bankOrderId: response.register.orderId },
                { where: { id: order.id } }
            );
        }
        log.error(response, 'order::rePay::payOrder::hasError');
        addNotEnoughMoneyMsg(response);
        return res.status(500).json({...response, orderId: order.id});
    }
    await createTransaction(transactionData, response, PROVIDERS.ID_BANK);
    await updateOrder(order.id, 'completed', 'successful', null, response.register.orderId);
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
                serviceProviderId: order.serviceProvider.id,
            }
        });
        if (menuItem) {
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
    }
    return res.json({ success: true });
};

/**
 * @swagger
 * /order/pay:
 *   put:
 *     tags:
 *       - Orders
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
 *               consumerId:
 *                 type: number
 *               cardId:
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
 *      - cookieAuth: []
 */
module.exports.pay = async (req, res) => {
    try {
        let params;
        try {
            params = await isSchemeValid(ordersValidator.payFromWeb, { ...req.body });
        } catch (err) {
            loggerValidations.error(err, 'order::manualPay::validation');
            return res.status(400).json({ err, message: 'validation error' });
        }
        const { consumerId, kioskId, cardId, productItems, sessionId, useBalance } = params;
        const consumer = await Consumers.findOne({
            where: { id: consumerId },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (consumer.region.isoCode !== 'am') {
            log.error('FORBIDDEN isoCode', 'order::manualPay::isoCode');
            return res.status(403).json({ message: 'FORBIDDEN' });
        }
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'order::manualPay::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        const kiosk = await Kiosks.findOne({
            where: { id: kioskId },
            include: [{ model: ServiceProviders, required: true }]
        });
        if (!kiosk) {
            log.error('Kiosk not found', 'order::manualPay::kioskNotFound');
            return res.status(404).json({ message: 'Kiosk not found' });
        }
        if (consumer.region.id !== kiosk.serviceProvider.regionId) {
            log.error('Forbidden. User region does not match with sp region.', 'order::manualPay::regionsMismatches');
            return res.status(403).json({ message: 'Forbidden. User region does not match with sp region.' });
        }
        const cardModel = getCardModel(consumer.region.paymentMethod);
        const selectedCard = await cardModel.findOne({
            where: {
                consumerId: consumer.id, id: cardId,
                paymentType: TYPE.BANK_CARD
            }
        });
        if (!selectedCard) {
            log.error('selected card not found', 'order::manualPay::getCard');
            return res.status(500).json({ message: 'card not found' });
        }

        const totalSumObj = await calculateTotalPrice(consumer.id, productItems, kiosk, false);
        if (totalSumObj.success === false) {
            log.error(totalSumObj, 'order::manualPay::calculateTotalPrice');
            return res.status(404).json({ totalSumObj });
        }
        const { totalSum, productItemsArray } = totalSumObj;
        let orderTotalSum = totalSum;
        if (useBalance) {
            if (consumer.balance <= 0) {
                log.error({ consumerId: consumer.id }, 'order::manualPay::positiveBalance');
                return res.status(404).json({ error: 'You have not positive balance', success: false });
            } else if (totalSum <= consumer.balance) {
                const successData = await handleSuccessFullBalanceOrder(consumer, totalSumObj, sessionId, kiosk, selectedCard, productItemsArray, req.user.id, req.user.email);
                return res.json({ success: true, orderId: successData.orderId });
            } else {
                orderTotalSum = totalSum - consumer.balance;
                totalSumObj.usedBalance = consumer.balance;
            }
        } else {
            totalSumObj.usedBalance = 0;
        }
        const order = await createOrder(kiosk.serviceProvider, totalSumObj, consumer.id, kiosk, selectedCard, productItemsArray, sessionId, null, null, null, consumer.region.paymentMethod);

        if (order.success === false) {
            log.error(order, 'order::manualPay::createOrder');
            return res.status(500).json({ message: 'could not create order' });
        }
        if (sessionId) {
            await updateSession(order.orderId, sessionId);
        }
        if (useBalance) {
            await addBalanceHistory(order.orderDate, consumer.id, consumer.phone, consumer.balance, totalSum, order.orderId, req.user.id, req.user.email);
        }

        const transactionId = await getTransactionId();
        const orderPayload = await payHelper.pay.payload({
            transactionId,
            amount: orderTotalSum,
            serviceProvider: kiosk.serviceProvider,
            defaultCard: selectedCard,
            consumer,
            orderId: order.orderId,
            kioskName: kiosk.displayName
        });

        let response;
        const client = getBankClient(consumer.region.paymentMethod, kiosk.serviceProvider.id);
        try {
            response = await client.payOrder(orderPayload);
        } catch (err) {
            log.error(err, 'order::manualPay::payOrder');
            return res.status(500).json({ hasError: true, err: err });
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
                consumer
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
        await handleSuccessOrder(updatedOrder.orderDate, updatedOrder.kioskId, order.orderId, consumer.id, productItemsArray);
        return res.json({ success: true, orderId: order.orderId });
    } catch (err) {
        log.error(err, 'order::manualPay::server error');
        return res.status(500).json({ message: 'Error in manual pay' });
    }
};

/**
 * @swagger
 * /order/{id}/refund:
 *   put:
 *     tags:
 *       - Orders
 *     summary: Refund the order
 *     description: 'Try to refund the order'
 *     parameters:
 *      - in: path
 *        name: id
 *        description: order ID
 *        required: true
 *        type: number
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               balanceType:
 *                 balanceType: string
 *               balanceAmount:
 *                 type: number
 *               bankAmount:
 *                 type: number
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.refund = async (req, res) => {
    let transaction;
    try {
        try {
            await isSchemeValid(ordersValidator.refund, req.body);
            if (!req.body.balanceAmount && !req.body.bankAmount) {
                throw ('validation error. invalid balance');
            }
        } catch (err) {
            loggerValidations.error(err, 'order::refund::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        const orderId = Number(req.params.id);
        const order = await Orders.findOne({
            where: {
                id: orderId
            },
            attributes: {
                include: [
                    [Sequelize.fn('SUM', Sequelize.col('refundBank')), 'totalRefundBank'],
                    [Sequelize.fn('SUM', Sequelize.col('refundBalance')), 'totalRefundBalance']
                ]
            },
            group: ['ordersRefunds.id'],
            include: [
                {
                    model: ServiceProviders,
                    required: true,
                },
                {
                    model: OrdersRefund,
                    attributes: []
                }
            ],
        });
        if (!order) {
            log.error('order not found', 'order::refund::order not found');
            return res.status(409).json({ message: 'Order not found' });
        }
        const consumerId = order.consumerId;
        const { phone, firebaseRegistrationToken, region } = await Consumers.findOne({
            where: { id: consumerId },
            include: [
                { model: Regions, required: true },
            ]
        });
        if (region.isoCode !== 'am') {
            log.error('FORBIDDEN isoCode', 'order::refund::isoCode');
            return res.status(403).json({ message: 'FORBIDDEN' });
        }
        if (!region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'order::refund::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        if (region.id !== order.serviceProvider.regionId) {
            log.error('Forbidden. User region does not match with sp region.', 'order::refund::regionsMismatches');
            return res.status(403).json({ message: 'Forbidden. User region does not match with sp region.' });
        }
        const { balanceType, balanceAmount, bankAmount } = req.body;
        const refundAmount = balanceAmount + bankAmount;
        if (order.orderStatus !== 'successful' || order.refund >= order.price) {
            log.error('invalid data', 'order::refund::invalidData::order refund is impossible');
            return res.status(409).json({ success: false, message: 'Forbidden. order refund is impossible for current state.' });
        }
        if (balanceType !== 'refund' || refundAmount > order.price - order.refund) {
            log.error('Invalid data', 'order::refund::invalidData');
            return res.status(409).json({ success: false, message: 'Invalid data' });
        }

        if (bankAmount > 0) {
            if (!order.bankOrderId) {
                log.error('can\'t refund to the bank. don\'t have a bank order ID', 'order::refund::invalidAmount::don\'t have a bank order ID');
                return res.status(409).json({ success: false, message: 'can\'t refund to the bank. don\'t have a bank order ID' });
            }
            if (bankAmount > order.price - order.usedBalance - (order.totalRefundBank || 0)) {
                log.error('Refund amount can’t be more than the billed amount', 'order::refund::invalidAmount');
                return res.status(409).json({ success: false, message: `Refund amount can’t be more than the billed amount ${order.price - order.usedBalance - (order.totalRefundBank || 0)}` });
            }
            const client = getBankClient(region.paymentMethod, order.serviceProvider.id);
            let refundResponse;
            const bankOrderData = await payHelper.refund.getBankOrderId(region.paymentMethod, { client, orderId: order.bankOrderId, stripeAccount: order.serviceProvider.stripeId });
            if (!bankOrderData.success) {
                return res.status(500).json(bankOrderData);
            }
            const orderPayload = payHelper.refund.payload({
                amount: bankAmount,
                region,
                bankOrderId: bankOrderData.bankOrderId,
                stripeAccount: order.serviceProvider.stripeId
            });
            try {
                refundResponse = await client.refundOrder(orderPayload);
            } catch (err) {
                log.error(err, 'order::refund::refundOrder');
                return res.status(500).json({ hasError: true, err: err, orderId: order.id });
            }
            const transactionId = await getTransactionId();
            const orderDescription = `Kerpak - ${order.serviceProvider.legalName}`;
            const transactionData = {
                transactionId,
                paymentType: TYPE.BANK_CARD,
                paymentProvider: region.paymentMethod,
                amount: bankAmount,
                orderId: order.id,
                description: orderDescription,
                serviceProviderId: order.serviceProvider.id,
                mdOrder: order.bankOrderId,
            };
            if (refundResponse.hasError) {
                await createTransaction(transactionData, refundResponse, region.paymentMethod, true);
                log.error(refundResponse, 'order::refund::refundOrder::hasError');
                return res.status(500).json({...refundResponse, orderId: order.id});
            }
            await createTransaction(transactionData, refundResponse, region.paymentMethod);
        }
        transaction = await sequelize.transaction();
        if (balanceAmount > 0) {
            await Consumers.update(
                { balance: sequelize.literal(`balance + ${balanceAmount}`) },
                { where: { id: consumerId }, transaction }
            );
            const balanceHistoryPayload = {
                userId: req.user.id,
                userEmail: req.user.email,
                consumerId: consumerId,
                balance: balanceAmount,
                consumerPhone: phone,
                type: balanceType,
                date: new Date(),
                orderId: orderId
            };
            await BalanceHistary.create(balanceHistoryPayload, { transaction });
        }
        await Orders.update({ refund: sequelize.literal(`refund + ${refundAmount}`) }, { where: { id: orderId }, transaction });
        await OrdersRefund.create({
            userId: req.user.id,
            orderId: orderId,
            refundBalance: balanceAmount,
            refundBank: bankAmount
        }, { transaction });
        await transaction.commit();
        if (firebaseRegistrationToken) {
            const template = fs.readFileSync(path.resolve('app/helpers/notifications/templates/refund.txt'), 'utf8').toString();
            await sendNotification(null, pupa(template, { refundAmount, currency: region.currencyName }), [firebaseRegistrationToken]);
        }
        return res.json({ success: true });
    } catch (err) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (errRollback) {
                log.error(errRollback, 'order::refund::rollback');
            }
        }
        log.error(err, 'order::refund::server error');
        return res.status(500).json({ success: false });
    }
};

/**
 * @swagger
 * /order/{id}/status:
 *   put:
 *     tags:
 *       - Orders
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
 *      - cookieAuth: []
 */
module.exports.status = async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const order = await Orders.findOne({
            where: {
                orderStatus: 'pending',
                id: orderId
            },
            include: [
                { model: ServiceProviders }
            ]
        });

        if (!order) {
            log.error('pending order not found', 'order::status::not order found');
            return res.status(404).json({ message: 'not order found' });
        }
        const mdOrder = order.bankOrderId;
        const consumerId = order.storedConsumerId;
        const { region } = await Consumers.findOne({
            where: { id: consumerId },
            include: [
                { model: Regions, required: true },
            ]
        });
        if (region.isoCode !== 'am') {
            log.error('FORBIDDEN isoCode', 'order::controller::isoCode');
            return res.status(403).json({ message: 'FORBIDDEN' });
        }
        if (!region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'order::status::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        if (region.id !== order.serviceProvider.regionId) {
            log.error('Forbidden. User region does not match with sp region.', 'order::status::regionsMismatches');
            return res.status(403).json({ message: 'Forbidden. User region does not match with sp region.' });
        }
        let orderRes;
        try {
            const client = Gateways.create(IDBANK, getSPAuthSettings(order.serviceProviderId));
            orderRes = await client.getOrderStatus({ orderId: mdOrder, useBinding: true });
        } catch (err) {
            log.error(err, 'order::status::getOrderStatus');
            return res.status(500).json({ hasError: true, err: err });
        }
        const serviceProvider = await ServiceProviders.findOne({ where: { id: order.serviceProviderId } });
        const orderDescription = `Kerpak - ${serviceProvider.legalName}`;
        const transactionId = await getTransactionId();
        const transactionData = {
            transactionId,
            paymentType: TYPE.BANK_CARD,
            paymentProvider: PROVIDERS.ID_BANK,
            amount: order.price - order.usedBalance,
            orderId: order.id,
            description: orderDescription,
            serviceProviderId: order.serviceProviderId,
            mdOrder,
        };
        if (!orderRes.hasError && orderRes.data?.orderStatus === 2) {
            await createTransaction(transactionData, orderRes, PROVIDERS.ID_BANK);
            await updateOrder(orderId, 'completed', 'successful');
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
                        archived: false
                    }
                });
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
            return res.json({ success: true, status: 'successful' });
        }
        await createTransaction(transactionData, orderRes, PROVIDERS.ID_BANK, true);
        log.error(orderRes, 'order::status::orderRes');
        return res.json({ success: true, status: 'pending', message: orderRes.errorMessage, mdOrder });
    } catch (err) {
        log.error(err, 'order::status::server error');
        return res.status(500).json({ success: false });
    }
};

/**
 * @swagger
 * /order/{id}/cancel:
 *   put:
 *     tags:
 *       - Orders
 *     summary: Cancel order
 *     description: 'Cancel order'
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
 *      - cookieAuth: []
 */
module.exports.cancel = async (req, res) => {
    let transaction;
    try {
        const orderId = Number(req.params.id);
        const order = await Orders.findOne({
            where: {
                orderStatus: 'pending',
                id: orderId
            },
            include: [
                { model: Consumers, attributes: ['id', 'phone'], include: [{ model: Regions, required: true }] },
                { model: ServiceProviders }
            ]
        });

        if (!order) {
            log.error('pending order not found', 'order::cancel::order not found');
            return res.status(404).json({ message: 'Order not found' });
        }
        if (!order.consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'order::cancel::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }

        if (order.consumer.region.id !== order.serviceProvider.regionId) {
            log.error('Forbidden. User region does not match with sp region.', 'order::cancel::regionsMismatches');
            return res.status(403).json({ message: 'Forbidden. User region does not match with sp region.' });
        }

        transaction = await sequelize.transaction();
        if (order.usedBalance && order.consumer) {
            await Consumers.update(
                { balance: sequelize.literal(`balance + ${order.usedBalance}`) },
                { where: { id: order.consumer.id }, transaction }
            );
            await BalanceHistary.create(
                {
                    orderId: order.id,
                    userId: req.user.id,
                    userEmail: req.user.email,
                    consumerId: order.consumer.id,
                    balance: order.usedBalance,
                    consumerPhone: order.consumer.phone,
                    type: 'returned',
                    date: new Date()
                },
                { transaction }
            );
        }

        await Orders.update(
            { orderStatus: 'canceled', purchaseStatus: 'cancelled' },
            { where: { id: order.id }, transaction }
        );
        await transaction.commit();
        return res.json({ success: true, message: 'Order canceled successfully' });
    } catch (err) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (errRollback) {
                log.error(errRollback, 'order::cancel::rollback');
            }
        }
        log.error(err, 'order::cancel::server error');
        return res.status(500).json({ success: false });
    }
};

/**
 * @swagger
 * /order/{id}/refund:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get refund history
 *     description: ''
 *     parameters:
 *       - name: id
 *         in: path
 *         description: order ID
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
module.exports.getRefundHistory = async (req, res) => {
    try {
        const orderId = req.params.id;
        const orders = await OrdersRefund.findAll({
            where: { orderId },
            attributes: [
                [Sequelize.fn('SUM', Sequelize.col('refundBank')), 'totalRefundBank'],
                [Sequelize.fn('SUM', Sequelize.col('refundBalance')), 'totalRefundBalance']
            ]
        });
        return res.json({ ...orders[0].dataValues });
    } catch (err) {
        log.error(err, 'order::controller::getRefundHistory');
        return res.status(500).json({ message: 'Error in get refound history' });
    }
};