const { Op } = require('sequelize');
const {
    consumers: Consumers,
    orders: Orders,
    balanceHistary: BalanceHistary,
    organizations: Organizations,
    regions: Regions,
    sequelize,
    Sequelize
} = require('app/models/models');
const { consumers: consumersValidator } = require('app/schemes');
const { isSchemeValid } = require('app/helpers/validate');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');
const { getListPayload, getOnePayload, getPayloadForNotificationFilter, addAssociationOrder, addOrderById } = require('app/controllers/common');
const { sendNotification } = require('app/services/firebase');
const pupa = require('pupa');
const fs = require('fs');
const path = require('path');

module.exports.list = async (req, res) => {
    try {
        if (req.user.serviceProviderId) {
            return this.listSPData(req, res);
        }
        const aggregateFunctions = [
            [Sequelize.fn("COUNT", Sequelize.col('orders.id')), 'ordersCount'],
            [sequelize.fn('sum', sequelize.col('price')), 'ordersTotal'],
            [sequelize.fn('MAX', sequelize.col('order_date')), 'lastOrderDate']
        ];

        let payload = getListPayload(req, true, aggregateFunctions);
        const params = req.query.params;

        let sp = JSON.parse(params).currentServiceProvider;

        payload.include = [
            { model: Orders, where: { orderStatus: 'successful' }, attributes: [], required: false },
            { model: Organizations, required: false },
            { model: Regions, attributes: ['isoCode', 'currencySymbol', 'currencyName'], required: true },
        ];
        payload = addAssociationOrder(payload);
        if (sp) {
            if (sp === 'unset') {
                payload.where['$orders.id$'] = { [Op.eq]: null };
            } else {
                payload.include[0].where.serviceProviderId = sp;
                payload.include[0].required = true;
            }
        }
        payload.subQuery = false;
        payload.group = [Sequelize.col('consumers.id')];
        payload.attributes = [
            'id', 'phone', 'country', 'email', 'firstName', 'lastName', 'zipCode', 'createdAt', 'hasCardAttached', 'balance', 'regionId',
            ...aggregateFunctions,
        ];
        payload = addOrderById(payload);
        const { count, rows } = await Consumers.findAndCountAll(payload);
        return res.json({ count: count.length, data: rows });
    } catch(err) {
        log.error(err, 'consumer::controller::getConsumers');
        return res.status(500).json({ message: 'Error in get consumers list' });
    }
};

module.exports.listSPData = async (req, res) => {
    try {
        const aggregateFunctions = [
            [Sequelize.fn("COUNT", Sequelize.col('orders.id')), 'ordersCount'],
            [sequelize.fn('sum', sequelize.col('price')), 'ordersTotal'],
            [sequelize.fn('MAX', sequelize.col('order_date')), 'lastOrderDate']
        ];
        let payload = getListPayload(req, true, aggregateFunctions);
        let sp = req.user.serviceProviderId;
        payload.include = [
            { model: Orders, where: { orderStatus: 'successful' }, attributes: [] },
            { model: Regions, attributes: ['currencySymbol'] ,required: true },
        ];
        if (sp) {
            payload.include[0].where.serviceProviderId = sp;
        }
        payload.subQuery = false;
        payload.group = [Sequelize.col('consumers.id')];
        payload.attributes = ['id', 'country', 'zipCode', ...aggregateFunctions];
        payload = addOrderById(payload);
        const { count, rows } = await Consumers.findAndCountAll(payload);
        return res.json({ count: count.length, data: rows });
    } catch(err) {
        log.error(err, 'consumer::getConsumers::listSPData');
        return res.status(500).json({ message: 'Error in get consumers list' });
    }
};

module.exports.get = async (req, res) => {
    try {
        const id = req.params.id;
        let payload = {
            ...getOnePayload(req, id, true),
            include: [
                {
                    model: Orders,
                    attributes: [],
                    required: false,
                    where: { orderStatus: 'successful' },
                },
                { model: Organizations, required: false },
                { model: Regions, attributes: ['isoCode', 'currencySymbol', 'currencyName'] ,required: true },
            ],
            group: [Sequelize.col('consumers.id')],
            subQuery: false,
            attributes: [
                'id', 'country', 'zipCode'
            ]
        };
        if (req.user.isKerpakOperator) {
            payload.attributes.push('phone', 'email', 'firstName', 'lastName', 'createdAt', 'hasCardAttached', 'registerByEmailCompleted', 'balance');
        }
        const params = JSON.parse(req.query.params);
        if (params.currentServiceProvider && params.currentServiceProvider !== 'unset') {
            payload.include[0].where.serviceProviderId = params.currentServiceProvider;
        }

        if (!params.currentServiceProvider || params.currentServiceProvider !== 'unset') {
            payload.attributes.push(
                [Sequelize.fn('COUNT', Sequelize.col('orders.id')), 'ordersCount'],
                [sequelize.fn('sum', sequelize.col('orders.price')), 'ordersTotal'],
                [sequelize.fn('MAX', sequelize.col('orders.order_date')), 'lastOrderDate']
            );
        }

        const consumer = await Consumers.findOne(payload);
        return res.json(consumer);
    } catch (err) {
        log.error(err, 'consumer::getConsumerById::server error');
        return res.status(500).json({ message: 'Error in get consumer' });
    }
};

module.exports.filterConsumerForNotification = async (req, res) => {
    try {
        const params = JSON.parse(req.query.params);
        const payload = getPayloadForNotificationFilter(params);
        const filter = await Consumers.findAndCountAll(payload);
        const allConsumersCount = await Consumers.count();
        payload.where.firebaseRegistrationToken = { [Op.ne]: null };
        const registredConsumers = await Consumers.findAndCountAll(payload);
        return res.json({ filterCount: filter.rows.length, allConsumersCount, registredConsumersCount: registredConsumers.rows.length });
    } catch (err) {
        log.error(err, 'consumer::filterConsumerForNotification');
        return res.status(500).json({ message: 'Error in get user list' });
    }
};

module.exports.addBalance = async (req, res) => {
    let t;
    try {
        const id = req.params.id;
        const payload = { ...req.body };
        try {
            await isSchemeValid(consumersValidator.addBalance, payload);
        } catch (err) {
            loggerValidations.error(err, 'consumer::addBalance::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        const { phone, firebaseRegistrationToken, region } = await Consumers.findOne({
            where: { id },
            include: [
                { model: Regions, required: true },
            ]
        });
        t = await sequelize.transaction();
        await Consumers.update({balance: sequelize.literal(`balance + ${payload.balance}`)}, { where: { id }, transaction: t });
        const balanceHistoryPayload = {
            userId: req.user.id,
            userEmail: req.user.email,
            consumerId: id,
            balance: payload.balance,
            consumerPhone: phone,
            type: payload.balanceType,
            date: new Date(),
        }
        await BalanceHistary.create(balanceHistoryPayload, { transaction: t });
        await t.commit();
        if (firebaseRegistrationToken && payload.balance > 0) {
            const template = fs.readFileSync(path.resolve('app/helpers/notifications/templates/addBalance.txt'), 'utf8').toString();
            await sendNotification(null, pupa(template, { balance: payload.balance, currency: region.currencyName }), [firebaseRegistrationToken]);
        }
        return res.json({status: true, message: 'Balance was been added'});
    } catch (err) {
        log.error(err, 'consumer::addBalance::server error');
        if (t) {
            await t.rollback();
        }
        return res.status(500).json({ message: 'Error to add balance' });
    }
};

/**
 * @swagger
 * '/consumers/bulkAddBalance':
 *   post:
 *     tags:
 *       - Consumers
 *     summary: Bulk add balance
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               balance:
 *                 type: number
 *               ids:
 *                 type: array
 *                 items:
 *                   type: number
 *               balanceType:
 *                 type: string
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.bulkAddBalance = async (req, res) => {
    let t;
    try {
        const payload = { ...req.body };
        try {
            await isSchemeValid(consumersValidator.bulkAddBalance, payload);
        } catch (err) {
            loggerValidations.error(err, 'consumer::bulkAddBalance::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        const consumers = await Consumers.findAll({
            where: { id: { [Op.in]: payload.ids } },
            include: [
                { model: Regions, required: true }
            ]
        });
        const countryIsoList = consumers.map(i => i.region.isoCode);
        const allEquals = countryIsoList.every(el => el === countryIsoList[0]);
        if (!allEquals) {
            loggerValidations.error('Consumers must be from the same region.', 'consumer::bulkAddBalance::differentRegion');
            return res.status(409).json({ message: 'Invalid consumers list. All selected consumers must be from the same region.' });
        }
        if (!payload.ids.length || consumers.length !== payload.ids.length) {
            loggerValidations.error('Invalid consumers ids', 'consumer::bulkAddBalance::invalid consumers ids');
            return res.status(409).json({ message: 'Invalid consumers ids' });
        }
        const firebaseRegistrationTokens = [];
        const balanceHistoryPayload = [];

        t = await sequelize.transaction();

        for (let i = 0; i < consumers.length; i++) {
            const { id, phone, firebaseRegistrationToken } = consumers[i];
            if (firebaseRegistrationToken) {
                firebaseRegistrationTokens.push(firebaseRegistrationToken);
            }
            balanceHistoryPayload.push({
                userId: req.user.id,
                userEmail: req.user.email,
                consumerId: id,
                balance: payload.balance,
                consumerPhone: phone,
                type: payload.balanceType,
                date: new Date(),
            });
        }
        await Consumers.update({ balance: sequelize.literal(`balance + ${payload.balance}`)}, { where: { id: payload.ids }, transaction: t });
        await BalanceHistary.bulkCreate(balanceHistoryPayload, { transaction: t });
        await t.commit();
        if (firebaseRegistrationTokens.length && payload.balance > 0) {
            const template = fs.readFileSync(path.resolve('app/helpers/notifications/templates/addBalance.txt'), 'utf8').toString();
            await sendNotification(null, pupa(template, {
                balance: payload.balance,
                currency: consumers[0].region.currencyName
            }), firebaseRegistrationTokens);
        }
        return res.json({ status: true, message: 'Balance was been added' });
    } catch (err) {
        log.error(err, 'consumer::bulkAddBalance::server error');
        if (t) {
            await t.rollback();
        }
        return res.status(500).json({ message: 'Error to add balance' });
    }
};