const { Op } = require('sequelize');
const {
    productItems: ProductItems,
    menuItems: MenuItems,
    kiosks: Kiosks,
    orders: Orders,
    serviceProviders: ServiceProviders,
    warehouses: Warehouses,
    Sequelize
} = require('app/models/models');
const { productItems: productItemsValidator } = require('app/schemes');
const loggerValidations = require('app/helpers/loggerValidations');
const { isSchemeValid } = require('app/helpers/validate');
const log = require('app/helpers/logger');
const { getListPayload, getOnePayload, addAssociationOrder, addAssociationSearch, addOrderById } = require('app/controllers/common');
const { getIndex } = require('app/services/pruductAutoIncrement');
const moment = require('moment');
const { getSPTimeZone } = require('app/helpers/utils');

module.exports.list = async (req, res) => {
    let payload = getListPayload(req);
    ProductItems.findAndCountAll(payload)
        .then(({ count, rows }) => {
            return res.json({ count, data: rows });
        })
        .catch((err) => {
            log.error(err, 'productItems::getProductItemsList');
            return res.status(500).json({ message: 'Error in get user list' });
        });
};

module.exports.get = async (req, res) => {
    const id = req.params.id;
    const payload = getOnePayload(req, id);
    payload.include = [
        { model: MenuItems, where: { archived: false }, required: false },
        { model: Kiosks, required: false },
        { model: Orders, required: false },
        { model: ServiceProviders, required: false },
    ];

    return ProductItems.findOne(payload)
        .then((productItems) => {
            return res.json(productItems);
        })
        .catch((err) => {
            log.error(err, 'productItems::getProductItem');
            return res.status(500).json({ message: 'Error in get productItems' });
        });
};

module.exports.create = async (req, res) => {
    const payload = { ...req.body };
    isSchemeValid(productItemsValidator.create, payload)
        .then(productItems => {
            ProductItems.create(productItems)
                .then(productItems => {
                    if (productItems) {
                        return res.json({ productItems, message: 'productItem has been created' });
                    }
                    return res.status(500).json({ message: 'Error in create productItem' });
                }).catch(err => {
                    log.error(err, 'productItems::controller::create');
                    return res.status(500).json({ message: 'Error in create productItem' });
                });
        })
        .catch(err => {
            log.error(err, 'productItems::controller::create');
            return res.status(404).json({ message: 'validation error' });
        });
};

module.exports.createMany = async (req, res) => {
    try {
        const payload = { ...req.body };
        try {
            await isSchemeValid(productItemsValidator.createMany, payload);
        } catch (err) {
            loggerValidations.error(err, 'productItems::createMany::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        if (payload.count <= 0) {
            return res.status(500).json({ message: 'Invalid payload' });
        }
        const {isGenerateUniqueEAN5} = await MenuItems.findOne({
            where: {
                id: payload.menuItemId,
                archived: false
            }
        });
        let autoIncremant;
        if (isGenerateUniqueEAN5) {
            autoIncremant = await getIndex(payload.serviceProviderId, payload.menuItemId, payload.count);
        }

        const productItems = [];
        for(let i = 0; i < payload.count; i++) {
            let tempObj = {
                serviceProviderId: payload.serviceProviderId,
                warehouseId: payload.kioskId,
                menuItemId: payload.menuItemId,
                productionDate: payload.productionDate,
                expirationDate: payload.expirationDate,
                status: 'available'
            };
            if (isGenerateUniqueEAN5) {
                tempObj.EAN5 = autoIncremant;
                autoIncremant++;
            }
            productItems.push(tempObj);
        }
        const items = await ProductItems.bulkCreate(productItems);
        return res.json({ items, message: 'productItems have been created' });
    } catch(err) {
        log.error(err, 'productItems::createMany::server error');
        return res.status(500).json({ message: 'Error in create many product items' });
    }
};

module.exports.update = async (req, res) => {
    const id = req.params.id;
    const payload = { ...req.body };
    isSchemeValid(productItemsValidator.create, payload)
        .then(productItems => {
            ProductItems.update(productItems, { where: { id } })
                .then(productItems => {
                    if (productItems) {
                        return res.json({ productItems, message: 'productItems has been updated' });
                    }
                    return res.status(500).json({ message: 'Error in update productItems' });
                }).catch(err => {
                    log.error(err, 'productItems::controller::update');
                    return res.status(500).json({ message: 'Error in update productItems' });
                });
        })
        .catch(err => {
            log.error(err, 'productItems::controller::update');
            return res.status(404).json({ message: 'validation error' });
        });
};

module.exports.getNamesBySelectedItems = async (req, res) => {
    const payload = { ...req.body };
    let payloadProdcutItems = {
        where: {
            id: payload.ids,
            archived: 0
        },
        distinct: true,
        subQuery: false
    };
    const { rows } = await ProductItems.findAndCountAll(payloadProdcutItems);
    let productItems = JSON.parse(JSON.stringify(rows));
    const { serviceProviderId } = productItems[0];
    const payloadWarehouses = {
        where: {
            serviceProviderId: serviceProviderId,
        },
        distinct: true,
        subQuery: false
    };
    Warehouses.findAndCountAll(payloadWarehouses).then(({ count, rows }) => {
        return res.json({ count, data: rows });
    });
};

module.exports.listByKiosk = async (req, res) => {
    const kioskId = req.params.kioskId;
    let payload = getListPayload(req);
    payload.subQuery = false;
    payload.include = [
        { model: MenuItems, where: { archived: false }, attributes: ['id', 'name', 'sku', 'barcode', 'price']}
    ];
    payload.where.status = 'available';
    payload.where.kioskId = kioskId;
    payload.where.archived = false;
    payload = addAssociationOrder(payload);
    payload = addAssociationSearch(payload);
    payload = addOrderById(payload);
    ProductItems.findAndCountAll(payload)
        .then(({ count, rows }) => {
            let data = JSON.parse(JSON.stringify(rows));
            return res.json({ count: count, data: data });
        })
        .catch((err) => {
            log.error(err, 'ProductItems::controller::listByKiosk');
            return res.status(500).json({ message: 'Error in get productItems list' });
        });
};


module.exports.productItemsListByKiosk = async (req, res) => {
    let payload = getListPayload(req);
    const id = Number(req.params.id);
    payload.include = [
        {
            model: MenuItems,
            attributes: ['name', 'sku', 'category', 'barcode'],
            required: true,
            where: { archived: false }
        },
        {
            model: ServiceProviders,
            attributes: ['id'],
            required: true,
            where: { archived: false }
        },
    ];
    payload.where.kioskId = id;
    payload.where.status = 'available';
    payload.where.archived = false;
    if (req.query && !req.query.showExpired) {
        payload.where.expirationDate = {
            [Op.gte]: new Date(),
        };
    }

    payload.attributes = [[Sequelize.fn('GROUP_CONCAT', Sequelize.col('productItems.id')), 'productItemsIds'], 'productionDate', 'menuItemId', 'expiration_date', [Sequelize.fn('MAX', Sequelize.col('productItems.id')), 'productItemsMaxId'], [Sequelize.fn('count', Sequelize.col('productItems.id')), 'productItemsCount']];

    payload.group = ['productionDate', 'menuItemId', 'expiration_date', [Sequelize.col('serviceProvider.id'), 'serviceProvider']];
    payload = addAssociationOrder(payload);
    payload = addAssociationSearch(payload);
    payload = addOrderById(payload, 'productItemsMaxId', true);
    ProductItems.findAndCountAll(payload)
        .then(({ count, rows }) => {
            return res.json({ count: count.length, data: rows });
        })
        .catch((err) => {
            log.error(err, 'productItems::controller::productItemsListByKiosk');
            return res.status(500).json({ message: 'Error in get productItemsListByKiosk' });
        });
};

module.exports.productItemDetailList = async (req, res) => {
    let payload = getListPayload(req);
    const params = JSON.parse(req.query.params);
    const kioskId = Number(req.params.kioskId);
    const menuItemId = Number(req.params.menuItemId);

    payload.include = [
        {
            model: MenuItems,
            attributes: ['id', 'barcode', 'name'],
            required: true,
            where: { archived: false, id: menuItemId }
        },
        {
            model: ServiceProviders,
            attributes: ['id'],
            required: true,
            where: { archived: false }
        },
    ];

    payload.where.kioskId = kioskId;
    payload.where.status = 'available';
    payload.where.archived = false;
    if (params.productionDate) {
      payload.where.productionDate = params.productionDate
    }
    if (params.expirationDate) {
      payload.where.expirationDate = params.expirationDate
    }

    payload.attributes = ['id', 'isReturnedItem', 'productionDate', 'expiration_date', 'returnedKioskId', 'returnedKioskName', 'EAN5'];
    payload = addAssociationOrder(payload);
    payload = addAssociationSearch(payload);
    payload = addOrderById(payload);
    ProductItems.findAndCountAll(payload)
        .then(({ count, rows }) => {
            return res.json({ count, data: rows });
        })
        .catch((err) => {
            log.error(err, 'productItems::controller::productItemDetailList');
            return res.status(500).json({ message: 'Error in get productItemDetailsList' });
        });
};


module.exports.productItemsExportXLSX = async (req, res) => {
    try {
        let payload = getListPayload(req);
        const id = Number(req.params.id);
        payload.include = [
            {
                model: MenuItems,
                attributes: ['name', 'sku', 'category', 'barcode'],
                required: true,
                where: { archived: false }
            },
            {
                model: ServiceProviders,
                attributes: ['id'],
                required: true,
                where: { archived: false }
            },
        ];
        payload.where.kioskId = id;
        payload.where.status = 'available';
        payload.where.archived = false;
        if (req.query && !req.query.showExpired) {
            payload.where.expirationDate = {
                [Op.gte]: new Date(),
            };
        }

        payload.attributes = [[Sequelize.fn('GROUP_CONCAT', Sequelize.col('productItems.id')), 'productItemsIds'], 'productionDate', 'menuItemId', 'expiration_date', [Sequelize.fn('MAX', Sequelize.col('productItems.id')), 'productItemsMaxId'], [Sequelize.fn('count', Sequelize.col('productItems.id')), 'productItemsCount']];
        payload.group = ['productionDate', 'menuItemId', 'expiration_date', [Sequelize.col('serviceProvider.id'), 'serviceProvider']];
        payload = addAssociationOrder(payload);
        payload = addAssociationSearch(payload);
        payload = addOrderById(payload, 'productItemsMaxId', true);

        const fileName = 'ProductItems.xlsx';
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('productItems');
        const productItem = await ProductItems.findAndCountAll(payload)

        worksheet.columns = [
            { header: 'Item Name', key: 'A', width: 48 },
            { header: 'Category', key: 'B', width: 24 },
            { header: 'SKU', key: 'C', width: 24 },
            { header: 'Count', key: 'D', width: 16 },
            { header: 'Prod. Date', key: 'E', width: 24 },
            { header: 'Exp. Date', key: 'F', width: 24 },
        ];

        productItem.rows.forEach(element => {
            worksheet.addRow({
                A: element.menuItem.name,
                B: element.menuItem.category,
                C: element.menuItem.sku,
                D: element.dataValues.productItemsCount,
                E: element.dataValues.productionDate ? moment(element.dataValues.productionDate).utcOffset(getSPTimeZone(req.user)).format('DD.MM.YYYY, HH:mm') : '-',
                F: element.dataValues.expiration_date ? moment(element.dataValues.expiration_date).utcOffset(getSPTimeZone(req.user)).format('DD.MM.YYYY, HH:mm') : '-',
            });
        })

        worksheet.getRow(1).font = { bold: true };
        worksheet.getColumn('C').alignment = { horizontal: 'right' };
        worksheet.getColumn('D').alignment = { horizontal: 'right' };
        worksheet.getColumn('E').alignment = { horizontal: 'right' };
        worksheet.getColumn('F').alignment = { horizontal: 'right' };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        log.error(err, 'productItems::controller::productItemsExport');
        return res.status(500).json({ message: 'Error in get XLSX' });
    }
};

/**
 * @swagger
 * /productItems/createMany:
 *   post:
 *     tags:
 *       - Product items
 *     summary: Bulk crate productItems
 *     description: 'Create many product items'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                     serviceProviderId:
 *                       type: number
 *                     kioskId:
 *                       type: number
 *                     menuItemId:
 *                       type: number
 *                     productionDate:
 *                       type: string
 *                     expirationDate:
 *                       type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.createManyDifferentItems = async (req, res) => {
    const payload = { ...req.body };
    isSchemeValid(productItemsValidator.createManyDifferentItems, payload)
        .then(async () => {
            const productItems = [];

            for(let i = 0; i < payload.productItems.length; i+=1) {
                const curr = payload.productItems[i];
                if (curr.count <= 0) {
                    return res.status(500).json({ message: 'Invalid payload' });
                }
                const {isGenerateUniqueEAN5} = await MenuItems.findOne({
                    where: {
                        id: curr.menuItemId,
                        archived: false
                    }
                });
                let autoIncremant;
                if (isGenerateUniqueEAN5) {
                    autoIncremant = await getIndex(curr.serviceProviderId, curr.menuItemId, curr.count);
                }

                for(let i = 0; i < curr.count; i++) {
                    let tempObj = {
                        serviceProviderId: curr.serviceProviderId,
                        warehouseId: curr.kioskId,
                        menuItemId: curr.menuItemId,
                        productionDate: curr.productionDate,
                        expirationDate: curr.expirationDate,
                        status: 'available'
                    }
                    if (isGenerateUniqueEAN5) {
                        tempObj.EAN5 = autoIncremant;
                        autoIncremant++;
                    }
                    productItems.push(tempObj);
                }
            }
            const items = await ProductItems.bulkCreate(productItems);
            return res.json({ items, message: 'productItems have been created' });
        })
        .catch(async err => {
            log.error(err, 'productItems::createManyDifferentItems');
            return res.status(404).json({ message: 'validation error' });
        });
};
