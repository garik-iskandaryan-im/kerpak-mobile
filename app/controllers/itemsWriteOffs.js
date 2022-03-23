const {
    itemsWriteOffs: ItemsWriteOffs,
    itemsWriteOffsProducts: itemsWriteOffsProducts,
    writeOffReasons: WriteOffReasons,
    productItems: ProductItems,
    menuItems: MenuItems,
    kiosks: Kiosks,
    warehouses: Warehouses,
    serviceProviders: ServiceProviders,
    sequelize,
} = require('app/models/models');
const { itemsWriteOffs: itemsWriteOffsValidator } = require('app/schemes');
const { isSchemeValid } = require('app/helpers/validate');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');
const { getListPayload, getOnePayload, addAssociationOrder, addOrderById } = require('app/controllers/common');
const moment = require('moment');
const { getSPTimeZone } = require('app/helpers/utils');

module.exports.list = async (req, res) => {
    try {
        let payload = getListPayload(req);
        payload.include = [
            {
                model: itemsWriteOffsProducts,
                required: false
            },
            { model: WriteOffReasons, required: false },
        ];
        payload = addAssociationOrder(payload);
        payload = addOrderById(payload);
        const { count, rows } = await ItemsWriteOffs.findAndCountAll(payload);
        return res.json({ count, data: rows });
    } catch (err) {
        log.error(err, 'ItemsWriteOffs::controller::getItemsWriteOffs');
        return res.status(500).json({ message: 'Error in get items wWrite offs list' });
    }
};

module.exports.get = async (req, res) => {
    try {
        const id = req.params.id;
        let payload = getOnePayload(req, id);
        payload.include = [
            {
                model: itemsWriteOffsProducts,
                required: false
            },
            { model: WriteOffReasons, required: false },
        ];

        const itemsWriteOff = await ItemsWriteOffs.findOne(payload);
        return res.json(itemsWriteOff);
    } catch (err) {
        log.error(err, 'itemsWriteOff::controller::getitemsWriteOff');
        return res.status(500).json({ message: 'Error in get itemsWriteOff' });
    }
};

module.exports.create = async (req, res) => {
    try {
        const payload = { ...req.body };
        try {
            await isSchemeValid(itemsWriteOffsValidator.create, payload);
        } catch (err) {
            loggerValidations.error(err, 'itemsWriteOff::create::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        let newReason = null;
        if (!payload.reasonId && payload.reasons && payload.reasons.length) {
            newReason = await WriteOffReasons.create(payload.reasons[0]);
        } else if (payload.reasonId) {
            newReason = await WriteOffReasons.findByPk(payload.reasonId);
            if (!req.user.isKerpakOperator && newReason.serviceProviderId !== req.user.serviceProviderId) {
                return res.status(403).json({ message: 'Forbidden' });
            }
        }
        let payloadProductItems = {
            where: {
                id: payload.ids,
                status: 'available',
                archived: 0
            },
            include: [
                { model: MenuItems, where: { archived: false }, required: false, attributes: ['sku', 'name', 'category', 'price'] },
                { model: Kiosks, required: false, attributes: ['displayName'] },
                { model: Warehouses, required: false, attributes: ['displayName'] },
            ],
            distinct: true,
            subQuery: false
        };
        let productItems;
        try {
            productItems = await ProductItems.findAndCountAll(payloadProductItems)
        } catch (err) {
            log.error(err, 'itemsWriteOff::create::productItems::getProductItems');
            return res.status(500).json({ message: 'Error in get product items list' });
        }
        let itemsWriteOff = {};
        let data = JSON.parse(JSON.stringify(productItems.rows));
        if (payload.ids.length !== productItems.count) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        if (data[0].serviceProviderId !== newReason.serviceProviderId) {
            return res.status(500).json({ message: 'Invalid payload' });
        }
        itemsWriteOff.serviceProviderId = data[0].serviceProviderId;
        itemsWriteOff.kioskId = data[0].kioskId;
        itemsWriteOff.warehouseId = data[0].warehouseId;
        itemsWriteOff.userId = req.user.id;
        itemsWriteOff.reason = newReason ? newReason.name : payload.reason;
        itemsWriteOff.reasonId = newReason ? newReason.id : payload.reasonId;
        itemsWriteOff.writeOffDate = new Date();

        const SPData = await ServiceProviders.findOne({ where: { id: data[0].serviceProviderId } });
        itemsWriteOff.SPName = SPData.legalName;
        itemsWriteOff.kioskName = data[0].kiosk && data[0].kiosk.displayName;
        itemsWriteOff.warehouseName = data[0].warehouse && data[0].warehouse.displayName;
        itemsWriteOff.userEmail = req.user.email;
        itemsWriteOff.MISku = data[0].menuItem.sku;
        itemsWriteOff.MIName = data[0].menuItem.name;
        itemsWriteOff.MICategory = data[0].menuItem.category,

            itemsWriteOff.itemsWriteOffsProducts = [];
        for (let i in data) {
            if (!req.user.isKerpakOperator && data[i].serviceProviderId !== req.user.serviceProviderId) {
                return res.status(403).json({ message: 'Forbidden' });
            }
            itemsWriteOff.itemsWriteOffsProducts.push({
                productID: data[i].id,
                productionDate: data[i].productionDate,
                expirationDate: data[i].expirationDate,
                price: data[i].menuItem.price
            });
        }
        let createdItemsWriteOff;
        try {
            createdItemsWriteOff = await ItemsWriteOffs.create(itemsWriteOff, {
                include: [{
                    association: ItemsWriteOffs.associations.itemsWriteOffsProducts,
                }]
            });
        } catch (err) {
            log.error(err, 'itemsWriteOff::create::createdItemsWriteOff');
            return res.status(500).json({ message: 'Error in create itemsWriteOff' });
        }
        if (createdItemsWriteOff) {
            await ProductItems.update({ status: 'written-off' }, {
                where: {
                    id: payload.ids
                }
            });
            return res.json({ itemsWriteOff: createdItemsWriteOff, message: 'itemsWriteOff has been created' });
        }
        return res.status(500).json({ message: 'Error in create itemsWriteOff' });
    } catch (err) {
        log.error(err, 'itemsWriteOff::controller::create');
        return res.status(500).json({ message: 'Error in create itemsWriteOff' });
    }
};

module.exports.exportXLSX = async (req, res) => {
    try {
        const id = req.params.id;
        let payload = getOnePayload(req, id);
        payload.include = [
            {
                model: itemsWriteOffsProducts,
                required: false,
            }
        ];
        const itemsWrittenOff = await ItemsWriteOffs.findOne(payload);
        const fileName = `written_off_${itemsWrittenOff.id}.xlsx`;
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Written Off');

        worksheet.columns = [
            { header: 'Written Off Item ID', key: 'A', width: 24 },
            { header: 'Service Provider', key: 'B', width: 32 },
            { header: 'Kiosk', key: 'C', width: 24 },
            { header: 'Reason', key: 'D', width: 24 },
            { header: 'Write-Off Date', key: 'E', width: 24 },
            { header: 'User', key: 'F', width: 30, }
        ];

        worksheet.addRow({
            A: itemsWrittenOff.id,
            B: itemsWrittenOff.SPName,
            C: itemsWrittenOff.kioskName || itemsWrittenOff.warehouseName,
            D: itemsWrittenOff.reason,
            E: itemsWrittenOff.writeOffDate ? moment(itemsWrittenOff.writeOffDate).utcOffset(getSPTimeZone(req.user)).format('DD.MM.YYYY, HH:mm') : '-',
            F: itemsWrittenOff.userEmail
        });
        worksheet.addRow({ A: " ", B: " ", C: " " });
        worksheet.addRow({
            A: "SKU",
            B: "Catalog Item",
            C: "Category",
        });

        const { MISku, MIName, MICategory } = itemsWrittenOff;
        worksheet.addRow({ A: MISku, B: MIName, C: MICategory });

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(4).font = { bold: true };
        worksheet.getCell('E2').alignment = { horizontal: 'left' };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + fileName);

        await workbook.xlsx.write(res);

        res.end();
    } catch (err) {
        log.error(err, 'itemsWriteOff::controller::exportXLSX');
        return res.status(500).json({ message: 'Error in get XLSX' });
    }
};

module.exports.exportXLSXList = async (req, res) => {
    try {
        let payload = getListPayload(req);
        payload.include = [
            {
                model: itemsWriteOffsProducts,
                required: false
            },
            { model: WriteOffReasons, required: false },
        ];

        payload = addAssociationOrder(payload);
        payload = addOrderById(payload);
        const writeOffs = await ItemsWriteOffs.findAll(payload);
        const fileName = 'writeOffsItems.xlsx';
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('WriteOffs');

        const columns = [
            { header: 'ID', key: 'A', width: 10 },
            { header: 'Date', key: 'B', width: 20 },
            { header: 'Kiosk', key: 'C', width: 20 },
            { header: 'Item', key: 'D', width: 30 },
            { header: 'Price', key: 'E', width: 10 },
            { header: 'SKU', key: 'F', width: 10 },
            { header: 'Category', key: 'G', width: 30 },
            { header: 'Items Count', key: 'H', width: 20 },
            { header: 'Reason', key: 'I', width: 30 },
            { header: 'User', key: 'J', width: 30 },
        ];
        worksheet.columns = columns;

        writeOffs.forEach(writeOff => {
            let price = 0;
            writeOff.itemsWriteOffsProducts.forEach(item => {
                if (item.price) {
                    price += item.price;
                }
            });
            const row = {
                A: writeOff.id,
                B: writeOff.writeOffDate ? moment(writeOff.writeOffDate).utcOffset(getSPTimeZone(req.user)).format('DD.MM.YYYY, HH:mm') : '-',
                C: writeOff.kioskName || writeOff.warehouseName,
                D: writeOff.MIName,
                E: price,
                F: writeOff.MISku,
                G: writeOff.MICategory,
                H: writeOff.itemsWriteOffsProducts.length,
                I: writeOff.reason,
                J: writeOff.userEmail,
            };
            worksheet.addRow(row);
        });

        worksheet.getRow(1).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);

        await workbook.xlsx.write(res);

        res.end();
    } catch (err) {
        log.error(err, 'itemTransfers::controller::exportXLSXList');
        return res.status(500).json({ message: 'Error in get XLSX' });
    }
};

module.exports.createWriteOffForGroups = async (req, res) => {
    try {
        const payload = { ...req.body };
        let t;
        const correctSchema = payload.warehouseId ? itemsWriteOffsValidator.createFromWarehouse : itemsWriteOffsValidator.createFromKiosk;
        try {
            await isSchemeValid(correctSchema, payload);
        } catch (err) {
            loggerValidations.error(err, 'itemsWriteOff::createWriteOffForGroups::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        let newReason = null;
        if (!payload.reasonId && payload.reasons && payload.reasons.length) {
            newReason = await WriteOffReasons.create(payload.reasons[0]);
        } else if (payload.reasonId) {
            newReason = await WriteOffReasons.findByPk(payload.reasonId);
            if (!req.user.isKerpakOperator && newReason.serviceProviderId !== req.user.serviceProviderId) {
                return res.status(403).json({ message: 'Forbidden' });
            }
        }
        const writeOffItems = payload.itemWriteOffMenuItems;
        let productIds = [];
        let itemsWriteOffPayload = [];

        for (let i in writeOffItems) {
            let itemsWriteOffCurrent = {};
            const productItemsWhere = {
                status: 'available',
                archived: 0
            };
            if (writeOffItems[i].productionDate && writeOffItems[i].expirationDate) {
                productItemsWhere.productionDate = writeOffItems[i].productionDate;
                productItemsWhere.expirationDate = writeOffItems[i].expirationDate;
            } else {
                return res.status(500).json({ message: 'Invalid payload' });
            }
            if (payload.warehouseId) {
                productItemsWhere.warehouseId = payload.warehouseId;
            } else if (payload.kioskId) {
                productItemsWhere.kioskId = payload.kioskId;
            }
            let menuItem = await MenuItems.findOne({
                where: {
                    id: writeOffItems[i].id,
                    archived: false
                },
                include: {
                    model: ProductItems, required: false, where: productItemsWhere
                }
            });

            if (menuItem.productItems.length < writeOffItems[i].count) {
                return res.status(500).json({ message: 'Invalid payload' });
            }

            itemsWriteOffCurrent.itemsWriteOffsProducts = [];
            let j = 0;
            while (j < writeOffItems[i].count) {
                if (!req.user.isKerpakOperator && menuItem.productItems[j].serviceProviderId !== req.user.serviceProviderId) {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                productIds.push(menuItem.productItems[j].id);
                itemsWriteOffCurrent.itemsWriteOffsProducts.push({
                    productID: menuItem.productItems[j].id,
                    productionDate: menuItem.productItems[j].productionDate,
                    expirationDate: menuItem.productItems[j].expirationDate,
                    price: menuItem.price
                });
                j++;
            }
            const SPData = await ServiceProviders.findOne({ where: { id: menuItem.productItems[0].serviceProviderId } });
            if (SPData.id !== newReason.serviceProviderId) {
                return res.status(500).json({ message: 'Invalid payload' });
            }
            if (menuItem.productItems[0].warehouseId) {
                const warehouseData = await Warehouses.findOne({ where: { id: menuItem.productItems[0].warehouseId } });
                itemsWriteOffCurrent.warehouseName = warehouseData.displayName;
            } else if (menuItem.productItems[0].kioskId) {
                const kioskData = await Kiosks.findOne({ where: { id: menuItem.productItems[0].kioskId } });
                itemsWriteOffCurrent.kioskName = kioskData.displayName;
            }

            itemsWriteOffCurrent.serviceProviderId = menuItem.productItems[0].serviceProviderId;
            itemsWriteOffCurrent.SPName = SPData.legalName;
            itemsWriteOffCurrent.kioskId = menuItem.productItems[0].kioskId;
            itemsWriteOffCurrent.warehouseId = menuItem.productItems[0].warehouseId;
            itemsWriteOffCurrent.userId = req.user.id;
            itemsWriteOffCurrent.reason = newReason ? newReason.name : payload.reason;
            itemsWriteOffCurrent.reasonId = newReason ? newReason.id : payload.reasonId;
            itemsWriteOffCurrent.writeOffDate = new Date();

            itemsWriteOffCurrent.userEmail = req.user.email;
            itemsWriteOffCurrent.MISku = menuItem.sku;
            itemsWriteOffCurrent.MIName = menuItem.name;
            itemsWriteOffCurrent.MICategory = menuItem.category;
            itemsWriteOffPayload.push(itemsWriteOffCurrent);
        }

        t = await sequelize.transaction();

        let itemsWriteOff;
        try {
            itemsWriteOff = await ItemsWriteOffs.bulkCreate(itemsWriteOffPayload, {
                include: [{
                    association: ItemsWriteOffs.associations.itemsWriteOffsProducts,
                }]
            }, { transaction: t });
        } catch (err) {
            try {
                await t.rollback();
            } catch (errRollback) {
                log.error(errRollback, 'itemsWriteOff::createWriteOffForGroups::create::rollback::Step-1');
            }
            log.error(err, 'itemsWriteOff::createWriteOffForGroups::create');
            return res.status(500).json({ message: 'Error in create itemsWriteOff' });
        }
        if (itemsWriteOff) {
            await ProductItems.update({ status: 'written-off' }, {
                where: {
                    id: productIds
                },
                transaction: t
            });
            await t.commit();
            return res.json({ itemsWriteOff, message: 'itemsWriteOff has been created' });
        }
        try {
            await t.rollback();
        } catch (errRollback) {
            log.error(errRollback, 'itemsWriteOff::createWriteOffForGroups::create::rollback::Step-2');
        }
        return res.status(500).json({ message: 'Error in create itemsWriteOff' });
    } catch (err) {
        log.error(err, 'itemsWriteOff::createWriteOffForGroups::server error');
        return res.status(500).json({ message: 'Error in create itemsWriteOff' });
    }
};