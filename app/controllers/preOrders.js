const Gateways = require('easy-payment');
const IDBANK = require('@easy-payment/idbank').gateway;
const {
    preOrders: PreOrders,
    serviceProviders: ServiceProviders,
    consumers: Consumers,
    kiosks: Kiosks,
    preOrdersDetails: PreOrdersDetails,
    itemTransfers: ItemTransfers,
    orders: Orders,
    balanceHistary: BalanceHistary,
    cards: Cards,
    regions: Regions,
    sequelize,
    Sequelize
} = require('app/models/models');
const { Op } = require('sequelize');
const { getListPayload, getOnePayload, addAssociationOrder, addOrderById } = require('app/controllers/common');
const { getTransactionId, createTransaction, handleSuccessPreOrder, } = require('app/services/order');
const log = require('app/helpers/logger');
const { preOrders: preOrdersValidator } = require('app/schemes');
const loggerValidations = require('app/helpers/loggerValidations');
const { isSchemeValid, isSchemeValidSync } = require('app/helpers/validate');
const { collectDateString, getSPTimeZone } = require('app/helpers/utils');
const { exportHelper } = require('app/helpers/exportHelper');
const { getSPAuthSettings } = require('app/services/payment');
const { sendNotification } = require('app/services/firebase');
const { PRE_ORDER_STATUS, PAGE_VIEW } = require('app/constants');
const { payment: { TYPE, PROVIDERS } } = require('app/settings');
const { calculatePrice } = require('app/controllers/common');
const moment = require('moment');
const pupa = require('pupa');
const fs = require('fs');
const path = require('path');

const getDeliveryNotificationDate = (date, timezone) => {
    const day = new Date(date).getDate();
    if (day === new Date().getDate()) {
        return 'today';
    } else if (day === new Date().getDate() + 1) {
        return 'tomorrow';
    }
    return collectDateString(date, 'dddd, MMM DD', timezone);
};

/**
 * @swagger
 * /kiosks/{kioskId}/preOrders:
 *   get:
 *     tags:
 *       - PreOrders
 *     summary: 'Get preOrders by kiosk id (status fulfilled)'
 *     description: 'Get preOrders which have a fulfilled status for selected kiosk'
 *     parameters:
 *      - in: path
 *        name: kioskId
 *        description: kiosk ID
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
module.exports.getPreOrders = async (req, res) => {
    try {
        const kioskId = Number(req.params.kioskId);
        let payload = getListPayload(req, false);
        payload.where.kioskId = kioskId;
        payload.attributes = ['id', 'expectedDeliveryDate', 'status', 'itemsWithCount', 'storedConsumerName'];
        payload.include = [
            { model: PreOrdersDetails, attributes: ['items'], required: false },
        ];
        payload.where.status = { [Op.in]: PRE_ORDER_STATUS.spMakeTransferPermission };

        const kiosk = await Kiosks.findByPk(kioskId);
        const serviceProvider = await ServiceProviders.findByPk(kiosk.serviceProviderId);
        if (!serviceProvider.isSpAllowDelivery && !serviceProvider.havePreOrder) {
            log.error('The service provider does not have delivery support', 'preOrder::getPreOrders::SP does not have delivery support');
            return res.status(409).json({ message: 'The service provider does not have delivery support' });
        }
        PreOrders.findAndCountAll(payload)
            .then(({ count, rows }) => {
                return res.json({ count: count, data: rows });
            })
            .catch((err) => {
                log.error(err, 'preOrder::getPreOrders::error in get preOrders list');
                return res.status(500).json({ message: 'Error in get preOrders list' });
            });
    } catch (err) {
        log.error(err, 'preOrder::getPreOrders::server error');
        return res.status(500).json({ message: 'Error in get preOrders list' });
    }
};

/**
 * @swagger
 * /preOrders:
 *   get:
 *     tags:
 *       - PreOrders
 *     summary: 'Get all preOrders'
 *     description: 'Get all preOrders'
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.getPreOrdersAll = async (req, res) => {
    try {
        let payload = {
            ...getListPayload(req, false),
            include: [ { model: Kiosks, attributes: ['displayName'], required: true } ]
        };
        payload = addAssociationOrder(payload);
        if (payload?.where?.serviceProviderId) {
            const serviceProvider = await ServiceProviders.findOne({ where: { id: payload.where.serviceProviderId } });
            if (!serviceProvider.isSpAllowDelivery && !serviceProvider.havePreOrder) {
                log.error('The service provider does not have delivery support', 'preOrder::getPreOrdersAll::SP does not have delivery support');
                return res.status(409).json({ message: 'The service provider does not have delivery support' });
            }
        }
        const statusIn = JSON.parse(req.query.params).statusIn;
        if (statusIn) {
            payload.where.status = { [Op.in]: statusIn };
        }
        payload = addOrderById(payload);
        const { count, rows } = await PreOrders.findAndCountAll(payload);
        return res.json({ count: count, data: rows });
    } catch (err) {
        log.error(err, 'preOrder::getPreOrdersAll::server error');
        return res.status(500).json({ message: 'Error in get pre orders list' });
    }
};

/**
 * @swagger
 * /preOrders/{id}:
 *   get:
 *     tags:
 *       - PreOrders
 *     summary: 'Get preOrder by id'
 *     description: 'Get preOrder by id'
 *     parameters:
 *      - in: path
 *        name: id
 *        description: preOrder ID
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
module.exports.getPreOrder = async (req, res) => {
    try {
        const id = req.params.id;
        const payload = {
            ...getOnePayload(req, id),
            include: [
                {
                    model: ServiceProviders, attributes: ['id', 'legalName'], required: false,
                    include: [{ model: Regions, attributes: ['currencySymbol'], required: true }]
                },
                { model: Kiosks, attributes: ['id', 'displayName', 'address1', 'address2'], required: false, },
                { model: PreOrdersDetails, required: false, attributes: { exclude: ['orderDetails'] } },
            ],
            attributes: {
                include: [[Sequelize.literal('total_price + preOrders.discount_sum'), 'orderAmount']],
                exclude: ['discountSum', 'productionDate', 'itemsWithCount', 'bankOrderId', 'notificationStatus', 'transferId', 'serviceProviderId', 'preOrderDetailsId']
            }
        };
        if (payload?.where?.serviceProviderId) {
            const serviceProvider = await ServiceProviders.findOne({ where: { id: payload.where.serviceProviderId } });
            if (!serviceProvider.isSpAllowDelivery && !serviceProvider.havePreOrder) {
                log.error('The service provider does not have delivery support', 'preOrder::getPreOrder::SP does not have delivery support');
                return res.status(409).json({ message: 'The service provider does not have delivery support' });
            }
        }
        PreOrders.findOne(payload)
            .then((order) => {
                return res.json(order);
            })
            .catch((err) => {
                log.error(err, 'preOrder::getPreOrder::error in get preOrder');
                return res.status(500).json({ message: 'Error in get preOrder' });
            });
    } catch (err) {
        log.error(err, 'preOrder::getPreOrder::server error');
        return res.status(500).json({ message: 'Error in get preOrder' });
    }
};

const createCanceledOrder = async (preOrderId, transaction) => {
    try {
        const preOrderDetails = await PreOrdersDetails.findOne({where: { preOrderId }});
        const orderDetails = JSON.parse(preOrderDetails.orderDetails);
        orderDetails.purchaseStatus = 'cancelled';
        orderDetails.orderStatus = 'canceled';
        orderDetails.orderDate = Date.now();
        const orderDetailsStr = JSON.stringify(orderDetails).replace(/\\/g, '');
        await PreOrdersDetails.update({orderDetails: orderDetailsStr}, {where: { preOrderId }, transaction});
        const order = await Orders.create(orderDetails, { include: [{ association: Orders.associations.ordersProductItems }], transaction });
        return {order, success: true};
    } catch (err) {
        log.error(err, 'preOrder::controller::createCanceledOrder');
        return {success: false, message: 'Could not create order.'}
    }
};

/**
 * @swagger
 * /preOrders/{id}/decline:
 *   put:
 *     tags:
 *       - PreOrders
 *     summary: 'SP cancel preOrder by id'
 *     description: 'SP cancel preOrder by id'
 *     parameters:
 *      - in: path
 *        name: id
 *        description: preOrder ID
 *        required: true
 *        type: number
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               declineReason:
 *                 type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.cancelPreOrder = async (req, res) => {
    let transaction;
    try {
        const id = req.params.id;
        const payload = { ...req.body };
        try {
            await isSchemeValid(preOrdersValidator.cancelPreOrder, payload);
        } catch (err) {
            loggerValidations.error(err, 'preOrder::controller::cancelPreOrder::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        const preOrder = await PreOrders.findOne({
            where: { id },
            include: [
                { model: ServiceProviders, attributes: ['id', 'legalName', 'brandName', 'regionId'] },
                { model: PreOrdersDetails, required: true },
                {
                    model: Consumers, required: true,
                    include: [{ model: Regions, required: true }]
                }
            ]
        });

        if (!preOrder) {
            log.error('preOrder::controller::cancelPreOrder::noPreOrder');
            return res.status(404).json({ message: 'Pre order not found.' });
        }
        if (!PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status] || !PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status].spCancelStatus) {
            log.error(preOrder, 'preOrder::controller::cancelPreOrder::invalidState');
            return res.status(403).json({ message: 'Forbidden. PreOrder cancel is impossible for current state.' });
        }
        if (!req.user.isKerpakOperator && preOrder.serviceProviderId !== req.user.serviceProviderId) {
            log.error('preOrder::controller::cancelPreOrder::invalidSP');
            return res.status(403).json({ message: 'Forbidden' });
        }
        if (preOrder.consumer.region.isoCode !== 'am') {
            log.error('FORBIDDEN isoCode', 'preOrder::controller::cancelPreOrder::isoCode');
            return res.status(403).json({ message: 'FORBIDDEN' });
        }
        if (!preOrder.consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'preOrder::controller::cancelPreOrder::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        if (preOrder.consumer.region.id !== preOrder.serviceProvider.regionId) {
            log.error('Forbidden. User region does not match with sp region.', 'preOrder::controller::cancelPreOrder::regionsMismatches');
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
                        userEmail: req.user.email,
                        userId: req.user.id,
                        preOrderId: preOrder.id
                    },
                    { transaction }
                );
            } catch (err) {
                log.error(err, 'pre order::controller::cancelPreOrder::usedBalance');
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
                log.error(err, 'preOrder::controller::cancelPreOrder::reverseOrderProfile');
                return res.status(500).json({ data: { hasError: true, err: err } });
            }
            const transactionId = await getTransactionId();

            const orderDescription = `Kerpak - ${preOrder.serviceProvider?.legalName}`;
            const orderTotalSum = orderInfo.usedBalance ? orderInfo.price - orderInfo.usedBalance : orderInfo.price;
            const transactionData = {
                transactionId,
                paymentType: TYPE.BANK_CARD,
                paymentProvider: PROVIDERS.ID_BANK,
                amount: orderTotalSum,
                description: orderDescription,
                serviceProviderId: preOrder.serviceProviderId,
                mdOrder: preOrder.bankOrderId,
            };
            if (reverseResponse.hasError) {
                await createTransaction(transactionData, reverseResponse, PROVIDERS.ID_BANK, true);
                await transaction.rollback();
                log.error(reverseResponse, 'preOrder::controller::cancelPreOrder::reverseOrderProfile::hasError');
                return res.status(500).json(reverseResponse);
            }
            await createTransaction(transactionData, reverseResponse, PROVIDERS.ID_BANK);
        }

        await PreOrders.update(
            {
                status: PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status].spCancelStatus,
                declineReason: payload.declineReason,
                transferId: null
            },
            { where: { id }, transaction }
        );

        // create order
        const order = await createCanceledOrder(id, transaction);
        if (!order.success) {
            log.error('IMPORTANT::preOrder::controller::reverse::createOrder::money-returned::balance-not-returned');
            await transaction.rollback();
            return res.status(500).json({ message: 'Error to cancel preOrder.' });
        }
        const { order: { id: orderId, usedBalance } } = order;
        if (usedBalance) {
            await BalanceHistary.update({ orderId }, { where: { preOrderId: preOrder.id }, transaction });
        }
        await transaction.commit();
        if (preOrder?.consumer?.firebaseRegistrationToken && preOrder?.serviceProvider?.brandName && PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status].spCancelNotificationTemplatePath) {
            const template = fs.readFileSync(path.resolve(PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status].spCancelNotificationTemplatePath), 'utf8').toString();
            await sendNotification(null, pupa(template, { SPName: preOrder.serviceProvider.brandName }), [preOrder.consumer.firebaseRegistrationToken]);
        }
        return res.json({ success: true, message: 'PreOrder successfully canceled.', order });
    } catch (err) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (errRollback) {
                log.error(errRollback, 'preOrder::controller::depositOrder::createOrder::rollback');
            }
        }
        log.error(err, 'preOrder::controller::cancelPreOrder::server error');
        return res.status(500).json({ message: 'Error to cancel preOrder.' });
    }
};

/**
 * @swagger
 * /preOrders/{id}/accept:
 *   put:
 *     tags:
 *       - PreOrders
 *     summary: 'SP accept preOrder by id'
 *     description: 'SP accept preOrder by id'
 *     parameters:
 *      - in: path
 *        name: id
 *        description: preOrder ID
 *        required: true
 *        type: number
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productionDate:
 *                 type: string
 *                 format: date-time
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.acceptPreOrder = async (req, res) => {
    try {
        const id = req.params.id;
        const payload = { ...req.body };
        try {
            await isSchemeValid(preOrdersValidator.acceptPreOrder, payload);
        } catch (err) {
            loggerValidations.error(err, 'preOrder::acceptPreOrder::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        const preOrder = await PreOrders.findOne({
            where: { id },
            include: [
                { model: Consumers, attributes: ['id', 'firebaseRegistrationToken'] },
                { model: ServiceProviders, attributes: ['timezone'] }
            ]
        });
        if (!preOrder) {
            log.error('Pre order not found', 'preOrder::acceptPreOrder::preOrder not found');
            return res.status(404).json({ message: 'Pre order not found' });
        }
        if (!PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status] || !PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status].spAcceptStatus) {
            return res.status(409).json({ message: "Forbidden. Pre order can't be accepted." });
        }
        if (!req.user.isKerpakOperator && preOrder.serviceProviderId !== req.user.serviceProviderId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        if (preOrder.expectedDeliveryDate && preOrder.expectedDeliveryDate.getTime() < Date.now()) {
            return res.status(403).json({ message: 'Forbidden. Delivery time expired' });
        }
        await PreOrders.update(
            {
                status: PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status].spAcceptStatus,
                productionDate: payload.productionDate
            },
            { where: { id } }
        );
        if (preOrder.consumer?.firebaseRegistrationToken) {
            const timezone = preOrder.serviceProvider.timezone;
            const template = fs.readFileSync(path.resolve('app/helpers/notifications/templates/preOrders/accept.txt'), 'utf8').toString();
            await sendNotification(null, pupa(template, { expectedDeliveryDate: getDeliveryNotificationDate(preOrder.expectedDeliveryDate, timezone), transferTimeFrom: collectDateString(preOrder.kioskDeliveryTransferTimeFrom, 'HH:mm', timezone), transferTimeTo: collectDateString(preOrder.expectedDeliveryDate, 'HH:mm', timezone) }), [preOrder.consumer.firebaseRegistrationToken]);
        }
        return res.json({ success: true, message: 'Pre order successfully accepted.' });
    } catch (err) {
        log.error(err, 'preOrder::acceptPreOrder::server error');
        return res.status(500).json({ message: 'Error to accept preOrder.' });
    }
};

/**
 * @swagger
 * /transfers/{transferId}/preOrders:
 *   get:
 *     tags:
 *       - PreOrders
 *     summary: 'Get preOrders'
 *     description: 'Get preOrders which have an inTransfer status for selected transfer'
 *     parameters:
 *      - in: path
 *        name: transferId
 *        description: transfer ID
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
module.exports.transferPreOrdersList = async (req, res) => {
    try {
        const id = Number(req.params.transferId);
        let payload = getListPayload(req, false);
        payload.where.transferId = id;
        payload.include = [
            { model: ServiceProviders, attributes: ['id', 'labelMonochrome'], required: true },
            { model: PreOrdersDetails, required: true, attributes: { exclude: ['orderDetails'] } },
        ];
        payload.where.status = { [Op.in]: PRE_ORDER_STATUS.statusesToShowInTransfer };

        const itemTransfer = await ItemTransfers.findByPk(id);
        const serviceProvider = await ServiceProviders.findByPk(itemTransfer.serviceProviderId);
        if (!serviceProvider.isSpAllowDelivery && !serviceProvider.havePreOrder) {
            log.error('The service provider does not have delivery support', 'preOrder::transferPreOrdersList::SP does not have delivery support');
            return res.status(409).json({ message: 'The service provider does not have delivery support' });
        }
        payload = addOrderById(payload);
        const { count, rows } = await PreOrders.findAndCountAll(payload);
        return res.json({ count: count, data: rows });
    } catch (err) {
        log.error(err, 'order::transferPreOrdersList::server error');
        return res.status(500).json({ message: 'Error in get transfer preOrders list' });
    }

};

/**
 * @swagger
 * /preOrders/transfers/cancel:
 *   put:
 *     tags:
 *       - PreOrders
 *     summary: 'Remove preOrders from transfer (change status from inTransfer to fulfilled)'
 *     description: 'Remove preOrders from transfer (change status from inTransfer to fulfilled)'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transferId:
 *                 type: number
 *               preOrdersList:
 *                 type: array
 *                 items:
 *                    type: number
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.removeFromTransfer = async (req, res) => {
    try {
        try {
            await isSchemeValid(preOrdersValidator.removeFromTransfer, req.body);
        } catch (err) {
            loggerValidations.error(err, 'preOrder::removeFromTransfer::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        const { preOrdersList } = req.body;
        let payload = getListPayload(req, false);
        payload.where.id = preOrdersList;
        payload.where.status = PRE_ORDER_STATUS.inTransfer;
        const preOrders = await PreOrders.update({
            status: PRE_ORDER_STATUS.allowedNextStatuses.inTransfer.spCancelTransferStatus,
            transferId: null
        }, payload);
        return res.json({ data: preOrders });
    } catch (err) {
        log.error(err, 'preOrder::removeFromTransfer::server error');
        return res.status(500).json({ message: 'Error to remove preOrder from transfer.' });
    }
};

/**
 * @swagger
 * /preOrders/{id}/kiosk:
 *   put:
 *     tags:
 *       - PreOrders
 *     summary: 'Change delivery kiosk'
 *     description: 'Change delivery kiosk'
 *     parameters:
 *      - in: path
 *        name: id
 *        description: preOrder ID
 *        required: true
 *        type: number
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kioskId:
 *                 type: number
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.changeKiosk = async (req, res) => {
    try {
        const payload = { ...req.body };
        const id = Number(req.params.id);
        let { isValid, data: { ...updates }, errors } = isSchemeValidSync(preOrdersValidator.changeKiosk, payload);
        if (!isValid) {
            log.error(errors, 'preOrders::changeKiosk::validation');
            return res.status(400).json({ message: 'validation failed' });
        }
        const preOrder = await PreOrders.findOne({
            where: { id },
        });
        if (!preOrder) {
            log.error(errors, 'preOrders::changeKiosk::invalidPreOrder');
            return res.status(400).json({ message: 'PreOrder not found.' });
        }
        if (!PRE_ORDER_STATUS.changeKioskPermission.includes(preOrder.status)) {
            log.error(errors, 'preOrders::changeKiosk::forbidden');
            return res.status(403).json({ message: 'Forbidden. Changing kiosk of delivery is impossible for current state.' });
        }
        const kiosk = await Kiosks.findOne({
            where: { id: updates.kioskId },
        });
        if (!kiosk || !kiosk.deliveryIsKioskAllow) {
            log.error(errors, 'preOrders::changeKiosk::invalidKiosk');
            return res.status(400).json({ message: 'Kiosk not found or does not support delivery.' });
        }
        if (kiosk.serviceProviderId !== preOrder.serviceProviderId) {
            log.error(errors, 'preOrders::changeKiosk::invalidSP');
            return res.status(400).json({ message: 'The kiosk belongs to another service provider.'});
        }
        const preOrderDetails = await PreOrdersDetails.findOne({where: {preOrderId: id}});

        const orderDetails = JSON.parse(preOrderDetails.orderDetails);
        orderDetails.kioskId = kiosk.id;
        orderDetails.storedKioskId = kiosk.id;
        orderDetails.kioskName = kiosk.displayName;
        const { address1, address2, city, state } = kiosk;
        orderDetails.kioskAddress = (`${address1}, ` + (address2 ? `${address2}, ` : '') + `${city}, ` + `${state}`);
        const orderDetailsStr = JSON.stringify(orderDetails).replace(/\\/g, '');

        await PreOrders.update(updates, { where: { id } });
        await PreOrdersDetails.update({orderDetails: orderDetailsStr}, {where: {preOrderId: id}});
        return res.json({ ...updates, success: true, message: 'Kiosk of delivery successfully updated.' });
    } catch (err) {
        log.error(err, 'preOrders::changeKiosk::server error');
        return res.status(500).json({ message: 'Error in change delivery Kiosk.' });
    }
};

module.exports.exportXLSXList = async (req, res) => {
    try {
        const id = Number(req.params.id);
        let payload = getListPayload(req, false);
        payload.where.transferId = id;

        const status = JSON.parse(req.query.params).status;
        if (status) {
            payload.where.status = { [Op.in]: [status] };
        }
        payload = addOrderById(payload);

        const preOrders = await PreOrders.findAll(payload);
        const fileName = 'preOrders.xlsx';

        const columns = [
            { header: 'ID', key: 'A', width: 20 },
            { header: 'Order date', key: 'B', width: 20 },
            { header: 'Exp. delivery date', key: 'C', width: 20 },
            { header: 'Amount', key: 'D', width: 20 },
        ];
        const columnsIds = {
            A: 'id',
            B: 'orderDate',
            C: 'expectedDeliveryDate',
            D: 'totalPrice',
        };
        const columnNames = ['A', 'B', 'C', 'D'];
        const { workbook, worksheet } = exportHelper(preOrders, fileName, 'PreOrders', columns, columnsIds, columnNames, res);
        worksheet.getRow(1).font = { bold: true };
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        log.error(err, 'preOrders::controller::exportXLSXList');
        return res.status(500).json({ message: 'Error in get XLSX' });
    }
};

module.exports.exportPreOrdersXLSX = async (req, res) => {
    try {
        const params = JSON.parse(req.query.params);
        let payload = {
            ...getListPayload(req),
            include: [
                { model: Kiosks, attributes: ['id', 'displayName'], required: false, },
                { model: PreOrdersDetails, required: false, attributes: { exclude: ['orderDetails'] } },
            ],
            attributes: {
                exclude: ['productionDate', 'itemsWithCount', 'preOrderDetailsId']
            },
        };
        payload.where = {...payload.where, status: { [Sequelize.Op.in]: params.statusIn }};
        payload = addAssociationOrder(payload);
        const preOrders = await PreOrders.findAll(payload);

        const fileName = 'preOrders.xlsx';
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('preOrders');

        const isCompletedPreOrders = (JSON.stringify(params.statusIn.sort((a, b) => (a - b)))) === (JSON.stringify(PRE_ORDER_STATUS.COMPLETED.sort((a, b) => (a - b))));
        const dateFieldName = isCompletedPreOrders ? 'deliveryDate' : 'expectedDeliveryDate';

        worksheet.columns = [
            { header: 'Kiosk name', key: 'A', width: 24 },
            { header: 'Customer name', key: 'B', width: 24 },
            { header: 'Items', key: 'C', width: 32 },
            { header: 'Date ordered', key: 'D', width: 16 },
            ...(isCompletedPreOrders ? [{ header: 'Date delivered', key: 'E', width: 24 }] : [{ header: 'Exp. delivery date', key: 'E', width: 24 }]),
            { header: 'Comment', key: 'F', width: 24 },
            { header: 'Order price', key: 'G', width: 16 },
            { header: 'Status', key: 'H', width: 24 },
            { header: 'Order ID', key: 'I', width: 12 },
        ];

        preOrders.forEach(element => {
            worksheet.addRow({
                A: element.kiosk.displayName,
                B: element.storedConsumerName,
                C: (JSON.parse(element.preOrdersDetail.items)).map(i => ([`${i.name} - ${i.count}`])).join(',\n'),
                D: element.orderDate ? moment(element.orderDate).utcOffset(getSPTimeZone(req.user)).format('DD.MM.YYYY, HH:mm') : '-',
                E: element[dateFieldName] ? moment(element[dateFieldName]).utcOffset(getSPTimeZone(req.user)).format('DD.MM.YYYY, HH:mm') : '-',
                F: element.preOrdersDetail.comment,
                G: element.totalPrice,
                H: element.status ? PRE_ORDER_STATUS.titles[element.status] : '-',
                I: element.id,
            });
        });
        worksheet.getRow(1).font = { bold: true };
        worksheet.getColumn(3).alignment = { vertical: 'middle', wrapText: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        log.error(err, 'preOrders::controller::exportXLSX');
        return res.status(500).json({ message: 'Error in get XLSX data.' });
    }
};

/**
 * @swagger
 * /preOrders/{id}/scan:
 *   put:
 *     tags:
 *       - PreOrders
 *     summary: 'Scan preOrder by id'
 *     description: 'Scan preOrder by id'
 *     parameters:
 *      - in: path
 *        name: id
 *        description: preOrder ID
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
module.exports.depositPreOrder = async (req, res) => {
    try {
        const id = req.params.id;
        const preOrder = await PreOrders.findOne({
            where: { id },
            include: [
                { model: ServiceProviders, attributes: ['id', 'legalName', 'regionId'], required: true },
                { model: PreOrdersDetails, required: true },
                {
                    model: Consumers, required: true,
                    include: [{ model: Regions, required: true }]
                }
            ]
        });
        if (!preOrder) {
            log.error('Pre order not found', 'preOrder::depositPreOrder::invalidPreOrder');
            return res.status(404).json({ message: 'Pre order not found' });
        }
        if (!PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status] || !PRE_ORDER_STATUS.allowedNextStatuses[preOrder.status].scannedStatus) {
            log.error(preOrder, 'preOrder::depositPreOrder::invalidState');
            return res.status(409).json({ message: 'Forbidden. Pre order can not be picked up.' });
        }
        if (preOrder.consumer.region.isoCode !== 'am') {
            log.error('FORBIDDEN isoCode', 'preOrder::depositPreOrder::isoCode');
            return res.status(403).json({ message: 'FORBIDDEN' });
        }
        if (!preOrder.consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'preOrder::depositPreOrder::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }

        if (preOrder.consumer.region.id !== preOrder.serviceProvider.regionId) {
            log.error('Forbidden. User region does not match with sp region.', 'preOrder::depositPreOrder::regionsMismatches');
            return res.status(403).json({ message: 'Forbidden. User region does not match with sp region.' });
        }

        const {serviceProvider, consumer, preOrdersDetail} = preOrder;

        const defaultCard = await Cards.findOne({
            where: { consumerId: consumer.id, active: true, isDefault: true }
        });
        if (!defaultCard) {
            log.error('default card not found', 'preOrder::depositOrder::defaultCard');
            return res.status(500).json({ message: 'default card not found' });
        }

        const orderInfo = JSON.parse(preOrdersDetail.orderDetails);
        let orderTotalSum = preOrder.totalPrice;
        if (orderInfo.usedBalance) {
            if ((orderInfo.usedBalance === orderInfo.price) && !orderInfo.bankOrderId) {
                const { success, orderId, err } = await handleSuccessPreOrder(orderInfo, preOrder, consumer);
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
            const client = Gateways.create(IDBANK, getSPAuthSettings(serviceProvider.id));
            depositOrder = await client.depositOrder(orderPayload);
        } catch (err) {
            log.error(err, 'preOrder::depositPreOrder::depositOrder::depositOrder');
            return res.status(500).json({ hasError: true, err: err});
        }

        const orderDescription = `Kerpak - ${serviceProvider.legalName}`;
        const transactionId = await getTransactionId();
        const transactionData = {
            transactionId,
            paymentType: TYPE.BANK_CARD,
            paymentProvider: PROVIDERS.ID_BANK,
            amount: orderTotalSum,
            description: orderDescription,
            serviceProviderId: serviceProvider.id,
            mdOrder: preOrder.bankOrderId,
        };

        if (depositOrder.hasError) {
            await createTransaction(transactionData, depositOrder, PROVIDERS.ID_BANK, true);
            log.error(depositOrder, 'preOrder::depositPreOrder::depositOrder::hasError');
            return res.status(500).json(depositOrder);
        }
        await createTransaction(transactionData, depositOrder, PROVIDERS.ID_BANK);
        const { success: successOrder, orderId, err } = await handleSuccessPreOrder(orderInfo, preOrder, consumer);
        if (successOrder) {
            return res.json({ success: true, orderId, preOrderId: preOrder.id });
        } else {
            log.error(err, 'preOrder::depositOrder::createOrder');
            return res.status(500).json({ message: 'PreOrder not processed.' });
        }
    } catch (err) {
        log.error(err, 'preOrder::depositPreOrder::server error');
        return res.status(500).json({ message: 'Could not make deposit for preOrder.' });
    }
};

/**
 * @swagger
 * /serviceProviders/{spId}/preOrders:
 *   get:
 *     tags:
 *       - PreOrders
 *     summary: 'Get preOrders by sp ID and '
 *     description: 'Get preOrders by sp ID and status'
 *     parameters:
 *      - in: path
 *        name: spId
 *        description: Service provider ID
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
module.exports.getSpPreOrders = async (req, res) => {
    try {
        const spId = Number(req.params.spId);
        const serviceProvider = await ServiceProviders.findByPk(spId);
        if (!serviceProvider.isSpAllowDelivery && !serviceProvider.havePreOrder) {
            return res.json({ count: 0, data: [] });
        }
        let payload = getListPayload(req, false);
        if(!payload.where) {
            payload.where = {};
        }
        payload.where.serviceProviderId = spId;
        payload.attributes = ['id', 'status', 'consumerId', 'kioskId', 'serviceProviderId', 'total_price', 'used_balance', 'discountAmount', 'discountSum'];
        PreOrders.findAndCountAll(payload)
            .then(({ count, rows }) => {
                return res.json({ count: count, data: rows });
            })
            .catch((err) => {
                log.error(err, 'preOrder::getSpPreOrders::error in get SP preOrders list');
                return res.status(500).json({ message: 'Error in get SP preOrders list' });
            });
    } catch (err) {
        log.error(err, 'preOrder::getSpPreOrders::server error');
        return res.status(500).json({ message: 'Error in get SP preOrders list' });
    }
};

/**
 * @swagger
 * /preOrders/{id}/expectedDeliveryDate:
 *   put:
 *     tags:
 *       - PreOrders
 *     summary: 'Change expected delivery date'
 *     description: 'Change expected delivery date'
 *     parameters:
 *      - in: path
 *        name: id
 *        description: preOrder ID
 *        required: true
 *        type: number
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date-time
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.changeExpectedDeliveryDate = async (req, res) => {
    try {
        const preOrderId = req.params.id;
        const payload = { ...req.body };
        try {
            await isSchemeValid(preOrdersValidator.changeExpectedDeliveryDate, payload);
        } catch (err) {
            loggerValidations.error(err, 'preOrder::changeExpectedDeliveryDate::validation');
            return res.status(400).json({ message: 'Validation error' });
        }
        const preOrder = await PreOrders.findOne({ where: { id: preOrderId }});
        if (!preOrder) {
            log.error('Pre order not found', 'preOrder::changeExpectedDeliveryDate::preOrderNotFound');
            return res.status(404).json({ message: 'Pre order not found' });
        }
        if (!PRE_ORDER_STATUS.changeExpectedDeliveryDatePermission.includes(preOrder.status)) {
            log.error(preOrder.status, 'preOrders::changeExpectedDeliveryDate::forbidden');
            return res.status(403).json({ message: 'Forbidden. Changing kiosk of delivery is impossible for current state.' });
        }
        const expectedDeliveryDate = new Date(payload.expectedDeliveryDate);
        if (expectedDeliveryDate.getTime() <= Date.now()) {
            log.error('The expected delivery date must be greater than the current time.', 'preOrder::changeExpectedDeliveryDate::invalidDate');
            return res.status(409).json({ message: 'The expected delivery date must be greater than the current time.' });
        }
        const transferTimeFrom = new Date(payload.transferTimeFrom);
        const from = new Date();
        from.setHours(transferTimeFrom.getHours());
        from.setMinutes(transferTimeFrom.getMinutes());
        const to =  new Date();
        to.setHours(expectedDeliveryDate.getHours());
        to.setMinutes(expectedDeliveryDate.getMinutes());
        if (from.getTime() >= to.getTime()) {
            log.error('Invalid range.', 'preOrder::changeExpectedDeliveryDate::invalidRange');
            return res.status(409).json({ message: 'Invalid range.' });
        }
        await PreOrders.update(
            {
                expectedDeliveryDate,
                kioskDeliveryTransferTimeFrom: transferTimeFrom
            },
            { where: { id: preOrder.id } }
        );
        return res.json({ message: 'Expected delivery date successfully updated'});
    } catch (err) {
        log.error(err, 'preOrder::changeExpectedDeliveryDate::server error');
        return res.status(500).json({ message: 'Error in change expected delivery date' });
    }
};