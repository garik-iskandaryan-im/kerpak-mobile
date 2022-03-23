const { Op } = require('sequelize');
const moment = require('moment');

const {
    kiosks: Kiosks,
    orders: Orders,
    discountSchedules: DiscountSchedules,
    hoursOfOperations: HoursOfOperations,
    serviceProviders: ServiceProviders,
    productItems: ProductItems,
    regions: Regions,
    Sequelize,
} = require('app/models/models');
const { kiosks: kioskValidator } = require('app/schemes');
const { isSchemeValid, isSchemeValidSync } = require('app/helpers/validate');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');
const { getListPayload, getOnePayload, addOrderById } = require('app/controllers/common');
const deviceManger = require('app/deviceManager/deviceManager');

module.exports.getNames = async (req, res) => {
    let payload = getListPayload(req);
    payload.attributes = ['id', 'displayName'];
    Kiosks.findAndCountAll(payload)
        .then(({ count, rows }) => {
            return res.json({ count, data: rows });
        })
        .catch((err) => {
            log.error(err, 'kiosks::controller::getNames');
            return res.status(500).json({ message: 'Error in get kiosks list' });
        });
};

module.exports.list = async (req, res) => {
    try {
        let payload = getListPayload(req);

        payload.include = [
            {
                model: ServiceProviders, attributes: ['id', 'legalName'], required: false,
                include: [{ model: Regions, attributes: ['currencySymbol'] ,required: true }]
            },
            {
                model: ProductItems,
                attributes: [],
                required: false,
                where: { status: 'available', archived: false }
            }
        ];
        payload.subQuery = false;
        payload.attributes = {
            include: [
                [Sequelize.fn('count', Sequelize.col('productItems.id')), 'productItemsCount']
            ]
        };
        payload.group = ['id'];
        payload = addOrderById(payload);

        const { count, rows } = await Kiosks.findAndCountAll(payload);
        const ids = [];
        for (let i in rows) {
            ids.push(rows[i].id);
        }
        const metaData = await Orders.findAll({
            where: {
                kioskId: { [Sequelize.Op.in]: ids },
                orderStatus: 'successful',
                orderDate: { [Op.gte]: moment().subtract(1, 'days').toDate() }
            },

            attributes: [
                'kioskId',
                [Sequelize.fn('sum', Sequelize.col('orders.price')), 'salesCountDay'],
                [Sequelize.fn('count', Sequelize.col('orders.id')), 'transactionsCountDay']
            ],
            raw: true,
            group: ['kioskId']
        });
        const getDaySalesData = (kioskId, metaData) => {
            const data = metaData.filter(item => {
                return item.kioskId === kioskId;
            });
            let salesCountDay = 0;
            let transactionsCountDay = 0;
            if (data.length) {
                salesCountDay = data[0].salesCountDay;
                transactionsCountDay = data[0].transactionsCountDay;
            }
            return { salesCountDay, transactionsCountDay }
        };
        for (let i in rows) {
            const { salesCountDay, transactionsCountDay } = getDaySalesData(rows[i].id, metaData);
            rows[i].dataValues.salesCountDay = salesCountDay;
            rows[i].dataValues.transactionsCountDay = transactionsCountDay;
        }
        return res.json({ count: count.length, data: rows });
    } catch (err) {
        log.error(err, 'kiosks::controller::getKiosks');
        return res.status(500).json({ message: 'Error in get user list' });
    }
};

module.exports.availableItemsByKiosk = async (req, res) => {
    try {
        let payload = getListPayload(req);
        payload.subQuery = false;
        payload.group = [Sequelize.col('kiosks.id')];
        payload.attributes = ['id', 'displayName', 'kioskLoad', 'lastTransferDate',  [Sequelize.fn('COUNT', Sequelize.col('productItems.id')), 'productItemsCount']];
        payload.include = [
            { model: ProductItems, where: {status: 'available'}, attributes: []},
        ];
        payload = addOrderById(payload);

        const { count, rows } = await Kiosks.findAndCountAll(payload);
        let data = JSON.parse(JSON.stringify(rows));
        return res.json({ count: count.length, data: data });
    } catch (err) {
        log.error(err, 'kiosks::availableItemsByKiosk');
        return res.status(500).json({ message: 'Error in get available items by kiosk' });
    }
};

module.exports.get = async (req, res) => {
    try {
        const id = Number(req.params.id);
        try {
            await isSchemeValid(kioskValidator.get, { id });
        } catch (err) {
            loggerValidations.error(err, 'kiosk::getKiosk::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        let payload = getOnePayload(req, id);
        // TODO need to remove
        payload.include = [
            { model: DiscountSchedules, as: 'discountSchedules', required: false },
            { model: HoursOfOperations, as: 'hoursOfOperations', required: false },
        ];
        const kiosk = await Kiosks.findOne(payload);

        if (!kiosk) {
            return res.status(404).json({ message: 'kiosk not found' });
        }

        return res.json(kiosk);
    } catch (err) {
        log.error(err, 'kiosk::getKiosk::server error');
        return res.status(500).json({ message: 'Error in get kiosk' });
    }
};

module.exports.create = async (req, res) => {
    try {
        const payload = { ...req.body };
        let kiosk;
        try {
            kiosk = await isSchemeValid(kioskValidator.create, payload);
        } catch (err) {
            loggerValidations.error(err, 'kiosk::create::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        if (kiosk.deliveryTransferTimeTo && kiosk.deliveryTransferTimeTo
            && new Date(kiosk.deliveryTransferTimeTo).getTime() < new Date(kiosk.deliveryTransferTimeFrom).getTime()) {
            log.error('validation failed: Invalid delivery transfer time', 'kiosk::create::invalid delivery transfer time');
            return res.status(400).json({ message: 'validation failed: Invalid delivery transfer time' });
        }
        const createdKiosk = await Kiosks.create(kiosk, {
            // TODO need to remove
            include: [{
                association: Kiosks.associations.hoursOfOperations,
            }, {
                association: Kiosks.associations.discountSchedules,
            }]
        });
        if (!createdKiosk) {
            log.error(createdKiosk, 'kiosk::create::kioskCreate');
            return res.status(500).json({ message: 'Error in create kiosk' });
        }
        if (createdKiosk.status === 'active' && createdKiosk.useSocket) {
            await deviceManger.allowConnection(createdKiosk.id);
        }
        return res.json({ kiosk: createdKiosk, message: 'kiosk has been created' });
    } catch (err) {
        log.error(err, 'kiosk::create::server error');
        return res.status(500).json({ message: 'Error in create kiosk' });
    }
};

module.exports.update = async (req, res) => {
    try {
        const payload = { ...req.body };
        const id = Number(req.params.id);
        // TODO need to remove (hoursOfOperations, discountSchedules)
        let { isValid, data: { hoursOfOperations, discountSchedules, ...updates }, errors } = isSchemeValidSync(kioskValidator.update, payload);
        if (!isValid) {
            log.error(errors, 'kiosk::update::validation');
            return res.status(400).json({ message: 'validation failed' });
        }
        if (updates.deliveryTransferTimeTo && updates.deliveryTransferTimeTo
            && new Date(updates.deliveryTransferTimeTo).getTime() < new Date(updates.deliveryTransferTimeFrom).getTime()) {
            log.error('validation failed: Invalid delivery transfer time', 'kiosk::update::invalid delivery transfer time');
            return res.status(400).json({ message: 'validation failed: Invalid delivery transfer time' });
        }
        // TODO need to remove
        if (!hoursOfOperations) {
            hoursOfOperations = [];
        }
        // TODO need to remove
        if (!discountSchedules) {
            discountSchedules = [];
        }
        // clear data
        delete updates.connected;
        delete updates.connectionEmail;
        delete updates.doorStatus;
        delete updates.id;
        delete updates.isDoorOpened;
        delete updates.isLocked;
        delete updates.isPortError;
        delete updates.isTempSensorError;
        delete updates.portError;
        delete updates.teltonikaHost;
        delete updates.temperature;
        delete updates.temperatureEmail;
        const { useSocket, status } = await Kiosks.findOne({ where: { id }});
        if (status === 'active' && useSocket) {
            if (updates.status !== 'active' || !updates.useSocket) {
                await deviceManger.disallowConnection(id);
            }
        } else {
            if (updates.status === 'active' && updates.useSocket) {
                await deviceManger.allowConnection(id);
            }
        }
        if (status === 'active' && updates.status !== 'active') {
            updates.connected = null;
            updates.temperatureEmail = null;
        }
        await Kiosks.update(updates, { where: { id } });
        // TODO need to remove
        await Promise.all(hoursOfOperations.map(
            async item => await HoursOfOperations.update(item, { where: { id: item.id, kioskId: id } }))
        );
        // TODO need to remove
        await Promise.all(discountSchedules.map(
            async item => await DiscountSchedules.update(item, { where: { id: item.id, kioskId: id } }))
        );
        const kiosk = await Kiosks.findOne({
            where: { id },
            // TODO need to remove
            include: [
                { model: DiscountSchedules, as: 'discountSchedules', required: false },
                { model: HoursOfOperations, as: 'hoursOfOperations', required: false },
            ]
        });
        return res.json({ kiosk });
    } catch (err) {
        log.error(err, 'kiosk::update::server error');
        return res.status(500).json({ message: 'Error in update kiosk' });
    }
};

/**
 * @swagger
 * '/kiosk/{id}/name':
 *   get:
 *     tags:
 *       - Kiosks
 *     summary: Get kiosk short data
 *     description: ''
 *     parameters:
 *       - name: id
 *         in: path
 *         description: kiosk ID
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
module.exports.getName = async (req, res) => {
    try {
        const id = Number(req.params.id);
        try {
            await isSchemeValid(kioskValidator.get, { id });
        } catch (err) {
            loggerValidations.error(err, 'kiosk::getName::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        let payload = getOnePayload(req, id);
        payload.attributes = ['id', 'displayName'];
        const kiosk = await Kiosks.findOne(payload);

        if (!kiosk) {
            return res.status(404).json({ message: 'kiosk not found' });
        }

        return res.json(kiosk);
    } catch (err) {
        log.error(err, 'kiosk::getName::server error');
        return res.status(500).json({ message: 'Error in get kiosk name' });
    }
};

/**
 * @swagger
 * '/serviceProviders/{spId}/kiosks':
 *   get:
 *     tags:
 *       - Kiosks
 *     summary: Get kiosk by service provider
 *     description: ''
 *     parameters:
 *       - name: spId
 *         in: path
 *         description: sp ID
 *         required: true
 *         type: number
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
 module.exports.getKiosksBySP = async (req, res) => {
    try {
        const id = Number(req.params.spId);
        let { isValid, errors } = isSchemeValidSync(kioskValidator.get, { id });
        if (!isValid) {
            log.error(errors, 'kiosks::getKiosksBySP::validation');
            return res.status(400).json({ message: 'validation failed' });
        }
        if (!req.user.isKerpakOperator && id !== req.user.serviceProviderId) {
            log.error('kiosks::getKiosksBySP::forbidden');
            return res.status(403).json({ message: 'Forbidden' });
        }
        let payload = getListPayload(req);
        payload.attributes = ['id', 'displayName', 'address1', 'address2'];
        if (!payload.where) {
            payload.where = {};
        }
        payload.where.serviceProviderId = id;
        const kiosks = await Kiosks.findAll(payload);
        return res.json(kiosks);
    } catch (err) {
        log.error(err, 'kiosk::getKiosksBySP');
        return res.status(500).json({ message: 'Something went wrong.' });
    }
};
