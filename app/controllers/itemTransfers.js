const { Op } = require('sequelize');
const moment = require('moment');
const pupa = require('pupa');

const {
    itemTransfers: ItemTransfers,
    itemTransfersMenuItems: ItemTransfersMenuItems,
    kiosks: Kiosks,
    menuItems: MenuItems,
    menus: Menus,
    productItems: ProductItems,
    serviceProviders: ServiceProviders,
    warehouses: Warehouses,
    preOrders: PreOrders,
    consumers: Consumers,
    regions: Regions,
    sequelize,
    Sequelize
} = require('app/models/models');
const { kiosks: kioskValidator, itemTransfers: itemTransfersValidator } = require('app/schemes');
const { isSchemeValid, isSchemeValidSync } = require('app/helpers/validate');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');
const CONSTANTS = require('app/constants');
const { PRE_ORDER_STATUS } = require('app/constants');
const { sendNotification } = require('app/services/firebase');
const fs = require('fs');
const path = require('path');
const { getSPTimeZone } = require('app/helpers/utils');

const { getListPayload, getOnePayload, addAssociationOrder, addAssociationSearch, addOrderById } = require('app/controllers/common');

module.exports.list = async (req, res) => {
    try {
        let payload = getListPayload(req);
        const statusParams = JSON.parse(req.query.params).status;
        const preOrderStatus = statusParams === 'pending' ? CONSTANTS.PRE_ORDER_STATUS.inTransfer : CONSTANTS.PRE_ORDER_STATUS.delivered;
        payload.attributes = ['id', 'status', 'transferDate', 'fromKioskName', 'toKioskName', 'SPName', 'userEmail', 'userFirstName', 'userLastName', 'fromKioskId', 'toKioskId', 'userId', 'serviceProviderId', [Sequelize.fn('concat', Sequelize.col('user_first_name'), ' ', Sequelize.col('user_last_name')), 'userName']];
        payload.include = [
            { model: ItemTransfersMenuItems, required: false },
            { model: PreOrders, where: { status: preOrderStatus }, required: false },
        ];
        payload.where.status = statusParams;
        if (statusParams === 'completed') {
            payload.where.status = { [Sequelize.Op.in]: CONSTANTS.COMPLETED_TRANSFER_STATUS_LIST };
        }
        payload = addOrderById(payload);
        const { count, rows } = await ItemTransfers.findAndCountAll(payload);
        return res.json({ count, data: rows });
    } catch (err) {
        log.error(err, 'itemTransfers::getItemTransfersList');
        return res.status(500).json({ message: 'Error in get itemTransfers list' });
    }
};

module.exports.get = async (req, res) => {
    try {
        const id = req.params.id;
        const payload = getOnePayload(req, id);
        payload.include = [
            { model: ItemTransfersMenuItems, required: false },
        ];

        const itemTransfer = await ItemTransfers.findOne(payload);
        return res.json(itemTransfer);
    } catch (err) {
        log.error(err, 'itemTransfers::getItemTransfer');
        return res.status(500).json({ message: 'Error in get getItemTransfer' });
    }
};

const areIDsUnique = (ids) => {
    let uniqueIds = [];
    for (let i in ids) {
        if (uniqueIds.indexOf(ids[i].id) !== -1) {
            return false;
        }
        uniqueIds.push(ids[i].id);
    }
    return true;
}

const getItemTransferPayload = async (req, fromId, toId, isFromWarhouse) => {
    const user = req.user;
    let itemTransfer = {};
    let from;
    let to;
    if (isFromWarhouse) {
        from = await Warehouses.findOne({ where: {id: fromId }});
        itemTransfer.fromWarehouseId = from.id;

        to = await Kiosks.findOne({ where: {id: toId }});
        itemTransfer.toKioskId = to.id;
    } else {
        from = await Kiosks.findOne({ where: {id: fromId }});
        itemTransfer.fromKioskId = from.id;

        to = await Warehouses.findOne({ where: {id: toId }});
        itemTransfer.toWarehouseId = to.id;
    }

    if (!user.isKerpakOperator && from.serviceProviderId !== user.serviceProviderId) {
        return {success: false};
    }

    if (from.serviceProviderId !== to.serviceProviderId) {
        return {success: false};
    }

    itemTransfer.transferDate = new Date();
    itemTransfer.userId = req.user.id;

    const serviceProvider = await ServiceProviders.findOne({ where: {id: from.serviceProviderId}});
    itemTransfer.SPName = serviceProvider.legalName;
    itemTransfer.fromKioskName = from.displayName;
    itemTransfer.toKioskName = to.displayName;
    itemTransfer.userEmail = user.email;
    itemTransfer.userFirstName = user.firstName;
    itemTransfer.userLastName = user.lastName;
    itemTransfer.serviceProviderId = from.serviceProviderId;
    itemTransfer.status = 'pending';

    return {success: true, itemTransfer};
}

// called from itemTransfers/create view
module.exports.create = async (req, res) => {
    let t;
    try {
        const payload = { ...req.body };
        const {
            isValid, errors
        } = isSchemeValidSync(itemTransfersValidator.create, payload);
        if (!isValid) {
            log.error(errors, 'itemTransfers::create::validation');
            return res.status(400).json({ message: 'validation failed' });
        }

        if (parseInt(payload.fromId) === parseInt(payload.toId) || !areIDsUnique(payload.itemTransfersMenuItems)) {
            return res.status(500).json({ message: 'Invalid payload' });
        }
        let itemTransfer = {};
        const itemTransferRes = await getItemTransferPayload(req, payload.fromId, payload.toId, payload.isFromWarhouse);
        if (itemTransferRes.success) {
            itemTransfer = itemTransferRes.itemTransfer;
        } else {
            return res.status(403).json({ message: 'Forbidden' });
        }

        let serviceProviderId = itemTransfer.serviceProviderId;

        const transferItems = payload.itemTransfersMenuItems;
        let itemTransfersMenuItems = [];
        let productIds = [];

        for (let i in transferItems) {
            const productItemsWhere = {
                status: 'available',
                archived: 0,
                serviceProviderId: serviceProviderId
            };
            if (payload.isFromWarhouse) {
                productItemsWhere.warehouseId = payload.fromId;
            } else {
                productItemsWhere.kioskId = payload.fromId;
            }
            let menuItem = await MenuItems.findOne({
                where: {
                    id: transferItems[i].id,
                    archived: false
                },
                include: {
                    model: ProductItems, required: false, where: productItemsWhere
                }
            });
            if (serviceProviderId !== menuItem.serviceProviderId) {
                return res.status(403).json({ message: 'Forbidden' });
            }
            if (menuItem.productItems.length < transferItems[i].count) {
                return res.status(500).json({ message: 'Invalid payload' });
            }
            let j = 0;
            while (j < transferItems[i].count) {
                productIds.push(menuItem.productItems[j].id);
                j++;
            }
            itemTransfersMenuItems.push({
                name: menuItem.name,
                category: menuItem.category,
                count: transferItems[i].count,
                sku: menuItem.sku,
                menuItemId: menuItem.id,
                barcode: menuItem.barcode,
                productionDate: menuItem.productItems[0].productionDate,
                expirationDate: menuItem.productItems[0].expirationDate,
            });
        }

        itemTransfer.itemTransfersMenuItems = itemTransfersMenuItems;
        itemTransfer.status = payload.isFromWarhouse ? 'pending' : 'completed';
        t = await sequelize.transaction();

        const newItemTransfer = await ItemTransfers.create(itemTransfer, {
            include: [{
                association: ItemTransfers.associations.itemTransfersMenuItems
            }]
        }, { transaction: t });

        let updatePayload;
        if (payload.isFromWarhouse) {
            updatePayload = {
                kioskId: null,
                warehouseId: null,
                itemTransferId: newItemTransfer.id
            }
        } else {
            updatePayload = {
                kioskId: null,
                warehouseId: payload.toId,
                returnedKioskId: payload.fromId,
                returnedKioskName: itemTransfer.fromKioskName,
                itemTransferId: newItemTransfer.id
            }
        }

        await ProductItems.update(updatePayload, {
            where: {
                id: productIds
            },
            transaction: t
        });

        await t.commit();
        return res.json({ itemTransfer: newItemTransfer });
    } catch (err) {
        try {
            await t.rollback();
        } catch (errRollback) {
            log.error(errRollback, 'itemTransfers::create::rollback');
        }
        log.error(err, 'itemTransfers::create::server error');
        return res.status(500).json({ message: 'Error in create itemTransfer' });
    }
};

const toNumbers = arr => arr.map(Number);

const groupByProperties = (array, fields) => {
    const groupedList = [...array.reduce((r, o) => {
        let key = '';
        fields.forEach((item, index) => {
            if (index === fields.length - 1) {
                key += o[item];
            } else {
                key += o[item] + '-';
            }
        })
        const item = r.get(key) || Object.assign({}, o, {
            count: 0
        });
        item.count += 1;
        return r.set(key, item);
    }, new Map).values()];
    return groupedList;
}

// called from groupByKiosk view
module.exports.createItemTransferByProducts = async (req, res) => {
    let t;
    try {
        const payload = { ...req.body };
        let payloadProductItems = {
            where: {
                id: payload.ids,
                archived: 0
            },
            distinct: true,
            subQuery: false
        };
        payloadProductItems.include = [
            { model: MenuItems, where: { archived: false }, attributes: ['id'], required: false },
            { model: Kiosks, attributes: ['id', 'serviceProviderId', 'displayName'], required: false },
        ];
        const productItems = await ProductItems.findAll(payloadProductItems);
        let { kiosk, menuItem } = productItems[0];

        const fromKioskId = parseInt(kiosk.id);
        const toKioskId = parseInt(payload.kioskId);
        const transferMenuItem = { id: menuItem.id.toString(), count: payload.ids.length.toString() };

        let itemTransfer = {};
        const itemTransferRes = await getItemTransferPayload(req, fromKioskId, toKioskId,false);
        if (itemTransferRes.success) {
            itemTransfer = itemTransferRes.itemTransfer;
        } else {
            return res.status(403).json({ message: 'Forbidden' });
        }

        let itemTransfersMenuItems = [];
        menuItem = await MenuItems.findOne({
            where: {
                id: transferMenuItem.id,
                archived: false
            },
            include: {
                model: ProductItems, required: false, where: {
                    status: 'available',
                    archived: 0,
                    kioskId: kiosk.id,
                    serviceProviderId: kiosk.serviceProviderId
                }
            }
        });
        if (kiosk.serviceProviderId !== menuItem.serviceProviderId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        if (menuItem.productItems.length < transferMenuItem.count) {
            return res.status(500).json({ message: 'Invalid payload' });
        }
        const groupingFields = ['productionDate', 'expirationDate'];
        const groupedList = groupByProperties(menuItem.productItems.filter(i => toNumbers(payload.ids).includes(i.id)), groupingFields);
        groupedList.map(group => {
            itemTransfersMenuItems.push({
                name: menuItem.name,
                category: menuItem.category,
                count: group.count,
                sku: menuItem.sku,
                menuItemId: menuItem.id,
                barcode: menuItem.barcode,
                productionDate: group.dataValues.productionDate,
                expirationDate: group.dataValues.expirationDate,
            });
        })

        itemTransfer.itemTransfersMenuItems = itemTransfersMenuItems;
        itemTransfer.status = "completed";
        t = await sequelize.transaction();

        const newItemTransfer = await ItemTransfers.create(itemTransfer, {
            include: [{
                association: ItemTransfers.associations.itemTransfersMenuItems
            }]
        }, { transaction: t });

        await ProductItems.update({
            kioskId: null,
            warehouseId: toKioskId,
            isReturnedItem: true,
            returnedKioskId: fromKioskId,
            returnedKioskName: kiosk.displayName,
            itemTransferId: newItemTransfer.id
        }, {
            where: {
                id: payload.ids
            },
            transaction: t
        });

        await t.commit();
        return res.json({ itemTransfer: newItemTransfer });
    } catch (err) {
        try {
            await t.rollback();
        } catch (errRollback) {
            log.error(errRollback, 'itemTransfers::createItemTransferByProducts::rollback');
        }
        log.error(err, 'itemTransfers::createItemTransferByProducts');
        return res.status(500).json({ message: 'Error in create itemTransfer' });
    }
};

module.exports.exportXLSX = async (req, res) => {
    try {
        const id = req.params.id;
        const payload = getOnePayload(req, id);
        payload.include = [
            { model: ItemTransfersMenuItems, required: false },
        ];

        const itemTransfer = await ItemTransfers.findOne(payload);
        const fileName = `transfer_${itemTransfer.id}.xlsx`;
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Transfer');

        worksheet.columns = [
            { header: 'Trasnfer ID', key: 'A', width: 32 },
            { header: 'Service Provider', key: 'B', width: 32 },
            { header: 'From Kiosk', key: 'C', width: 32 },
            { header: 'To Kiosk', key: 'D', width: 32, },
            { header: 'Transfer Date', key: 'E', width: 30 },
            { header: 'User', key: 'F', width: 30, }
        ];

        worksheet.addRow({
            A: itemTransfer.id,
            B: itemTransfer.SPName,
            C: itemTransfer.fromKioskName,
            D: itemTransfer.toKioskName,
            E: itemTransfer.transferDate ? moment(itemTransfer.transferDate).utcOffset(getSPTimeZone(req.user)).format('DD.MM.YYYY, HH:mm') : '-',
            F: itemTransfer.userEmail
        });
        worksheet.addRow({ A: " ", B: " ", C: " ", D: " ", E: " ", F: " " });
        worksheet.addRow({
            A: "SKU",
            B: "Catalog Item",
            C: "Category",
            D: "Items Transferred",
            E: " ",
            F: " "
        });

        itemTransfer.itemTransfersMenuItems.forEach(item => {
            worksheet.addRow({ A: item.sku, B: item.name, C: item.category, D: item.count, E: " ", F: " " });
        });

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(4).font = { bold: true };
        worksheet.getCell('E2').alignment = { horizontal: 'left' };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + fileName);

        await workbook.xlsx.write(res);

        res.end();
    } catch (err) {
        log.error(err, 'itemTransfers::controller::exportXLSX');
        return res.status(500).json({ message: 'Error in get XLSX' });
    }
};

module.exports.exportAllDataXLSX = async (req, res) => {
    try {
        let payload = getListPayload(req);
        payload.include = [
            { model: ItemTransfersMenuItems, required: false },
        ];

        const statusValue = JSON.parse(req.query.params).status;
        payload.where.status =  statusValue;
        if (statusValue === 'completed') {
            payload.where.status = { [Sequelize.Op.in]: CONSTANTS.COMPLETED_TRANSFER_STATUS_LIST };
        }
        payload = addOrderById(payload);
        const itemTransfer = await ItemTransfers.findAll(payload);
        const fileName = `${statusValue}_transfers}.xlsx`;
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Transfer');

        worksheet.columns = [
            { header: 'ID', key: 'A', width: 24 },
            { header: 'Created By', key: 'B', width: 32 },
            { header: 'Date', key: 'C', width: 32 },
            { header: 'From', key: 'D', width: 32, },
            { header: 'To', key: 'E', width: 32 },
            ( statusValue === 'pending' ? { header: 'Count', key: 'F', width: 32 } : { header: 'Status', key: 'F', width: 32 }),
            ( statusValue !== 'pending' && { header: 'Count', key: 'G', width: 32 }),
        ];

        itemTransfer.forEach(item => {
            worksheet.addRow({
                A: item.id,
                B: `${item.userFirstName} ${item.userLastName}`,
                C: item.transferDate ? moment(item.transferDate).utcOffset(getSPTimeZone(req.user)).format('DD.MM.YYYY, HH:mm') : '-',
                D: item.fromKioskName,
                E: item.toKioskName,
                F: statusValue === 'pending' ? item.itemTransfersMenuItems.reduce((accumulator, element) => { return accumulator + element.count }, 0) : item.status,
                ...(statusValue !== 'pending' && {G: item.itemTransfersMenuItems.reduce((accumulator, element) => { return accumulator + element.count }, 0)})
            });
        });

        worksheet.getRow(1).font = { bold: true };
        worksheet.getColumn('F').alignment = { horizontal: 'left' };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        log.error(err, 'itemTransfers::controller::exportAllDataXLSX');
        return res.status(500).json({ message: 'Error in get XLSX' });
    }
};

const getPayloadForMergedData = (table, isWarhouse) => {
    return {
        row: true,
        include: [
            {
                model: ProductItems,
                attributes: [],
                required: false,
                where: { status: 'available', archived: false }
            }
        ],
        attributes: ['id', [sequelize.fn('CONCAT', sequelize.col(`${table}.id`), `-${isWarhouse}`), 'uniqId'], 'displayName', 'serviceProviderId', [Sequelize.fn('count', Sequelize.col('productItems.id')), 'productItemsCount']],
        group: ['id']
    }
}

module.exports.getMenuItems = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await isSchemeValid(kioskValidator.get, { id });
        let payload = getOnePayload(req, id);
        payload.attributes = ['id'];
        payload.include = [
            {
                model: Menus,
                attributes: ['id'],
                required: false,
                include: [
                    {model: MenuItems, where: { archived: false }, attributes: ['id'], required: false},
                ]
            }
        ];

        const kiosk = await Kiosks.findOne(payload);
        if (!kiosk) {
            return res.status(404).json({ message: 'kiosk not found' });
        }
        if(!kiosk.menu || !kiosk.menu.menuItems) {
            return res.json([]);
        }

        const menuItems = kiosk.menu.menuItems.map(item => item.id);

        return res.json(menuItems);
    } catch (err) {
        log.error(err, 'itemTransfers::kiosk::getMenuItems');
        return res.status(400).json({ message: 'Error in get menu items' });
    }
};

// called from Warehouse Create Transfer view
module.exports.createTransferGroup = async (req, res) => {
    let t;
    try {
        const payload = { ...req.body };
        const {
            isValid, errors
        } = isSchemeValidSync(itemTransfersValidator.createFromWarehouse, payload);
        if (!isValid) {
            log.error(errors, 'itemTransfers::createTransferGroup::validation');
            return res.status(400).json({ message: 'validation failed' });
        }
        let itemTransfer = {};
        const itemTransferRes = await getItemTransferPayload(req, payload.fromId, payload.toId, payload.isFromWarhouse);

        if (itemTransferRes.success) {
            itemTransfer = itemTransferRes.itemTransfer;
        } else {
            return res.status(403).json({ message: 'Forbidden' });
        }

        let serviceProviderId = itemTransfer.serviceProviderId;

        const transferItems = payload.itemTransfersMenuItems;
        let itemTransfersMenuItems = [];
        let productIds = [];

        for (let i in transferItems) {
            const productItemsWhere = {
                status: 'available',
                archived: 0,
                serviceProviderId: serviceProviderId
            };
            if (payload.isFromWarhouse) {
                productItemsWhere.warehouseId = payload.fromId;
            } else {
                productItemsWhere.kioskId = payload.fromId;
            }
            if (transferItems[i].productionDate && transferItems[i].expirationDate) {
                productItemsWhere.productionDate = transferItems[i].productionDate;
                productItemsWhere.expirationDate = transferItems[i].expirationDate;
            } else {
                return res.status(500).json({ message: 'Invalid payload' });
            }

            let menuItem = await MenuItems.findOne({
                where: {
                    id: transferItems[i].id,
                    archived: false
                },
                include: {
                    model: ProductItems, required: false, where: productItemsWhere
                }
            });
            if (serviceProviderId !== menuItem.serviceProviderId) {
                return res.status(403).json({ message: 'Forbidden' });
            }
            if (menuItem.productItems.length < transferItems[i].count || transferItems[i].count <= 0) {
                return res.status(500).json({ message: 'Invalid payload' });
            }
            let j = 0;
            let hasEAN5 = true;
            while (j < transferItems[i].count) {
                productIds.push(menuItem.productItems[j].id);
                if (!menuItem.productItems[j].EAN5) {
                    hasEAN5 = false;
                }
                j++;
            }
            itemTransfersMenuItems.push({
                name: menuItem.name,
                category: menuItem.category,
                count: transferItems[i].count,
                sku: menuItem.sku,
                menuItemId: menuItem.id,
                barcode: menuItem.barcode,
                productionDate: menuItem.productItems[0].productionDate,
                expirationDate: menuItem.productItems[0].expirationDate,
                hasEAN5: hasEAN5,
            });
        }

        t = await sequelize.transaction();

        itemTransfer.itemTransfersMenuItems = itemTransfersMenuItems;
        itemTransfer.status= payload.isFromWarhouse ? "pending" : "completed";
        const newItemTransfer = await ItemTransfers.create(itemTransfer, {
            include: [{
                association: ItemTransfers.associations.itemTransfersMenuItems
            }]
        }, { transaction: t });

        if (payload.preOrders) {
            await PreOrders.update({
                transferId: newItemTransfer.id,
                status: PRE_ORDER_STATUS.inTransfer
            }, {
                where: {
                    id: payload.preOrders,
                    status: PRE_ORDER_STATUS.allowedNextStatuses.awaitingConfirmation.spAcceptStatus
                },
            }, { transaction: t });
        }

        const updatePayload = {
            kioskId: null,
            warehouseId: payload.isFromWarhouse ? null : payload.toId,
            itemTransferId: newItemTransfer.id
        }

        await ProductItems.update(updatePayload, {
            where: {
                id: productIds
            },
        }, { transaction: t });

        await t.commit();
        return res.json({ itemTransfer: newItemTransfer });
    } catch (err) {
        try {
            await t.rollback();
        } catch (errRollback) {
            log.error(errRollback, 'itemTransfers::createTransferGroup::rollback');
        }
        log.error(err, 'itemTransfers::createTransferGroup');
        return res.status(500).json({ message: 'Error in create transfer group' });
    }
  };

module.exports.transferItemsList = async (req, res) => {
    try {
        let payload = getListPayload(req);
        const id = Number(req.params.id);
        const params = JSON.parse(req.query.params);
        payload.where.item_transfer_id = id;
        payload = addAssociationOrder(payload);
        payload = addAssociationSearch(payload);
        const currentSP = {serviceProviderId: payload.where.serviceProviderId};
        delete payload.where.serviceProviderId;
        let statusPayload = params.status;
        if (params.status === 'completed') {
            statusPayload = { [Sequelize.Op.in]: CONSTANTS.COMPLETED_TRANSFER_STATUS_LIST };
        }

        payload.include = [
            {
                model: ItemTransfers,
                required: true,
                where: { id, status: statusPayload, ...(currentSP.serviceProviderId && currentSP) },
                include: [
                    {
                        model: ServiceProviders, attributes: ['id'], required: true,
                        include: [{ model: Regions, attributes: ['isoCode', 'currencyName', 'currencySymbol', 'weightSymbol'] , required: true }]
                    },
                ]
            },
        ];
        payload = addOrderById(payload);

        const { count, rows } = await ItemTransfersMenuItems.findAndCountAll(payload);
        return res.json({ count: count, data: rows });
    } catch (err) {
        log.error(err, 'itemTransfers::controller::transferItemsList');
        return res.status(500).json({ message: 'Error in get transferItemsList' });
    }
};

module.exports.changeItemsStatus = async (req, res) => {
    let t;
    try {
        const payload = { ...req.body };
        const existedTransfer = await ItemTransfers.findOne({where: {id: payload.itemTransferId}});
        if (!existedTransfer) {
            return res.status(500).json({ message: 'validation error: transfer does not exist' });
        }
        if (!req.user.isKerpakOperator && existedTransfer.serviceProviderId !== req.user.serviceProviderId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        t = await sequelize.transaction();
        await ItemTransfers.update({status: payload.status}, {where: {id: payload.itemTransferId}, transaction: t});
        const updatedTransfer = await ItemTransfers.findOne({where: {id: payload.itemTransferId}, transaction: t});
        const productItemsWhere = {};
        if(payload.status === 'canceled' || payload.status === 'removed') {
            if (updatedTransfer.fromKioskId) {
                productItemsWhere.kioskId = updatedTransfer.fromKioskId;
            } else {
                productItemsWhere.warehouseId = updatedTransfer.fromWarehouseId;
            }
        } else {
            if (updatedTransfer.toKioskId) {
                productItemsWhere.kioskId = updatedTransfer.toKioskId;
            } else {
                productItemsWhere.warehouseId = updatedTransfer.toWarehouseId;
            }
        }

        const updatedItemsCount = await ProductItems.update(productItemsWhere, {
            where: {
                itemTransferId: payload.itemTransferId
            },
            transaction: t
        });

        const preOrders = await PreOrders.findAll({
            where: {
                transferId: payload.itemTransferId,
                status : { [Op.in]: PRE_ORDER_STATUS.statusesToShowInTransfer }
            },
            include: [
                { model: Consumers, attributes: ['firebaseRegistrationToken'] },
            ],
            raw: true,
        });
        if (preOrders.length) {
            const updateObj = {
                transferId: null,
            };
            let isSendNotification = false;
            if (payload.status === 'canceled') {
                updateObj.status = PRE_ORDER_STATUS.allowedNextStatuses.inTransfer.spCancelTransferStatus;
            } else {
                isSendNotification = true;
                updateObj.status = PRE_ORDER_STATUS.delivered;
                updateObj.deliveryDate = Date.now();
            }
            await PreOrders.update(updateObj,
                {
                    where: {
                        transferId: payload.itemTransferId,
                    },
                    transaction: t
                }
            );
            if (isSendNotification) {
                const firebaseRegistrationTokens = [];
                preOrders.forEach(preOrder => {
                    if (preOrder['consumer.firebaseRegistrationToken']) {
                        if (!firebaseRegistrationTokens.includes(preOrder['consumer.firebaseRegistrationToken'])) {
                            firebaseRegistrationTokens.push(preOrder['consumer.firebaseRegistrationToken']);
                        }
                    }
                });
                if (firebaseRegistrationTokens.length) {
                    const {brandName} = await ServiceProviders.findOne({where: {id: existedTransfer.serviceProviderId}});
                    const template = fs.readFileSync(path.resolve(PRE_ORDER_STATUS.allowedNextStatuses.inTransfer.spAcceptNotificationTemplatePath), 'utf8').toString();
                    const text = pupa(template, { brandName });
                    await sendNotification(null, text, firebaseRegistrationTokens);
                }
            }
        }

        if (productItemsWhere.kioskId) {
            const currentKiosk = await Kiosks.findOne({
                where: {
                    id: productItemsWhere.kioskId,
                }
            });
            const kioskProductItemsCount = await ProductItems.count({
                where: {
                    kioskId: productItemsWhere.kioskId,
                    status: 'available',
                    archived: false
                }
            });
            const kioskAllProductItemsCount = kioskProductItemsCount + updatedItemsCount[0];
            const kioskLoad = kioskAllProductItemsCount < currentKiosk.kioskLoad ? currentKiosk.kioskLoad : kioskAllProductItemsCount;
            await Kiosks.update({kioskLoad: kioskLoad, lastTransferDate: new Date()}, {
                where: {
                    id: productItemsWhere.kioskId
                },
                transaction: t
            });
        }

        await t.commit();
        return res.json({ updatedTransfer, message: `Transfer was ${payload.status}. Items were returned to warehouse.` });
    } catch(err) {
        try {
            await t.rollback();
        } catch (errRollback) {
            log.error(errRollback, 'itemTransfers::changeItemsStatus::rollback');
        }
        log.error(err, 'itemsWriteOff::changeItemsStatus::server error');
        return res.status(500).json({ message: 'Error to mark transfer status as completed' });
    }
};

module.exports.getLabelsForSelectedGroupInTransfer = async (req, res) => {
    try {
        const payload = { ...req.body };
        try {
            await isSchemeValid(itemTransfersValidator.getLabels, payload);
        } catch (err) {
            loggerValidations.error(err, 'itemTransfers::controller::getLabelsForSelectedGroupInTransfer');
            return res.status(400).json({ message: 'validation error' });
        }
        const selectedItems = payload.itemsList;
        let productIds = [];
        let productItems = [];
        for (let i in selectedItems) {
            const productItemsWhere = {
                status: 'available',
                archived: 0
            };
            if (selectedItems[i].productionDate && selectedItems[i].expirationDate) {
                productItemsWhere.productionDate = selectedItems[i].productionDate;
                productItemsWhere.expirationDate = selectedItems[i].expirationDate;
            } else {
                return res.status(500).json({ message: 'Invalid payload' });
            }
            let itemTransfersMenuItemObj = await ItemTransfersMenuItems.findOne({
                where: {id: selectedItems[i].transferId},
                include: {
                    model: ItemTransfers, required: false
                }
            });
            if (itemTransfersMenuItemObj.count < selectedItems[i].count) {
                return res.status(500).json({ message: 'Invalid payload' });
            }

            let productItemsList = await ProductItems.findAll({
                where: {itemTransferId: itemTransfersMenuItemObj.itemTransferId, menuItemId: selectedItems[i].id, ...productItemsWhere},
            });

            if (productItemsList.length < selectedItems[i].count) {
                return res.status(500).json({ message: 'Invalid payload' });
            }
            productItems = productItems.concat(productItemsList);
            let j = 0;
            while (j < selectedItems[i].count) {
                if (!req.user.isKerpakOperator && productItemsList[j].serviceProviderId !== req.user.serviceProviderId) {
                    return res.json({ message: 'Forbidden' });
                }
                productIds.push(productItemsList[j].id);
                j++;
            }
        }

        let getPayload = {};
        getPayload.include = [
            {
                model: MenuItems,
                attributes: ['name', 'barcode', 'category', 'price', 'weight', 'ingredients', 'caloriesCount'],
                required: true,
                where: { archived: false }
            },
            {
                model: ServiceProviders,
                attributes: ['id', 'legalName', 'secondaryLogo'],
                required: false,
                include: [{ model: Regions, attributes: ['isoCode', 'currencyName', 'currencySymbol', 'weightSymbol'] ,required: true }]
            },
        ];
        getPayload.where = {};
        getPayload.where.id = productIds;
        getPayload.where.expirationDate = {
            [Op.gte]: new Date(),
        };
        getPayload.attributes = ['productionDate', 'menuItemId', 'expirationDate', [Sequelize.fn('count', Sequelize.col('productItems.id')), 'productItemsCount'], [sequelize.fn('GROUP_CONCAT', Sequelize.col('productItems.id')), 'ids']];
        getPayload.group = ['productionDate', 'menuItemId', 'expirationDate', Sequelize.col('serviceProvider.id')];

        const rows = await ProductItems.findAll(getPayload);
        let data = {
            productItems: productItems,
            rows: rows
        };
        return res.json(data);
    } catch (err) {
        log.error(err, 'itemTransfers::controller::getLabelsForSelectedGroupInTransfer');
        return res.status(500).json({ message: 'Error in get labels for selected group' });
    }
};

module.exports.changeTransferItemsStatusForGroup = async (req, res) => {
    let t;
    try {
        const payload = { ...req.body };
        const existedTransfer = await ItemTransfers.findOne({where: {id: payload.itemTransferId}} );
        if (!existedTransfer) {
            return res.status(500).json({ message: 'validation error: transfer does not exist' });
        }
        if (!req.user.isKerpakOperator && existedTransfer.serviceProviderId !== req.user.serviceProviderId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        // create new transfer
        const newItemTransferPayload = JSON.parse(JSON.stringify(existedTransfer));
        delete newItemTransferPayload.id;
        t = await sequelize.transaction();
        const newItemTransfer = await ItemTransfers.create({...newItemTransferPayload, status: payload.status, transaction: t});

        // collect product items ids
        const selectedItems = payload.itemsList;
        let productIds = [];
        let productItems = [];
        for (let i in selectedItems) {
            const productItemsWhere = {
                status: 'available',
                archived: 0
            };
            if (selectedItems[i].productionDate && selectedItems[i].expirationDate) {
                productItemsWhere.productionDate = selectedItems[i].productionDate;
                productItemsWhere.expirationDate = selectedItems[i].expirationDate;
            } else {
                await t.rollback();
                return res.status(500).json({ message: 'Invalid payload (Step 1)' });
            }

            let itemTransfersMenuItemObj = await ItemTransfersMenuItems.findOne({
                where: {id: selectedItems[i].transferId},
                include: {
                    model: ItemTransfers, required: false
                }
            });

            if (itemTransfersMenuItemObj.count < selectedItems[i].count) {
                await t.rollback();
                return res.status(500).json({ message: 'Invalid payload (Step 2)' });
            }

            let productItemsList = await ProductItems.findAll({
                where: {itemTransferId: itemTransfersMenuItemObj.itemTransferId, menuItemId: selectedItems[i].id, ...productItemsWhere},
            } );

            if (productItemsList.length < selectedItems[i].count) {
                await t.rollback();
                return res.status(500).json({ message: 'Invalid payload (Step 3)' });
            }

            await ItemTransfersMenuItems.update({ itemTransferId: newItemTransfer.id }, {where: {id: selectedItems[i].transferId}, transaction: t });

            productItems = productItems.concat(productItemsList);
            let j = 0;
            while (j < selectedItems[i].count) {
                if (!req.user.isKerpakOperator && productItemsList[j].serviceProviderId !== req.user.serviceProviderId) {
                    await t.rollback();
                    return res.json({ message: 'Forbidden' });
                }
                productIds.push(productItemsList[j].id);
                j++;
            }
        }

        const productItemsWhere = {};
        if(payload.status === 'canceled' || payload.status === 'removed') {
            if (newItemTransfer.fromKioskId) {
                productItemsWhere.kioskId = newItemTransfer.fromKioskId;
            } else {
                productItemsWhere.warehouseId = newItemTransfer.fromWarehouseId;
            }
        } else {
            if (newItemTransfer.toKioskId) {
                productItemsWhere.kioskId = newItemTransfer.toKioskId;
            } else {
                productItemsWhere.warehouseId = newItemTransfer.toWarehouseId;
            }
        }

        await ProductItems.update(productItemsWhere, {
            where: {
                id: productIds,
                itemTransferId: payload.itemTransferId
            },
            transaction: t
        });

        if (productItemsWhere.kioskId) {
            const currentKiosk = await Kiosks.findOne({
                where: {
                    id: productItemsWhere.kioskId,
                }
            });
            const kioskProductItemsCount = await ProductItems.count({
                where: {
                    kioskId: productItemsWhere.kioskId,
                    status: 'available',
                    archived: false
                }
            } );
            const kioskAllProductItemsCount = kioskProductItemsCount + updatedItemsCount[0];
            const kioskLoad = kioskAllProductItemsCount < currentKiosk.kioskLoad ? currentKiosk.kioskLoad : kioskAllProductItemsCount;
            await Kiosks.update({kioskLoad: kioskLoad, lastTransferDate: new Date()}, {
                where: {
                    id: productItemsWhere.kioskId
                },
                transaction: t
            });
        }
        await t.commit();
        return res.json({ newItemTransfer, message: `Transfer was ${payload.status}. Items were returned to warehouse.` });

    } catch(error) {
        try {
            await t.rollback();
        } catch (errRollback) {
            log.error(errRollback, 'itemsWriteOff::changeTransferItemsStatusForGroup::rollback');
        }
        log.error(error, 'itemsWriteOff::changeTransferItemsStatusForGroup::server error');
        return res.status(500).json({ message: 'Error to change transfer status.' });
    }
};
