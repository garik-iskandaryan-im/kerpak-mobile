const {
    kioskSessions: KioskSessions,
    users: Users,
    consumers: Consumers,
    orders: Orders,
    ordersProductItems: OrdersProductItems,
    serviceProviders: ServiceProviders,
    regions: Regions,
    sequelize,
} = require('app/models/models');
const { Op } = require("sequelize");
const log = require('app/helpers/logger');
const { getListPayload, getOnePayload, addAssociationOrder, addOrderById } = require('app/controllers/common');

module.exports.list = async (req, res) => {
    let payload = getListPayload(req);
    payload.include = [{
        model: Users,
        required: false,
        attributes: ['email']
    }];
    payload = addOrderById(payload);
    KioskSessions.findAndCountAll(payload)
        .then(({ count, rows }) => {
            return res.json({ count, data: rows });
        })
        .catch((err) => {
            log.error(err, 'kioskSessions::getKioskSessionsList');
            return res.status(500).json({ message: 'Error in get kiosk sessions list' });
        });
};

module.exports.get = async (req, res) => {
    try {
        const id = req.params.id;
        const payload = { ...getOnePayload(req, id) };
        payload.include = [
            {
                model: Orders,
                required: false,
                include: [
                    {
                        model: OrdersProductItems,
                        attributes: ['id', 'name', 'price', 'barcode'],
                        required: true,
                    }
                ]
            },
            {
                model: Consumers,
                attributes: ['id', 'createdAt'],
                required: false,
            },
            {
                model: Users,
                required: false,
                attributes: ['id', 'email'],
            },
            {
                model: ServiceProviders,
                required: true,
                attributes: ['id'],
                include: [{ model: Regions, attributes: ['currencyName'], required: true }]
            }
        ];
        const kioskSession = await KioskSessions.findOne(payload);
        if (kioskSession?.consumerId && kioskSession.consumer) {
            let consumer;
            const ordersPayload = {
                ...getListPayload(req),
                attributes: [
                    [sequelize.fn('sum', sequelize.col('orders.price')), 'historyPrice'],
                ]
            };
            ordersPayload.where.consumerId = kioskSession.consumerId;
            ordersPayload.where.orderStatus = 'successful';
            try {
                consumer = await Orders.findAndCountAll(ordersPayload);
            } catch (err) {
                log.error(err, 'kioskSessions::orders::getOrders');
                return res.status(500).json({ message: 'Error in get orders list' });
            }
            kioskSession.consumer.dataValues.historyPrice = consumer?.rows[0]?.dataValues.historyPrice;
            kioskSession.consumer.dataValues.ordersCount = consumer?.count;
        }
        return res.json(kioskSession);
    } catch (err) {
        log.error(err, 'kioskSessions::getKioskSession');
        return res.status(500).json({ message: 'Error in get kioskSession' });
    }
};

module.exports.getPrevious = async (req, res) => {
    const id = req.params.id;
    const payload = {
        ...getListPayload(req),
        attributes: ['id'],
        order: [['id', 'DESC']],
        limit: 2
    };
    payload.where.id = { [Op.lt]: id };
    return KioskSessions.findAll(payload)
        .then((kioskSession) => {
            return res.json(kioskSession);
        })
        .catch((err) => {
            log.error(err, 'kioskSessions::getPrevious');
            return res.status(500).json({ message: 'Error in get previous kioskSession' });
        });
};

module.exports.getNext = async (req, res) => {
    const id = req.params.id;
    const payload = {
        ...getListPayload(req),
        attributes: ['id'],
        limit: 2
    };
    payload.where.id = { [Op.gt]: id };
    return KioskSessions.findAll(payload)
        .then((kioskSession) => {
            return res.json(kioskSession);
        })
        .catch((err) => {
            log.error(err, 'kioskSessions::getNext');
            return res.status(500).json({ message: 'Error in get next kioskSession' });
        });
};

module.exports.listForConsumer = async (req, res) => {
    try {
        const consumerId = req.params.id;
        let payload = {
            ...getListPayload(req),
            attributes: ['id', 'orderId', 'kioskName', 'startDate'],
            include: [
                {
                    model: Orders,
                    required: false,
                    attributes: ['orderStatus', 'price'],
                    include: [
                        {
                            model: ServiceProviders,
                            attributes: ['id'],
                            include: [{ model: Regions, attributes: ['currencySymbol'] ,required: true }]
                        }
                    ]
                }
            ],
        };
        payload.where.consumerId = consumerId;
        payload = addAssociationOrder(payload);
        payload = addOrderById(payload);

        const { count, rows } = await KioskSessions.findAndCountAll(payload)
        return res.json({ count, data: rows });
    } catch (err) {
        log.error(err, 'kioskSessions::listForConsumer');
        return res.status(500).json({ message: 'Error in get user list for consumer' });
    }
};
