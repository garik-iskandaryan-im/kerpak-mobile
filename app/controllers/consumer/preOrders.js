const Gateways = require('easy-payment');
const IDBANK = require('@easy-payment/idbank').gateway;
const {
    preOrders: PreOrders,
    preOrdersDetails: PreOrdersDetails,
    kiosks: Kiosks,
    serviceProviders: ServiceProviders,
    consumers: Consumers,
    cards: Cards,
    orders: Orders,
    balanceHistary: BalanceHistary,
    regions: Regions,
    sequelize,
    Sequelize
} = require('app/models/models');
const moment = require('moment');
const settings = require('app/settings');
const { PRE_ORDER_STATUS } = require('app/constants');
const { preOrders: preOrdersValidator } = require('app/schemes');
const { isSchemeValid } = require('app/helpers/validate');
const { sendEmail, getPreOrderEmailBody, getPreOrderDeclineEmailBody } = require('app/helpers/email/adapters/aws');
const { getSPUsersEmails, getOperatorsEmails } = require('app/helpers/email/service');
const { getSPAuthSettings } = require('app/services/payment');
const { calculateTotalPriceForPreOrder, handleSuccessPreOrder, getTransactionId, createTransaction } = require('app/services/order');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');
const { PAGE_VIEW } = require('app/constants');
const { calculatePrice } = require('app/controllers/common');
const { addNotEnoughMoneyMsg } = require('app/helpers/utils');

const getDayName = (dayNumber) => {
    switch (dayNumber) {
        case 0: return 'deliverySunday';
        case 1: return 'deliveryMonday';
        case 2: return 'deliveryTuesday';
        case 3: return 'deliveryWednesday';
        case 4: return 'deliveryThursday';
        case 5: return 'deliveryFriday';
        case 6: return 'deliverySaturday';
    }
};

const setDates = (dateCopy, hours, minute) => {
    let newDate = new Date(dateCopy);
    newDate.setHours(hours);
    newDate.setMinutes(minute);
    return newDate;
};

const calculateExpectedDeliveryDate = (kiosk) => {
    const dateNow = new Date();
    dateNow.setHours(new Date().getHours() + kiosk.deliveryMinAllowedTime);
    const splittedTransferTimeFrom = new Date(kiosk.deliveryTransferTimeFrom);
    const splittedTransferTimeTo = new Date(kiosk.deliveryTransferTimeTo);
    const transferToDate = setDates(dateNow, splittedTransferTimeFrom.getHours(), splittedTransferTimeFrom.getMinutes());
    const nextDay = 24;
    let weekDaysCount = 0;

    while (weekDaysCount < 8) {
        if (kiosk[getDayName(dateNow.getDay())]) {
            if ((weekDaysCount === 0 && dateNow.getTime() <= transferToDate.getTime()) || (weekDaysCount !== 0)) {
                return setDates(dateNow, splittedTransferTimeTo.getHours(), splittedTransferTimeTo.getMinutes());
            }
        }
        dateNow.setHours(dateNow.getHours() + nextDay);
        weekDaysCount += 1;
    }
    return false;
};

const validateExpectedDeliveryDate = (expectedDeliveryDate, calculatedDateValue, kiosk) => {
    let expectedDate = moment(new Date(expectedDeliveryDate)).format('YYYY-MM-DDTHH:mm');
    let calculatedDate = moment(new Date(calculatedDateValue)).format('YYYY-MM-DDTHH:mm');
    if (kiosk[getDayName(new Date(expectedDeliveryDate).getDay())]) {
        if (moment(expectedDate).isSame(calculatedDate)) {
            return true;
        }
        return false;
    }
    return false;
};

const sendPreOrderCreateEmail = async (kiosk, preOrderID, expectedDeliveryDate, serviceProvider) => {
    const { displayName, serviceProviderId, deliveryTransferTimeFrom, deliveryTransferTimeTo } = kiosk;
    const emailTitle = `Kerpak | ${displayName} | New order for delivery`;
    const detailsLink = settings.paths.preOrderDetails.replace(':id', preOrderID);
    const timezone = serviceProvider.timezone;
    const body = getPreOrderEmailBody(displayName, detailsLink, expectedDeliveryDate, deliveryTransferTimeFrom, deliveryTransferTimeTo, timezone);
    const emails = await getSPUsersEmails(serviceProviderId, false);
    const bccEmails = await getOperatorsEmails();
    await sendEmail(emails, bccEmails, emailTitle, body, settings.s3.SES.NOREPLY);
};

const sendPreOrderReverseEmail = async (preOrder) => {
    const emailTitle = `Kerpak | ${preOrder.kiosk.displayName} | Order for delivery was cancelled`;
    const detailsLink = settings.paths.preOrderDetails.replace(':id', preOrder.id);
    const body = getPreOrderDeclineEmailBody(preOrder.kiosk.displayName, detailsLink);
    const toEmails = await getSPUsersEmails(preOrder.serviceProviderId, false);
    const bccEmails = await getOperatorsEmails();
    await sendEmail(toEmails, bccEmails, emailTitle, body, settings.s3.SES.NOREPLY);
};

const getPreOrderData = async (consumer, payload, kiosk, calculatedDateValue, bankOrderId, totalSumObj, card, fullBalance = false, paymentMethod) => {
    const { totalSum, itemsWithCount, itemsArray, productItemsArray, discountSum, discount } = totalSumObj;
    const usedBalance = fullBalance ? totalSum : totalSumObj.usedBalance || 0;
    const { address1, address2, city, state, serviceProvider } = kiosk;
    const orderDetails = JSON.stringify({
        purchaseStatus: 'pending',
        orderStatus: 'pending',
        price: totalSum,
        serviceProviderId: serviceProvider.id,
        storedSPId: serviceProvider.id,
        consumerId: consumer.id,
        storedConsumerId: consumer.id,
        kioskId: kiosk.id,
        storedKioskId: kiosk.id,
        firstPurchaseDiscount: 0,
        timeDiscountAmount: 0,
        discount,
        discountSum,
        deliveryDiscountAmount: discount,
        ordersProductItems: productItemsArray,
        productsCount: productItemsArray.length,
        kioskName: kiosk.displayName,
        kioskAddress: (`${address1}, ` + (address2 ? `${address2}, ` : '') + `${city}, ` + `${state}`),
        SPName: serviceProvider.legalName,
        maskedPan: card.maskedPan.replace(card.maskedPan.substring(2, 8), '******'),
        cardHolderName: card.cardHolderName,
        sessionId: null,
        hasDoubleSold: false,
        usedBalance: usedBalance,
        bankOrderId: bankOrderId,
        paymentMethod,
        paymentType: settings.payment.TYPE.BANK_CARD
    });
    return {
        consumerId: consumer.id,
        kioskId: payload.kioskId,
        serviceProviderId: kiosk.serviceProvider.id,
        expectedDeliveryDate: calculatedDateValue,
        orderDate: Date.now(),
        totalPrice: totalSum,
        itemsWithCount,
        bankOrderId: bankOrderId,
        preOrdersDetail: {
            comment: payload.comment,
            orderDetails,
            items: JSON.stringify(itemsArray),
        },
        usedBalance: usedBalance,
        discountAmount: discount,
        discountSum,
        status: PRE_ORDER_STATUS.default,
        kioskDeliveryTransferTimeFrom: kiosk.deliveryTransferTimeFrom,
        storedConsumerName: `${consumer.firstName} ${consumer.lastName}`
    };
};

const createCanceledOrder = async (preOrderId, transaction) => {
    try {
        const preOrderDetails = await PreOrdersDetails.findOne({ where: { preOrderId } });
        const orderDetails = JSON.parse(preOrderDetails.orderDetails);
        orderDetails.purchaseStatus = 'cancelled';
        orderDetails.orderStatus = 'canceled';
        orderDetails.orderDate = Date.now();
        const orderDetailsStr = JSON.stringify(orderDetails).replace(/\\/g, '');
        await PreOrdersDetails.update({ orderDetails: orderDetailsStr }, { where: { preOrderId }, transaction });
        const order = await Orders.create(orderDetails, { include: [{ association: Orders.associations.ordersProductItems }], transaction });
        return { order, success: true };
    } catch (err) {
        log.error(err, 'preOrder::controller::createCanceledOrder');
        return { success: false, message: 'Could not create order.' }
    }
};

/**
* @swagger
* /mobile/preOrders:
*   post:
*     tags:
*       - Mobile APIs
*     summary: Create pre order
*     description: ''
*     requestBody:
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               kioskId:
*                 type: number
*               price:
*                 type: number
*               comment:
*                 type: string
*               expectedDeliveryDate:
*                 type: string
*                 format: date-time
*               useBalance:
*                 type: boolean
*               productItems:
*                 type: array
*                 items:
*                    type: object
*                    properties:
*                      barcode:
*                        type: string
*                      count:
*                        type: integer
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
        const payload = { ...req.body };
        try {
            await isSchemeValid(preOrdersValidator.create, payload);
        } catch (err) {
            loggerValidations.error(err, 'preOrder::create::validation');
            return res.status(409).json({err, message: 'Validation error.' });
        }
        const consumer = await Consumers.findOne({
            where: { id: req.user.id },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (!consumer) {
            log.error('Consumer not found', 'preOrder::create::consumer');
            return res.status(409).json({ message: 'Consumer not found' });
        }
        if (consumer.region.isoCode !== 'am') {
            log.error('FORBIDDEN isoCode', 'preOrder::controller::isoCode');
            return res.status(403).json({ message: 'FORBIDDEN' });
        }
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'preOrder::create::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        const defaultCard = await Cards.findOne({ where: { consumerId: req.user.id, active: true, isDefault: true, paymentType: settings.payment.TYPE.BANK_CARD } });
        if (!defaultCard) {
            log.error('Default card not found', 'preOrder::create::defaultCard');
            return res.status(500).json({ message: 'Default card not found' });
        }
        const bindingId = defaultCard.bindingId;

        const card = {
            maskedPan: defaultCard.maskedPan,
            cardHolderName: 'initial value' //todo
        };

        const kiosk = await Kiosks.findOne({
            where: {
                id: payload.kioskId,
                deliveryIsKioskAllow: true
            },
            include: [
                { model: ServiceProviders },
            ]
        });

        if (!kiosk) {
            log.error('Kiosk not found or does not support delivery.', 'preOrder::create::kiosk');
            return res.status(404).json({ message: 'Kiosk not found or does not support delivery.' });
        }

        if (consumer.region.id !== kiosk.serviceProvider.regionId) {
            log.error('Forbidden. User region does not match with sp region.', 'preOrder::create::regionsMismatches');
            return res.status(403).json({ message: 'Forbidden. User region does not match with sp region.' });
        }

        // validations
        if (!kiosk.serviceProvider.isSpAllowDelivery) {
            log.error('Forbidden. Selected SP does not allow delivery.', 'preOrder::create::sp::notAllowDelivery');
            return res.status(403).json({ message: 'Forbidden. Selected SP does not allow delivery.' });
        }
        const calculatedDateValue = calculateExpectedDeliveryDate(kiosk);
        if (!calculatedDateValue) {
            log.error('Missing days of deliveries in kiosk', 'preOrder::create::kiosk::invalidDate');
            return res.status(409).json({ message: 'Missing days of deliveries in kiosk' });
        } else if (!validateExpectedDeliveryDate(payload.expectedDeliveryDate, calculatedDateValue, kiosk)) {
            const expectedDate = moment(calculatedDateValue).format('ddd MMM DD YYYY HH:mm ZZ');
            log.error(`Calculated invalid delivery date.The expected delivery date must be ${expectedDate}`, 'preOrder::create::validateExpectedDeliveryDate');
            return res.status(409).json({ message: `Calculated invalid delivery date.The expected delivery date must be ${expectedDate}` });
        }

        const totalSumObj = await calculateTotalPriceForPreOrder(payload, kiosk);
        if (totalSumObj.success === false) {
            log.error(totalSumObj, 'preOrder::create::calculateTotalPriceForPreOrder');
            return res.status(409).json({ totalSumObj });
        }
        const { totalSum } = totalSumObj;
        if (payload.price && totalSum !== payload.price) {
            log.error(`Calculated invalid price.The expected price must be ${totalSum}`, 'preOrder::create::invalidPrice');
            return res.status(409).json({ message: `Calculated invalid price.The expected price must be ${totalSum}` });
        }

        const { id: consumerId, bankClientId, balance, phone } = consumer;
        let orderTotalSum = totalSum;
        const { useBalance } = payload;

        if (useBalance) {
            if (balance <= 0) {
                log.error({ consumerId }, 'preOrder::create::positiveBalance');
                return res.status(409).json({ error: 'You have not positive balance', success: false });
            } else if (totalSum <= balance) {
                const preOrder = await getPreOrderData(consumer, payload, kiosk, calculatedDateValue, null, totalSumObj, card, true, settings.payment.PROVIDERS.FULL_BALANCE);
                let transaction;
                try {
                    transaction = await sequelize.transaction();
                    const { id: preOrderID } = await PreOrders.create(preOrder, {
                        include: [
                            { association: PreOrders.associations.preOrdersDetail },
                        ],
                        transaction
                    });
                    await Consumers.update(
                        { balance: sequelize.literal(`balance - ${totalSum}`) },
                        {
                            where: { id: consumerId },
                            transaction
                        }
                    );

                    await BalanceHistary.create(
                        {
                            consumerId,
                            consumerPhone: phone,
                            type: 'spent',
                            date: Date.now(),
                            balance: totalSum,
                            preOrderId: preOrderID
                        },
                        { transaction }
                    );
                    if (!kiosk.serviceProvider.havePreOrder) {
                        await ServiceProviders.update(
                            { havePreOrder: true },
                            {
                                where: { id: kiosk.serviceProvider.id },
                                transaction
                            }
                        );
                    }
                    await transaction.commit();
                    await sendPreOrderCreateEmail(kiosk, preOrderID, preOrder.expectedDeliveryDate, kiosk.serviceProvider);
                    return res.json({ success: true, preOrderID });
                } catch (err) {
                    if (transaction) {
                        try {
                            await transaction.rollback();
                        } catch (errRollback) {
                            log.error(errRollback, 'preOrder::create::rollback');
                        }
                    }
                    log.error(err, 'preOrder::create::server error');
                    return res.status(500).json({ message: 'Could not create preOrder.' });
                }
            } else {
                orderTotalSum = totalSum - balance;
                totalSumObj.usedBalance = balance;
            }
        } else {
            totalSumObj.usedBalance = 0;
        }
        // Freeze pre order
        const orderDescription = `Kerpak - ${kiosk.serviceProvider.legalName}`;
        const transactionId = await getTransactionId();
        const orderPayloadFreeze = {
            orderNumber: transactionId,
            amount: calculatePrice(orderTotalSum),
            clientId: bankClientId,
            returnUrl: 'kerpak.com',
            description: orderDescription,
            currency: consumer.region.currencyCode, // NOTE: allow only IDRAM (AM) for current step (need to update when integrate STRIPE).
            language: consumer.region.language,
            pageView: PAGE_VIEW.DESKTOP,
            bindingId,
            useBinding: true,
        };
        let freezedOrder;
        const client = Gateways.create(IDBANK, getSPAuthSettings(kiosk.serviceProvider.id));
        try {
            freezedOrder = await client.freezeOrder(orderPayloadFreeze);
        } catch (err) {
            log.error(err, 'preOrder::create::freezeOrder');
            return res.status(500).json({ hasError: true, err: err });
        }
        const transactionData = {
            clientId: bankClientId,
            transactionId,
            paymentType: settings.payment.TYPE.BANK_CARD,
            paymentProvider: settings.payment.PROVIDERS.ID_BANK,
            amount: orderTotalSum,
            description: orderDescription,
            serviceProviderId: kiosk.serviceProvider.id,
            mdOrder: freezedOrder.registerPreAuth?.orderId,
        };
        addNotEnoughMoneyMsg(freezedOrder);
        if (freezedOrder.hasError) {
            await createTransaction(transactionData, freezedOrder, settings.payment.PROVIDERS.ID_BANK, true);
            log.error(freezedOrder, 'preOrder::create::freezeOrder::hasError');
            return res.status(500).json(freezedOrder);
        }
        await createTransaction(transactionData, freezedOrder, settings.payment.PROVIDERS.ID_BANK);
        const preOrder = await getPreOrderData(consumer, payload, kiosk, calculatedDateValue, freezedOrder.registerPreAuth.orderId, totalSumObj, card, null, settings.payment.PROVIDERS.ID_BANK);
        let preOrderID = null;
        let transaction;
        try {
            transaction = await sequelize.transaction();
            const { id } = await PreOrders.create(preOrder, {
                include: [
                    { association: PreOrders.associations.preOrdersDetail },
                ],
                transaction
            });
            preOrderID = id;
            if (useBalance) {
                await Consumers.update(
                    { balance: 0 },
                    {
                        where: { id: consumerId },
                        transaction
                    }
                );
                await BalanceHistary.create(
                    {
                        consumerId,
                        consumerPhone: phone,
                        type: 'spent',
                        date: Date.now(),
                        balance: totalSumObj.usedBalance,
                        preOrderId: preOrderID
                    },
                    { transaction }
                );
            }
            await transaction.commit();
        } catch (err) {
            if (transaction) {
                try {
                    await transaction.rollback();
                } catch (errRollback) {
                    log.error(errRollback, 'preOrder::createPreOrder::rollback');
                }
            }
            log.error(err, 'preOrder::createPreOrder');
            try {
                const reverseResponse = await client.reverseOrderProfile({
                    orderId: freezedOrder.registerPreAuth.orderId,
                    currency: consumer.region.currencyCode, // NOTE: allow only IDRAM (AM) for current step (need to update when integrate STRIPE).
                    language: consumer.region.language
                });
                if (reverseResponse.hasError) {
                    log.error(reverseResponse, 'preOrder::create::reverseOrderProfile::hasError');
                }
            } catch (err) {
                log.error(err, 'preOrder::create::payOrder::reverseOrderProfile');
                return res.status(500).json({ hasError: true, err: err });
            }
            return res.status(500).json({ message: 'Could not create preOrder.' });
        }
        if (!kiosk.serviceProvider.havePreOrder) {
            await ServiceProviders.update({ havePreOrder: true }, { where: { id: kiosk.serviceProvider.id } });
        }
        await sendPreOrderCreateEmail(kiosk, preOrderID, preOrder.expectedDeliveryDate, kiosk.serviceProvider);
        return res.json({ success: true, preOrderID });
    } catch (err) {
        log.error(err, 'preOrder::create::server error');
        return res.status(500).json({ message: 'Could not create preOrder.' });
    }
};

/**
 * @swagger
 * /mobile/preOrders/scan:
 *   put:
 *     tags:
 *       - Mobile APIs
 *     summary: Check pre-order barcode
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: number
 *               kioskId:
 *                 type: number
 *               code:
 *                 type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.depositPreOrder = async (req, res) => {
    try {
        const payload = { ...req.body };
        try {
            await isSchemeValid(preOrdersValidator.pay, payload);
        } catch (err) {
            loggerValidations.error(err, 'preOrder::depositPreOrder::validation');
            return res.status(409).json({ message: 'Validation error.' });
        }
        const consumer = await Consumers.findOne({
            where: { id: req.user.id },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (!consumer) {
            log.error('Consumer not found', 'preOrder::depositPreOrder::consumer not found');
            return res.status(409).json({ message: 'Consumer not found' });
        }
        if (consumer.region.isoCode !== 'am') {
            log.error('FORBIDDEN isoCode', 'preOrder::depositPreOrder::isoCode');
            return res.status(403).json({ message: 'FORBIDDEN' });
        }
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'preOrder::depositPreOrder::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        const id = Number(payload.code.slice(1));

        const preOrder = await PreOrders.findOne({
            where: { id, kioskId: payload.kioskId },
            include: [
                { model: PreOrdersDetails, required: true },
            ]
        });
        if (!preOrder) {
            log.error(preOrder, 'preOrder::depositPreOrder::noPreOrder');
            return res.status(404).json({ message: 'Pre order not found' });
        }
        if (!PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status] || !PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status].consumerScanStatus) {
            log.error(preOrder, 'preOrder::depositPreOrder::invalidState');
            return res.status(403).json({ message: 'Forbidden. PreOrder deposit is impossible for current state.' });
        }
        if (preOrder.consumerId !== req.user.id) {
            log.error(preOrder, 'preOrder::depositPreOrder::invalidConsumer');
            return res.status(403).json({ message: 'Forbidden. Trying to buy another user\'s order.' });
        }
        const serviceProviderId = preOrder.serviceProviderId;
        const serviceProvider = await ServiceProviders.findOne({ where: { id: serviceProviderId } });

        if (consumer.region.id !== serviceProvider.regionId) {
            log.error('Forbidden. User region does not match with sp region.', 'preOrder::depositPreOrder::regionsMismatches');
            return res.status(403).json({ message: 'Forbidden. User region does not match with sp region.' });
        }
        const defaultCard = await Cards.findOne({
            where: {
                consumerId: req.user.id, active: true, isDefault: true, paymentType: settings.payment.TYPE.BANK_CARD
            }
        });

        if (!defaultCard) {
            log.error('default card not found', 'preOrder::depositOrder::defaultCard');
            return res.status(500).json({ message: 'default card not found' });
        }
        const orderInfo = JSON.parse(preOrder.preOrdersDetail.orderDetails);
        let orderTotalSum = preOrder.totalPrice;
        if (orderInfo.usedBalance) {
            if ((orderInfo.usedBalance === orderInfo.price) && !orderInfo.bankOrderId) {
                const { success, orderId, err } = await handleSuccessPreOrder(orderInfo, preOrder, consumer, payload.sessionId);
                if (success) {
                    return res.json({ success: true, orderId, preOrderId: preOrder.id });
                } else {
                    log.error(err, 'preOrder::depositOrder::createOrderFullBalance');
                    return res.status(500).json({ message: 'Order not processed.' });
                }
            } else if (orderInfo.usedBalance < orderInfo.price && orderInfo.bankOrderId) {
                orderTotalSum = orderInfo.price - orderInfo.usedBalance;
            }
        }
        const orderPayload = {
            orderId: preOrder.bankOrderId,
            amount: calculatePrice(orderTotalSum),
            currency: consumer.region.currencyCode, // NOTE: allow only IDRAM (AM) for current step (need to update when integrate STRIPE).
            language: consumer.region.language,
            pageView: PAGE_VIEW.DESKTOP,
        };
        let depositOrder;
        try {
            const client = Gateways.create(IDBANK, getSPAuthSettings(serviceProviderId));
            depositOrder = await client.depositOrder(orderPayload);
        } catch (err) {
            log.error(err, 'preOrder::depositPreOrder::depositOrder::depositOrder');
            return res.status(500).json({ hasError: true, err: err});
        }
        const orderDescription = `Kerpak - ${serviceProvider.legalName}`;
        const transactionId = await getTransactionId();
        const transactionData = {
            transactionId,
            paymentType: settings.payment.TYPE.BANK_CARD,
            paymentProvider: settings.payment.PROVIDERS.ID_BANK,
            amount: orderTotalSum,
            description: orderDescription,
            serviceProviderId: serviceProviderId,
            mdOrder: preOrder.bankOrderId,
        };
        if (depositOrder.hasError) {
            await createTransaction(transactionData, depositOrder, settings.payment.PROVIDERS.ID_BANK, true);
            log.error(depositOrder, 'preOrder::depositPreOrder::depositOrder::hasError');
            return res.status(500).json(depositOrder);
        }
        await createTransaction(transactionData, depositOrder, settings.payment.PROVIDERS.ID_BANK);
        const { success, orderId, err } = await handleSuccessPreOrder(orderInfo, preOrder, consumer, payload.sessionId);
        if (success) {
            return res.json({ success: true, orderId, preOrderId: preOrder.id });
        } else {
            log.error(err, 'preOrder::depositPreOrder::depositOrder::createOrder');
            return res.status(500).json({ message: 'Order not processed.' });
        }
    } catch (err) {
        log.error(err, 'preOrder::depositPreOrder::server error');
        return res.status(500).json({ message: 'Could not make deposit for preOrder.' });
    }
};

/**
 * @swagger
 * /mobile/preOrders/{id}/decline:
 *   put:
 *     tags:
 *       - Mobile APIs
 *     summary: Reverse pre order
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               declineReason:
 *                 type: string
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for pre order
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.reverse = async (req, res) => {
    let transaction;
    try {
        const id = req.params.id;
        const payload = { ...req.body };
        try {
            await isSchemeValid(preOrdersValidator.customerCancel, payload);
        } catch (err) {
            loggerValidations.error(err, 'preOrder::reverse::validation');
            return res.status(409).json({ message: 'Validation error.' });
        }
        const preOrder = await PreOrders.findOne({
            where: { id },
            include: [
                { model: Kiosks },
                { model: PreOrdersDetails, required: true },
                {
                    model: Consumers, required: true,
                    include: [
                        { model: Regions, required: true }
                    ]
                }
            ]
        });
        if (!preOrder) {
            log.error('PreOrder not found.', 'preOrder::reverse::noPreOrder');
            return res.status(404).json({ message: 'PreOrder not found.' });
        }
        if (preOrder.consumer.region.isoCode !== 'am') {
            log.error('FORBIDDEN isoCode', 'preOrder::reverse::isoCode');
            return res.status(403).json({ message: 'FORBIDDEN' });
        }
        if (!preOrder.consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'preOrder::reverse::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        if (!PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status] || !PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status].consumerCancelStatus) {
            log.error(preOrder, 'preOrder::cancelPreOrder::invalidState');
            return res.status(403).json({ message: 'Forbidden. PreOrder cancel is impossible for current state.' });
        }
        if (preOrder.consumerId !== req.user.id) {
            log.error('Forbidden', 'preOrder::reverse::invalidConsumer');
            return res.status(403).json({ message: 'Forbidden' });
        }

        const serviceProvider = await ServiceProviders.findOne({ where: { id: preOrder.serviceProviderId } });
        if (preOrder.consumer.region.id !== serviceProvider.regionId) {
            log.error('Forbidden. User region does not match with sp region.', 'preOrder::reverse::regionsMismatches');
            return res.status(403).json({ message: 'Forbidden. User region does not match with sp region.' });
        }

        const orderInfo = JSON.parse(preOrder.preOrdersDetail.orderDetails);
        const fullyUsedBalance = ((orderInfo.usedBalance === orderInfo.price) && !orderInfo.bankOrderId);

        transaction = await sequelize.transaction();
        if (orderInfo.usedBalance) {
            try {
                // return consumer balance back
                await Consumers.update(
                    { balance: sequelize.literal(`balance + ${orderInfo.usedBalance}`) },
                    { where: { id: preOrder.consumerId }, transaction }
                );
                await BalanceHistary.create(
                    {
                        consumerId: preOrder.consumer.id,
                        consumerPhone: preOrder.consumer.phone,
                        type: 'returned',
                        date: Date.now(),
                        balance: orderInfo.usedBalance,
                        preOrderId: preOrder.id
                    },
                    { transaction }
                );
            } catch (err) {
                log.error(err, 'preOrder::reverseOrder::usedBalance');
                await transaction.rollback();
                return res.status(500).json({ message: 'PreOrder cannot be canceled.' });
            }
        }

        if (!fullyUsedBalance) {
            let reverseResponse;
            try {
                const client = Gateways.create(IDBANK, getSPAuthSettings(preOrder.serviceProviderId));
                reverseResponse = await client.reverseOrderProfile({
                    orderId: preOrder.bankOrderId,
                    currency: preOrder.consumer.region.currencyCode, // NOTE: allow only IDRAM (AM) for current step (need to update when integrate STRIPE).
                    language: preOrder.consumer.region.language
                });
            } catch (err) {
                await transaction.rollback();
                log.error(err, 'preOrder::reverse::reverseOrderProfile');
                return res.status(500).json({ hasError: true, err: err });
            }
            const orderDescription = `Kerpak - ${serviceProvider.legalName}`;
            const orderTotalSum = orderInfo.usedBalance ? orderInfo.price - orderInfo.usedBalance : orderInfo.price;
            const transactionId = await getTransactionId();
            const transactionData = {
                transactionId,
                paymentType: settings.payment.TYPE.BANK_CARD,
                paymentProvider: settings.payment.PROVIDERS.ID_BANK,
                amount: orderTotalSum,
                description: orderDescription,
                serviceProviderId: preOrder.serviceProviderId,
                mdOrder: preOrder.bankOrderId,
            };
            if (reverseResponse.hasError) {
                await createTransaction(transactionData, reverseResponse, settings.payment.PROVIDERS.ID_BANK, true);
                await transaction.rollback();
                log.error(reverseResponse, 'preOrder::reverse::reverseOrderProfile::hasError');
                return res.status(500).json(reverseResponse);
            }
            await createTransaction(transactionData, reverseResponse, settings.payment.PROVIDERS.ID_BANK);
        }

        await PreOrders.update({
            status: PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status].consumerCancelStatus,
            declineReason: payload.declineReason,
            transferId: null
        }, { where: { id: preOrder.id }, transaction });

        // create order
        const order = await createCanceledOrder(preOrder.id, transaction);
        if (!order.success) {
            log.error('IMPORTANT::preOrder::reverse::createOrder::money-returned::balance-not-returned');
            await transaction.rollback();
            return res.status(500).json({ message: 'PreOrder cannot be canceled.' });
        }
        const { order: { id: orderId, usedBalance } } = order;
        if (usedBalance) {
            await BalanceHistary.update({ orderId }, { where: { preOrderId: preOrder.id }, transaction });
        }
        await transaction.commit();

        await sendPreOrderReverseEmail(preOrder);
        return res.json({ success: true, message: 'Pre order successfully canceled.', order });
    } catch (err) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (errRollback) {
                log.error(errRollback, 'preOrder::reverse::rollback');
            }
        }
        log.error(err, 'preOrder::reverse::server error');
        return res.status(500).json({ message: 'PreOrder cannot be canceled.' });
    }
};

/**
 * @swagger
 * /mobile/preOrders:
 *   get:
 *     tags:
 *       - Mobile APIs
 *     summary: Get consumer pre orders
 *     description: ''
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.getPreOrdersList = async (req, res) => {
    try {
        const { count, rows } = await PreOrders.findAndCountAll({
            where: { consumerId: req.user.id },
            attributes: ['id', 'expectedDeliveryDate', 'status', 'kioskDeliveryTransferTimeFrom', 'totalPrice', 'orderDate'],
            include: [
                { model: Kiosks, attributes: ['id', 'displayName'] },
                { model: PreOrdersDetails, attributes: ['items'] },
                {
                    // TODO: need to delete regionalSettings
                    model: ServiceProviders, attributes: ['regionalSettings', 'primaryLogo', 'brandName'],
                    include: [{ model: Regions, attributes: ['isoCode'] ,required: true }]
                },
            ]
        });
        return res.json({ count, data: rows });
    } catch (err) {
        log.error(err, 'preOrder::controller::getPreOrdersList');
        return res.status(500).json({ message: 'Error in get pre orders list' });
    }
};

/**
 * @swagger
 * /mobile/preOrders/{id}:
 *   get:
 *     tags:
 *       - Mobile APIs
 *     summary: Get Pre order
 *     description: ''
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for pre order
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.getPreOrder = async (req, res) => {
    try {
        const preOrder = await PreOrders.findOne({
            where: { id: req.params.id, consumerId: req.user.id },
            attributes: [
                'id', 'expectedDeliveryDate', 'status', 'totalPrice', 'kioskDeliveryTransferTimeFrom', 'declineReason', 'deliveryDate', 'usedBalance',
                'discountAmount', [Sequelize.literal('total_price + preOrders.discount_sum'), 'subtotal']
            ],
            include: [
                { model: Kiosks, attributes: ['displayName'] },
                { model: PreOrdersDetails, attributes: ['items', 'comment'] },
                {
                    // TODO: need to delete regionalSettings
                    model: ServiceProviders, attributes: ['regionalSettings', 'brandName'],
                    include: [{ model: Regions, attributes: ['isoCode'] ,required: true }]
                },
            ]
        });
        if (!preOrder) {
            log.error('pre order not found', 'preOrder::getPreOrder::preOrder not found');
            return res.status(404).json({ message: 'PreOrder not found.' });
        }
        return res.json({ data: preOrder });
    } catch (err) {
        log.error(err, 'preOrder::getPreOrder::server error');
        return res.status(500).json({ message: 'Error in get pre orders list' });
    }
};
