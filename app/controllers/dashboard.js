const { Op } = require('sequelize');
const moment = require('moment');
const {
    orders: Orders,
    ordersProductItems: OrdersProductItems,
    kiosks: Kiosks,
    connectionLogs: ConnectionLogs,
    serviceProviders: ServiceProviders,
    Sequelize,
    sequelize
} = require('app/models/models');
const log = require('app/helpers/logger');
const { getListPayload } = require('app/controllers/common');
const { getSPTimeZone } = require('app/helpers/utils');

module.exports.getBestSellers = async (req, res) => {
    let payload = {};
    const params = JSON.parse(req.query.params);
    const spId = getServiceProvider(req);
    const filterBy = params.filterBy;

    const { startDate, endDate } = JSON.parse(req.query.params).dateRange;
    payload.include = [
        {
            model: Orders,
            attributes: [],
            where: {
                orderDate: { [Op.gte]: moment(startDate).toDate(), [Op.lte]: moment(endDate).toDate() },
                orderStatus: 'successful'
            },
            required: true,
            include: [
                ...(params.currentRegion && [{model: ServiceProviders, where: {regionId: params.currentRegion}, attributes: ['id', 'regionId'], required: true}])
            ]
        }
    ];
    if (spId) {
        payload.include[0].where.serviceProviderId = spId;
    }

    payload.group = [Sequelize.col('ordersProductItems.sku')];
    if (params.currentRegion) {
        payload.group.push(Sequelize.col('order.serviceProvider.id'));
    }
    payload.attributes = ['sku',
        [Sequelize.fn('max', Sequelize.col('ordersProductItems.id')), 'id'],
    ];
    if (filterBy === 'sales') {
        payload.attributes.push([Sequelize.fn('sum', Sequelize.col('ordersProductItems.total_price')), 'sales']);
    } else {
        payload.attributes.push([Sequelize.fn('count', Sequelize.col('ordersProductItems.id')), 'count']);
    }
    payload.raw = true;
    payload.limit = 5;
    if (filterBy === 'sales') {
        payload.order = Sequelize.literal('sales DESC');
    } else {
        payload.order = Sequelize.literal('count DESC');
    }
    OrdersProductItems.findAll(payload)
        .then((data) => {
            const ids = [];
            for (let i in data) {
                ids.push(data[i].id);
            };
            OrdersProductItems.findAll({
                where: {
                    id: { [Sequelize.Op.in]: ids }
                },
                attributes: ['id', 'name', 'image']
            }).then((metaData) => {
                return res.json({ data: data, metaData: metaData });
            });
        })
        .catch((err) => {
            log.error(err, 'dashboard::kiosks::getBestSellers');
            return res.status(500).json({ message: 'Error in get top kiosks list' });
        });
};

module.exports.getTopKiosks = async (req, res) => {
    const params = JSON.parse(req.query.params);
    const spId = getServiceProvider(req);
    const filterBy = params.filterBy;

    const { startDate, endDate } = JSON.parse(req.query.params).dateRange;

    const payload = {
        where: {
            orderDate: {
                [Op.gte]: moment(startDate).toDate(),
                [Op.lte]: moment(endDate).toDate()
            },
            orderStatus: 'successful'
        },
        attributes: [['stored_kiosk_id', 'kioskId'],
            [Sequelize.fn('max', Sequelize.col('orders.id')), 'id'],
        ],
        group: [Sequelize.col('orders.stored_kiosk_id')],
        order: Sequelize.literal('sales DESC'),
        limit: 10
    }
    if (params.currentRegion) {
        payload.include = [
            {model: ServiceProviders, where: {regionId: params.currentRegion}, attributes: ['id', 'regionId'], required: true}
        ];
        payload.group.push('serviceProvider.id');
    }
    if (spId) {
        payload.where.serviceProviderId = spId;
    }

    if (filterBy === 'sales') {
        payload.attributes.push([Sequelize.fn('sum', Sequelize.col('orders.price')), 'sales']);
        payload.order = Sequelize.literal('sales DESC');
    } else {
        payload.attributes.push([Sequelize.fn('sum', Sequelize.col('orders.products_count')), 'count']);
        payload.order = Sequelize.literal('count DESC');
    }

    Orders.findAll(payload)
        .then((data) => {
            const ids = [];
            for (let i in data) {
                ids.push(data[i].id);
            };
            Orders.findAll({
                where: {
                    id: { [Sequelize.Op.in]: ids }
                },
                attributes: ['id', 'kioskName']
            }).then((metaData) => {
                return res.json({ data: data, metaData: metaData });
            });
        })
        .catch((err) => {
            log.error(err, 'dashboard::kiosks::getTopKiosks');
            return res.status(500).json({ message: 'Error in get top kiosks list' });
        });
};

const collectValidPayload = (req, dayDiff, isTotal) => {
    const params = JSON.parse(req.query.params);

    let payload = getListPayload(req);
    const timezone = getSPTimeZone(req.user);
    payload.where.orderStatus = 'successful';
    const format = dayDiff === 1 ? '%d/%m/%y,%H:' : '%d/%m/%y';
    payload.attributes = [
        [sequelize.fn('DATE_FORMAT', sequelize.fn('CONVERT_TZ', sequelize.col('order_date'), '+00:00', timezone), format), 'day'],
        isTotal ? [sequelize.literal(`COUNT(*)`), 'count'] : [sequelize.fn('sum', sequelize.col('price')), 'sum']
    ];
    payload.include = [
        (params.currentRegion && {model: ServiceProviders, where: {regionId: params.currentRegion}, attributes: [], required: true})
    ];
    payload.order = sequelize.literal(`STR_TO_DATE(day, '${format}')`);
    payload.group = [sequelize.col('day')];
    payload.raw = true;
    return payload;
}

const getBackDate = (currDate, dayDiff) => {
  const backDate = new Date(currDate);
  backDate.setDate(new Date(currDate).getDate() - dayDiff);
  return backDate;
}

const getDayDiff = (req) => {
  const params = JSON.parse(req.query.params);
  let diff = 0;
  let dayDiff = 0;
  if (params.filter.orderDate_max && params.filter.orderDate_min) {
      diff = new Date(params.filter.orderDate_max).getTime() - new Date(params.filter.orderDate_min).getTime();
      dayDiff = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return dayDiff;
}

const getTotalPayload = (startDate, endDate, spId, isTotal, region) => {
    const payload = {
        where: {
            orderStatus: 'successful'
        }
    };
    if (spId) {
        payload.where.serviceProviderId = spId;
    }
    payload.where = {
        ...payload.where,
        orderDate: {
            [Op.and]: {
                [Op.gte]: startDate,
                [Op.lte]: endDate,
            }
        }
    };
    payload.include = [
        {model: ServiceProviders, where: {regionId: region}, attributes: [], required: true}
    ];
    payload.attributes = [
        isTotal ? [sequelize.literal(`COUNT(*)`), 'count'] : [sequelize.fn('sum', sequelize.col('price')), 'sum']
    ];
    payload.raw = true;
    return payload;
}

const getServiceProvider = (req) => {
    const params = req.query.params;
    const isKerpakOperator = req.user.isKerpakOperator;
    const serviceProviderId = req.user.serviceProviderId;
    let { currentServiceProvider } = JSON.parse(params);
    if (isKerpakOperator && currentServiceProvider) {
        if (currentServiceProvider === 'unset') {
            return null;
        } else {
            return currentServiceProvider;
        }
    } else if(!isKerpakOperator) {
        return serviceProviderId;
    }
}

const analyseData = (metadata, prevMetadata, isTotal) => {
    let percent = 0;
    let decreased = false;
    const sum = isTotal ? metadata.count : metadata.sum;
    const prevSum = isTotal ? prevMetadata.count : prevMetadata.sum;
    if (prevSum === 0) {
      percent = 0;
      decreased = false;
    } else if (sum > prevSum) {
      percent = Math.round((sum - prevSum) / prevSum * 100);
      decreased = false;
    } else if (sum < prevSum) {
      percent = Math.round((Math.abs(sum - prevSum)) / prevSum * 100);
      decreased = true;
    }

    return { percent, decreased };
}

const getPrevDateCorrespondingToToday = (date_min, day_max, datDiff) => {
    const prevOrderDateMax = new Date(date_min);
    prevOrderDateMax.setMinutes(-1);

    if (datDiff === 1 && new Date().getDate() === new Date(day_max).getDate()) {
        prevOrderDateMax.setHours((new Date(day_max).getHours()));
        prevOrderDateMax.setMinutes((new Date(day_max).getMinutes()));
        prevOrderDateMax.setSeconds((new Date(day_max).getSeconds()));
    }
    return prevOrderDateMax;
}

module.exports.salesDashboard = async (req, res) => {
    let dayDiff = getDayDiff(req);
    const payload = collectValidPayload(req, dayDiff, false);

    const params = JSON.parse(req.query.params);
    const {orderDate_min, orderDate_max} = params.filter;
    const serviceProvider = getServiceProvider(req);
    const backDate = getBackDate(orderDate_min, dayDiff);
    const prevOrderDateMax = getPrevDateCorrespondingToToday(orderDate_min, orderDate_max, dayDiff);
    const totalPayload = getTotalPayload(orderDate_min, orderDate_max, serviceProvider, false, params.currentRegion);
    const totalPayloadPrev = getTotalPayload(backDate, prevOrderDateMax, serviceProvider, false, params.currentRegion);

    Orders.findAll(payload).then((rows) => {
        Orders.sum('price', totalPayload).then((ordersSum) => {
            const metadata = {sum: ordersSum};
            Orders.sum('price', totalPayloadPrev).then((ordersSumPrev) => {
                const metadataPrev = {sum: ordersSumPrev};
                const {percent, decreased} = analyseData(metadata, metadataPrev, false);
                return res.json({ data: rows, metadata, metadataPrev, analyzedData: {percent, decreased} });
            }).catch((err) => {
                log.error(err, 'dashboard::order::getSalesDashboard::error in orders sum prev');
                return res.status(500).json({ message: 'Error in get sales for dashboard list' });
            });
        }).catch((err) => {
            log.error(err, 'dashboard::order::getSalesDashboard::error in orders sum');
            return res.status(500).json({ message: 'Error in get sales for dashboard list' });
        });
    }).catch((err) => {
        log.error(err, 'dashboard::order::getSalesDashboard::error in get orders');
        return res.status(500).json({ message: 'Error in get sales for dashboard list' });
    });
};

module.exports.transactionsDashboard = async (req, res) => {
    let dayDiff = getDayDiff(req);
    const payload = collectValidPayload(req, dayDiff, true);

    const params = JSON.parse(req.query.params);
    const {orderDate_min, orderDate_max} = params.filter;
    const backDate = getBackDate(orderDate_min, dayDiff);
    const prevOrderDateMax = getPrevDateCorrespondingToToday(orderDate_min, orderDate_max, dayDiff);
    const serviceProvider = getServiceProvider(req);
    const totalPayload = getTotalPayload(orderDate_min, orderDate_max, serviceProvider, true, params.currentRegion);
    const totalPayloadPrev = getTotalPayload(backDate, prevOrderDateMax, serviceProvider, true, params.currentRegion);

    Orders.findAll(payload).then((rows) => {
        Orders.count(totalPayload).then((ordersCount) => {
            const metadata = {count: ordersCount};
            Orders.count(totalPayloadPrev).then((ordersCountPrev) => {
                const metadataPrev = {count: ordersCountPrev};
                const {percent, decreased} = analyseData(metadata, metadataPrev, true);
                return res.json({ data: rows, metadata, metadataPrev, analyzedData: {percent, decreased} });
            }).catch((err) => {
                log.error(err, 'dashboard::order::getTransactionsDashboard::error in get prev orders count');
                return res.status(500).json({ message: 'Error in get transactions for dashboard list' });
            });
      }).catch((err) => {
            log.error(err, 'dashboard::order::getTransactionsDashboard::error in get orders count');
            return res.status(500).json({ message: 'Error in get transactions for dashboard list' });
      });
  }).catch((err) => {
        log.error(err, 'dashboard::order::getTransactionsDashboard::error in get orders');
        return res.status(500).json({ message: 'Error in get transactions for dashboard list' });
  });
};

module.exports.getSalesByCategory = async (req, res) => {
    const params = JSON.parse(req.query.params);
    const { startDate, endDate } = params.dateRange;
    let payload = {
        group: [Sequelize.col('ordersProductItems.category')],
        where: {
            category: { [Op.ne]: null },
        },
        attributes: [
            'category',
            [Sequelize.fn('SUM', Sequelize.col('ordersProductItems.total_price')), 'totalPrice'],
        ],
        include: [
            {
                model: Orders,
                attributes: [],
                where: {
                    orderStatus: 'successful',
                    orderDate: {
                        [Op.gte]: moment(startDate).toDate(),
                        [Op.lte]: moment(endDate).toDate()
                    },
                    serviceProviderId: getServiceProvider(req) || null
                },
                required: true,
                include: [
                    ...(params.currentRegion && [{model: ServiceProviders, where: {regionId: params.currentRegion}, attributes: ['id', 'regionId'], required: true}])
                ]
            },
        ],
        order: Sequelize.literal('totalPrice DESC')
    };
    if (params.currentRegion) {
        payload.group.push(Sequelize.col('order.serviceProvider.id'));
    }
    OrdersProductItems.findAll(payload)
        .then((data) => {
            res.json({ data: data });
        })
        .catch((err) => {
            log.error(err, 'dashboard::controller::getSalesByCategory');
            return res.status(500).json({ message: 'Error in get sales by category list' });
        });
};

const getDayDiffLogs = (req) => {
    const params = JSON.parse(req.query.params);
    let diff = 0;
    let dayDiff = 0;
    if (params.filter.disconnectedAt_max && params.filter.disconnectedAt_min) {
        diff = new Date(params.filter.disconnectedAt_max).getTime() - new Date(params.filter.disconnectedAt_min).getTime();
        dayDiff = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    return dayDiff;
}

const collectLogsPayload = (req, dayDiff) => {
    let payload = getListPayload(req);
    const timezone = getSPTimeZone(req);
    payload.where.kioskId = {
        [Op.ne]: null
    };
    delete payload.where.serviceProviderId;
    if (dayDiff === 1) {
        payload.attributes = [
            [sequelize.fn('DATE_FORMAT', sequelize.fn('CONVERT_TZ', sequelize.col('disconnectedAt'), '+00:00', timezone), '%d/%m/%y,%H:'), 'day'],
            [sequelize.literal(`COUNT(*)`), 'count'],
            "kioskId"
        ];
        payload.order = sequelize.literal("STR_TO_DATE(day, '%d/%m/%y,%H:')");
    } else {
        payload.attributes = [
            [sequelize.fn('DATE_FORMAT', sequelize.fn('CONVERT_TZ', sequelize.col('disconnectedAt'), '+00:00', timezone), '%d/%m/%y'), 'day'],
            [sequelize.literal(`COUNT(*)`), 'count'],
            "kioskId"
        ];
        payload.order = sequelize.literal("STR_TO_DATE(day, '%d/%m/%y')");
    }
    payload.group = [sequelize.col('day'), sequelize.col('kiosk_id')];
    return payload;
}

module.exports.getLogs = async (req, res) => {
    let dayDiff = getDayDiffLogs(req);
    const payload = collectLogsPayload(req, dayDiff, true);
    payload.include = [{
        model: Kiosks,
        attributes: ['displayName'],
    }]
    ConnectionLogs.findAll(payload).then((rows) => {
        return res.json({ data: rows });
    }).catch((err) => {
        log.error(err, 'dashboard::getLogs');
        return res.status(500).json({ message: 'Error in get transactions for dashboard list' });
  });
};

module.exports.getKiosksVitals = async (req, res) => {
    try {
        let payload = getListPayload(req);
        const params = JSON.parse(req.query.params);
        payload.include = [
            {
                model: ServiceProviders,
                required: true,
                attributes: ['id', 'regionId'],
                ...(params.currentRegion && {where: {regionId: params.currentRegion}})
            }
        ]
        payload.attributes = ['id', 'status', 'hostName', 'displayName', 'temperature', 'connected', 'lastActivity', 'temperature'];
        if (!payload.where) {
            payload.where = {};
        }
        payload.where.status = 'active';
        const { count, rows } = await Kiosks.findAndCountAll(payload);
        return res.json({ count: count, data: rows });
    } catch(err) {
        log.error(err, 'dashboard::kiosks::getKiosksVitals');
        return res.status(500).json({ message: 'Error in get kiosk vitals widget data.' });
    }
};