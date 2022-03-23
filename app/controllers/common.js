const { Op } = require('sequelize');
const {
    sequelize,
    Sequelize,
    orders: Orders,
} = require('app/models/models');

const safeJsonParser = (params) => {
    try {
        let { limit, skip: offset, currentServiceProvider, sort, filter, search } = JSON.parse(params);
        return { limit, offset, currentServiceProvider, sort, filter, search }
    } catch (err) {
        return { limit: null, offset: null, currentServiceProvider: null, sort: null, filter: null, search: null }
    }
}

const getAggregateFunc = (functionName, field) => {
    if (functionName) {
        return Sequelize.fn(functionName, Sequelize.col(field));
    }
    if (field?.includes('+') && field.split('+').length > 1) {
        return sequelize.fn('SUM', (
            sequelize.fn('COALESCE', sequelize.col(field.split('+')[0].replace(/ /g,'')), 0),
            sequelize.literal('+'),
            sequelize.fn('COALESCE', sequelize.col(field.split('+')[1].replace(/ /g,'')), 0)
        ));
    }
}

const getAggregateData = (aggregateFunctions, name) => {
    let aggregateField = null;
    let aggregateFunc = null;
    if (!aggregateFunctions) {
        throw new Error("Missing aggregate functions.")
    }
    aggregateFunctions?.forEach(item => {
        if (typeof item === 'object' &&  !item[0].val && (item[1] === name || item[1] === name.split('_')[1]) ) {
            aggregateField = item[0]?.args[0]?.col;
            aggregateFunc = item[0]?.fn;
        }
        if (typeof item === 'object' && item[0].val && (item[1] === name || item[1] === name.split('_')[1])) {
            aggregateField = item[0]?.val;
            aggregateFunc = null;
        }
    });
    return {aggregateField, aggregateFunc}
}

const collectCustomFilterItem = (item, customFilter, customFilterNames, filter, filterType) => {
    const filterName = item.split(`_${filterType}`)[0];
    if (!customFilter[filterName]) {
        customFilter[filterName] = {
            [filterType]: filter[item],
            isLiteral: item.indexOf('_literal') !== -1
        };
    } else {
        customFilter[filterName][filterType] = filter[item];
    }
    if (customFilterNames.indexOf(filterName) === -1) {
        customFilterNames.push(filterName);
    }
}

const collectFilterItemForIncludes = (item, customFilter, customFilterNames, filterType) => {
    const filterFullName = item.field.split(`_${filterType}`)[0];
    const filterName = filterFullName.split('_')[2];
    if (!customFilter[filterName]) {
        const list = item.field.split('_');
        customFilter[filterName] = {
            [filterType]: item.value,
            model: filterFullName.split('_')[1],
            isLiteral: list[list.length-1] === 'literal' ? true : false
        };
    } else {
        customFilter[filterName][filterType] = item.value;
    }
    if (customFilterNames.indexOf(filterName) === -1) {
        customFilterNames.push(filterName);
    }
}

const collectFilterCondition = (res, customFilter, name, aggregateFunctions, operator, value) => {
    if (customFilter[name].isLiteral) {
        const {aggregateFunc, aggregateField} = getAggregateData(aggregateFunctions, name);
        res.having = res.having ? res.having : [];
        res.having.push(Sequelize.where(getAggregateFunc(aggregateFunc, aggregateField), operator, value));
    } else {
        res.where[name] = {[operator]: value};
    }
}

module.exports.getListPayload = (req, skipSP, aggregateFunctions) => {
    const params = req.query.params;
    const isKerpakOperator = req.user.isKerpakOperator;
    const serviceProviderId = req.user.serviceProviderId;
    let { currentServiceProvider } = safeJsonParser(params);
    let res = { distinct: true };
    res.where = {};
    if (isKerpakOperator && currentServiceProvider && !skipSP) {
        if (currentServiceProvider === 'unset') {
            res.where = {serviceProviderId: null}
        } else {
            res.where = {serviceProviderId: currentServiceProvider}
        }
    } else if(!isKerpakOperator && !skipSP) {
        res.where = {serviceProviderId: serviceProviderId}
    }
    if (params) {
        let { limit, offset, sort, filter, search } = safeJsonParser(params);
        if (limit) {
            res.limit = parseInt(limit);
        }
        if (offset) {
            res.offset = parseInt(offset);
        }
        if (sort && sort.field) {
            if (sort.field.indexOf('include_') !== -1) {
                res.associationOrder = {
                    field: sort.field,
                    sort: sort.order
                }
            } else if (sort.field.indexOf('literal_') !== -1) {
                const filed = sort.field.split('_')[1];
                res.order =  [
                    [sequelize.literal(filed), sort.order]
                ]
            } else {
                res.order =  [
                    [sort.field, sort.order]
                ]
            }
        }
        if (filter) {
            let customFilter = {};
            let customFilterNames = [];
            for (let i in filter) {
                if (i.indexOf('include_') !== -1) {
                    if (!res.associationFilter) {
                        res.associationFilter = [];
                    }
                    res.associationFilter.push({
                        field: i,
                        value: filter[i]
                    });
                    continue;
                } else {
                    if (i.indexOf('_min') !== -1) {
                        collectCustomFilterItem(i, customFilter, customFilterNames, filter, 'min');
                    } else if (i.indexOf('_max') !== -1) {
                        collectCustomFilterItem(i, customFilter, customFilterNames, filter, 'max');
                    } else if (i.indexOf('_in') !== -1) {
                        collectCustomFilterItem(i, customFilter, customFilterNames, filter, 'in');
                    } else if (i.indexOf('_is') !== -1) {
                        collectCustomFilterItem(i, customFilter, customFilterNames, filter, 'is');
                    } else if (i.indexOf('_eq') !== -1) {
                        const filterName = i.split('_eq')[0];
                        res.where[filterName] = {[Op.eq]: filter[i]};
                    } else {
                        res.where[i] = {[Op.startsWith]: filter[i]};
                    }
                }
            }

            for (let i in customFilterNames) {
                const name = customFilterNames[i];
                if (customFilter[name].min && customFilter[name].max) {
                    if (customFilter[name].isLiteral) {
                        const {aggregateFunc, aggregateField} = getAggregateData(aggregateFunctions, name);
                        res.having = res.having ? res.having : [];
                        res.having.push(Sequelize.where(
                            getAggregateFunc(aggregateFunc, aggregateField), {
                            [Op.and]: {
                                [Op.gte]: customFilter[name].min,
                                [Op.lte]: customFilter[name].max,
                            }
                        }));
                    } else {
                        res.where[name] = {
                            [Op.and]: {
                                [Op.gte]: customFilter[name].min,
                                [Op.lte]: customFilter[name].max,
                            }
                        }
                    }

                } else if (customFilter[name].min) {
                    collectFilterCondition(res, customFilter, name, aggregateFunctions, Op.gte, customFilter[name].min);
                } else if (customFilter[name].max) {
                    collectFilterCondition(res, customFilter, name, aggregateFunctions, Op.lte, customFilter[name].max);
                } else if (customFilter[name].in) {
                    collectFilterCondition(res, customFilter, name, aggregateFunctions, Op.in, customFilter[name].in);
                } else if (customFilter[name].is) {
                    if (customFilter[name].is === 'null') {
                        collectFilterCondition(res, customFilter, name, aggregateFunctions, Op.or, {
                            [Op.is]: null,
                            [Op.eq]: '',
                        });
                    } else if (customFilter[name].is === 'not null') {
                        collectFilterCondition(res, customFilter, name, aggregateFunctions, Op.and, {
                            [Op.not]: null,
                            [Op.ne]: '',
                        });
                    }
                }
            }
        }
        if (search) {
            let hasSearchInMainTable = false;
            for (let i in search.fields) {
                if (search.fields[i].indexOf('include_') !== -1) {
                    if (!res.associationSearch) {
                        res.associationSearch = [];
                    }
                    res.associationSearch.push({
                        field: search.fields[i],
                        value: search.value
                    });
                    continue;
                }
                if (!hasSearchInMainTable) {
                    res.where[Op.or] = [];
                    hasSearchInMainTable = true;
                }
                let obj = {};
                obj[search.fields[i]] = {[Op.like]: `%${search.value}%`};
                res.where[Op.or].push(obj);
            }
        }
    }

    return res;
};

module.exports.addAssociationOrder = (payload) => {
    if (payload.associationOrder) {
        let data = payload.associationOrder.field.split('_');
        for (let i in payload.include) {
            if (payload.include[i].model.name === data[1]) {
                payload.order = [
                    [{ model: payload.include[i].model }, data[2], payload.associationOrder.sort]
                ];
            }
        }
    }
    return payload;
};

module.exports.addAssociationSearch = (payload) => {
    if (payload.associationSearch) {
        for (let j in payload.associationSearch) {
            let data = payload.associationSearch[j].field.split('_');
            for (let i in payload.include) {
                if (payload.include[i].model.name === data[1]) {
                    if (!payload.include[i].where[Op.or]) {
                        payload.include[i].where[Op.or] = [];
                    }
                    let obj = {};
                    obj[data[2]] = {[Op.like]: `%${payload.associationSearch[j].value}%`};
                    payload.include[i].where[Op.or].push(obj);
                }
            }
        }
    }
    return payload;
}

module.exports.addAssociationFilter = (payload, aggregateFunctions) => {
    let customFilter = {};
    let customFilterNames = [];
    if (payload.associationFilter) {
        for (let i in payload.associationFilter) {
            const item = payload.associationFilter[i];
            if (item.field.indexOf('_min') !== -1) {
                collectFilterItemForIncludes(item, customFilter, customFilterNames, 'min');
            } else if (item.field.indexOf('_max') !== -1) {
                collectFilterItemForIncludes(item, customFilter, customFilterNames, 'max');
            } else if (item.field.indexOf('_in') !== -1) {
                collectFilterItemForIncludes(item, customFilter, customFilterNames, 'in');
            } else if (item.field.indexOf('_is') !== -1) {
                collectFilterItemForIncludes(item, customFilter, customFilterNames, 'is');
            }
        }

        for (let i in customFilterNames) {
            const name = customFilterNames[i];
            for (let i in payload.include) {

                if (customFilter[name].min && customFilter[name].max) {
                    if (payload.include[i].model.name === customFilter[name].model) {
                        if (customFilter[name].isLiteral) {
                            const {aggregateFunc, aggregateField} = getAggregateData(aggregateFunctions, name);
                            payload.include[i].having = payload.include[i].having ? payload.include[i].having : [];
                            payload.include[i].having.push(Sequelize.where(
                                getAggregateFunc(aggregateFunc, aggregateField), {
                                [Op.and]: {
                                    [Op.gte]: customFilter[name].min,
                                    [Op.lte]: customFilter[name].max,
                                }
                            }));
                        } else {
                            payload.include[i].where[name] = {
                                [Op.and]: {
                                    [Op.gte]: customFilter[name].min,
                                    [Op.lte]: customFilter[name].max,
                                }
                            }
                        }
                    }
                } else if (customFilter[name].min) {
                    if (payload.include[i].model.name === customFilter[name].model) {
                        collectFilterCondition(payload.include[i], customFilter, name, aggregateFunctions, Op.gte, customFilter[name].min);
                    }
                } else if (customFilter[name].max) {
                    if (payload.include[i].model.name === customFilter[name].model) {
                        collectFilterCondition(payload.include[i], customFilter, name, aggregateFunctions, Op.lte, customFilter[name].max);
                    }
                } else if (customFilter[name].in) {
                    if (payload.include[i].model.name === customFilter[name].model) {
                        collectFilterCondition(payload.include[i], customFilter, name, aggregateFunctions, Op.in, customFilter[name].in);
                    }
                } else if (customFilter[name].is) {
                    if (customFilter[name].is === 'null') {
                        if (payload.include[i].model.name === customFilter[name].model) {
                            collectFilterCondition(payload.include[i], customFilter, name, aggregateFunctions, Op.eq, null);
                        }
                    } else if (customFilter[name].is === 'not null') {
                        if (payload.include[i].model.name === customFilter[name].model) {
                            collectFilterCondition(payload.include[i], customFilter, name, aggregateFunctions, Op.ne, null);
                        }
                    }
                }

            }

        }
    }
    return payload;
}

module.exports.getOnePayload = (req, id, skipSP) => {
    const params = req.query.params;
    const isKerpakOperator = req.user.isKerpakOperator;
    const serviceProviderId = req.user.serviceProviderId;
    let { currentServiceProvider } = safeJsonParser(params);
    let res = { where: { id } };

    if (isKerpakOperator && currentServiceProvider && !skipSP) {
        res.where.serviceProviderId = currentServiceProvider;
    } else if (!isKerpakOperator && !skipSP) {
        res.where.serviceProviderId = serviceProviderId;
    }

    return res;
};

module.exports.getCurrentSP = (req) => {
    const isKerpakOperator = req.user.isKerpakOperator;
    if (isKerpakOperator) {
        return null;
    } else if (!isKerpakOperator) {
        return req.user.serviceProviderId;
    }
};

module.exports.getPayloadForNotificationFilter = (params) => {
    const payload = {
        where: {},
        include: []
    };
    if (params.platform) {
        payload.where.OS = {
            [Op.or]: []
        };
        params.platform.forEach(os => {
            if (os.title) {
                payload.where.OS[Op.or].push({ [Op.eq]: os.title })
            }
        });
    }
    if (params.consumerIds) {
        payload.where.id = {
            [Op.in]: []
        };
        params.consumerIds.split(',').forEach(consumerId => {
            payload.where.id[Op.in].push(consumerId)
        });
    }
    if (params.earliestOrderDate && params.latestOrderDate) {
        payload.where.lastOrderDate = {
            [Op.and]: {
                [Op.gte]: params.earliestOrderDate,
                [Op.lte]: params.latestOrderDate,
            }
        };
    } else if (params.earliestOrderDate) {
        payload.where.lastOrderDate = { [Op.gte]: params.earliestOrderDate };
    } else if (params.latestOrderDate) {
        payload.where.lastOrderDate = { [Op.lte]: params.latestOrderDate };
    }
    if (params.kioskOfLastOrder?.length) {
        payload.where.kioskIdOfLastOrder = {
            [Op.in]: []
        };
        params.kioskOfLastOrder.forEach(kiosk => {
            payload.where.kioskIdOfLastOrder[Op.in].push(kiosk.id)
        });
    }
    if (params.numberOfOrdersMin || params.numberOfOrdersMax) {
        payload.include.push({
            model: Orders,
            where: {
                orderStatus: 'successful'
            },
            attributes: [],
        });
        if (params.numberOfOrdersMin || params.numberOfOrdersMax) {
            payload.group = [Sequelize.col('consumers.id')];
            if (params.numberOfOrdersMin && params.numberOfOrdersMax) {
                payload.having = Sequelize.where(Sequelize.fn("COUNT", Sequelize.col('orders.id')), {
                    [Op.and]: {
                        [Op.gte]: params.numberOfOrdersMin,
                        [Op.lte]: params.numberOfOrdersMax,
                    }
                });
            } else if (params.numberOfOrdersMin) {
                payload.having = Sequelize.where(Sequelize.fn("COUNT", Sequelize.col('orders.id')), Op.gte, params.numberOfOrdersMin);
            } else if (params.numberOfOrdersMax) {
                payload.having = Sequelize.where(Sequelize.fn("COUNT", Sequelize.col('orders.id')), Op.lte, params.numberOfOrdersMax);
            }
        }
    }
    return payload;
};

module.exports.timeToTimestamp = (time) => {
    const newDate = new Date();
    const dateArray = time.split(':');

    newDate.setHours(dateArray[0]);
    newDate.setMinutes(dateArray[1]);

    const timestamp = newDate.getTime();
    return timestamp;
};

module.exports.addOrderById = (payload, uniqueKey = 'id', isLiteral) => {
    let uniqueOrder = [uniqueKey, 'asc'];
    if (isLiteral) {
        uniqueOrder = [sequelize.literal(uniqueKey), 'asc'];
    }
    if (payload.order)  {
        if (payload.order.find(item => (isLiteral ? item[0].val : item[0]) !== uniqueKey)) {
            payload.order.push(uniqueOrder);
        }
    } else {
        payload.order = [uniqueOrder];
    }
    return payload;
};

module.exports.calculatePrice = sum => Math.round(Number(sum) * 100);