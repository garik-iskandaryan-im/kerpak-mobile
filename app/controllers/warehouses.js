const {
    warehouses: Warehouses,
    serviceProviders: ServiceProviders,
    productItems: ProductItems,
    menuItems: MenuItems,
    Sequelize,
} = require('app/models/models');
const { isSchemeValid, isSchemeValidSync } = require('app/helpers/validate');
const { getCurrentSP, getListPayload, addAssociationOrder, getOnePayload, addAssociationSearch, addAssociationFilter, addOrderById } = require('app/controllers/common');
const { warehouses: warehouseValidator } = require('app/schemes');
const loggerValidations = require('app/helpers/loggerValidations');
const log = require('app/helpers/logger');
const { exportHelper } = require('app/helpers/exportHelper');
const { Op } = require('sequelize');
const pdf = require('html-pdf');

module.exports.getNames = async (req, res) => {
    const currentSP = getCurrentSP(req);
    let payload = {
        include: { model: ServiceProviders, attributes: ['isSpAllowDelivery', 'havePreOrder'], required: false },
      where: {}
    };
    if (currentSP) {
        payload.where.serviceProviderId = currentSP;
    }
    payload.attributes = ['id', 'displayName', 'serviceProviderId'];
    Warehouses.findAll(payload)
        .then((rows) => {
            return res.json(rows);
        })
        .catch((err) => {
            log.error(err, 'warehouses::controller::getNames');
            return res.status(500).json({ message: 'Error in get warehouses list' });
        });
};

module.exports.list = async (req, res) => {
    try {
        let payload = getListPayload(req);

        payload.include = [
            { model: ServiceProviders, attributes: ['id', 'legalName'], required: false },
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

        const { count, rows } = await Warehouses.findAndCountAll(payload);
        return res.json({ count: count.length, data: rows });
    } catch (err) {
        log.error(err, 'warehouses::controller::getWarehouses');
        return res.status(500).json({ message: 'Error in get warehouses list' });
    }
};

module.exports.productItemsList = async (req, res) => {
    let payload = getListPayload(req);
    const id = Number(req.params.id);
    payload.include = [
        {
            model: MenuItems,
            attributes: ['name', 'sku', 'category', 'barcode', 'itemAvailability'],
            required: true,
            where: { archived: false }
        }
    ];
    payload.where.warehouseId = id;
    payload.where.status = 'available';
    payload.where.archived = false;
    if (req.query && !req.query.showExpired) {
        payload.where.expirationDate = {
            [Op.gte]: new Date(),
        };
    }

    payload.attributes = [[Sequelize.fn('GROUP_CONCAT', Sequelize.col('productItems.id')), 'productItemsIds'], 'productionDate', 'menuItemId', 'expiration_date', [Sequelize.fn('MAX', Sequelize.col('productItems.id')), 'productItemsMaxId'], [Sequelize.fn('count', Sequelize.col('productItems.id')), 'productItemsCount']];

    payload.group = ['productionDate', 'menuItemId', 'expiration_date'];
    payload = addAssociationOrder(payload);
    payload = addAssociationSearch(payload);
    payload = addAssociationFilter(payload);
    payload = addOrderById(payload, 'productItemsMaxId', true);
    ProductItems.findAndCountAll(payload)
        .then(({ count, rows }) => {
            return res.json({ count: count.length, data: rows });
        })
        .catch((err) => {
            log.error(err, 'warehouses::controller::productItemsList');
            return res.status(500).json({ message: 'Error in get productItemsList' });
        });
};

module.exports.productItemDetailList = async (req, res) => {
    let payload = getListPayload(req);
    const params = JSON.parse(req.query.params);
    const warehouseId = Number(req.params.warehouseId);
    const menuItemId = Number(req.params.menuItemId);

    payload.include = [
        {
            model: MenuItems,
            attributes: ['id', 'barcode', 'name'],
            required: true,
            where: { archived: false, id: menuItemId }
        }
    ];

    payload.where.warehouseId = warehouseId;
    payload.where.status = 'available';
    payload.where.archived = false;
    if (params.productionDate) {
      payload.where.productionDate = params.productionDate
    }
    if (params.expirationDate) {
      payload.where.expirationDate = params.expirationDate
    }

    payload.attributes = ['id', 'isReturnedItem', 'productionDate', 'expiration_date', 'returnedKioskId', 'returnedKioskName', 'EAN5'];
    payload = addOrderById(payload);

    ProductItems.findAndCountAll(payload)
        .then(({ count, rows }) => {
            return res.json({ count, data: rows });
        })
        .catch((err) => {
            log.error(err, 'warehouses::controller::productItemDetailList');
            return res.status(500).json({ message: 'Error in get productItemDetailsList' });
        });
};

module.exports.get = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await isSchemeValid(warehouseValidator.get, { id });
        let payload = getOnePayload(req, id);
        const warehouse = await Warehouses.findOne(payload)

        if (!warehouse) {
            return res.status(404).json({ message: 'warehouse not found' });
        }

        return res.json(warehouse);
    } catch (err) {
        log.error(err, 'warehouse::controller::getWarehouse');
        return res.status(400).json({ message: 'validation error' });
    }
};

module.exports.create = async (req, res) => {
    const payload = { ...req.body };
    return isSchemeValid(warehouseValidator.create, payload)
        .then(async (warehouse) => {
            Warehouses.create(warehouse).then(async warehouse => {
                if (warehouse) {
                    return res.json({ warehouse, message: 'Warehouse has been created' });
                }
                return res.status(500).json({ message: 'Error in create warehouse' });
            }).catch(async (err) => {
                log.error(err, 'warehouse::create::createWarehouse');
                return res.status(500).json({ message: 'Error in create warehouse' });
            });
        })
        .catch(async (err) => {
            log.error(err, 'warehouse::create::validation');
            return res.status(404).json({ message: 'validation error' });
        });
};

module.exports.update = async (req, res) => {
    try {
        const payload = { ...req.body };
        const id = Number(req.params.id);
        let { isValid, data: { ...updates }, errors } = isSchemeValidSync(warehouseValidator.update, payload);
        if (!isValid) {
            log.error(errors, 'warehouse::update::validation');
            return res.status(400).json({ message: 'validation failed' });
        }
        await Warehouses.update(updates, { where: { id } });
        const warehouse = await Warehouses.findOne({
            where: { id },
        });
        return res.json({ warehouse });
    } catch (err) {
        log.error(err, 'warehouse::update::server error');
        return res.status(500).json({ message: 'Error in update warehouse' });
    }
};

module.exports.createPDF = async (req, res) => {
    try {
        const { html, options = { height: "3.0cm", width: "5.7cm" } } = req.body;
        const pdfName = new Date().getTime();
        pdf.create(html, options).toFile(`./labels/${pdfName}.pdf`, function(err) {
            if (err) return console.log(err);
            return res.json({ fileName: pdfName});
        });
    } catch (err) {
        log.error(err, 'Warehouse::createPDF');
        return res.status(400).json({ message: 'Error in create PDF' });
    }
};

module.exports.getPDF = async (req, res) => {
    try {
        const pdfName = req.params.name;
        const file = `./labels/${pdfName}.pdf`;
        res.download(file);
    } catch (err) {
        log.error(err, 'Warehouse::getPDF');
        return res.status(400).json({ message: 'Error in get PDF' });
    }
};

/**
 * @swagger
 * '/warehouse/{id}/name':
 *   get:
 *     tags:
 *       - Warehouse
 *     summary: Get warehouse name
 *     description: ''
 *     parameters:
 *       - name: id
 *         in: path
 *         description: warehouse ID
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
            await isSchemeValid(warehouseValidator.get, { id });
        } catch (err) {
            loggerValidations.error(err, 'warehouse::getWarehouseName::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        let payload = getOnePayload(req, id);
        payload.attributes = ['id', 'displayName', 'serviceProviderId'];
        const warehouse = await Warehouses.findOne(payload)
        if (!warehouse) {
            return res.status(404).json({ message: 'warehouse not found' });
        }

        return res.json(warehouse);
    } catch (err) {
        log.error(err, 'warehouse::getWarehouseName::server error');
        return res.status(500).json({ message: 'Error in get warehouse name' });
    }
};

module.exports.productItemsListExport = async (req, res) => {
    try {
        let payload = getListPayload(req);
        const id = Number(req.params.id);
        payload.include = [
            {
                model: MenuItems,
                attributes: ['name', 'sku', 'category'],
                required: true,
                where: { archived: false }
            }
        ];
        payload.where.warehouseId = id;
        payload.where.status = 'available';
        payload.where.archived = false;
        if (req.query && !req.query.showExpired) {
            payload.where.expirationDate = {
                [Op.gte]: new Date(),
            };
        }
        payload.attributes = [[Sequelize.fn('GROUP_CONCAT', Sequelize.col('productItems.id')), 'productItemsIds'], 'productionDate', 'menuItemId', 'expiration_date', [Sequelize.fn('MAX', Sequelize.col('productItems.id')), 'productItemsMaxId'], [Sequelize.fn('count', Sequelize.col('productItems.id')), 'productItemsCount']];
        payload.group = ['productionDate', 'menuItemId', 'expiration_date'];
        payload = addAssociationOrder(payload);
        payload = addAssociationSearch(payload);
        payload = addAssociationFilter(payload);
        payload = addOrderById(payload, 'productItemsMaxId', true);
        payload.raw = true;
        const productItems = await ProductItems.findAll(payload);
        const fileName = 'productItems.xlsx';

        const columns = [
            { header: 'Name', key: 'A', width: 20 },
            { header: 'Category', key: 'B', width: 20 },
            { header: 'SKU', key: 'C', width: 20 },
            { header: 'Count', key: 'D', width: 20 },
            { header: 'Prod. date', key: 'E', width: 20, isDate: true },
        ];
        const columnsIds = {
            A: 'menuItem.name',
            B: 'menuItem.category',
            C: 'menuItem.sku',
            D: 'productItemsCount',
            E: 'productionDate'
        };
        const columnNames = ['A', 'B', 'C', 'D', 'E'];
        const { workbook, worksheet } = exportHelper(productItems, fileName, 'ProductItems', columns, columnsIds, columnNames, res, req);
        worksheet.getRow(1).font = { bold: true };
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        log.error(err, 'warehouse::controller::productItemsListExport');
        return res.status(500).json({ message: 'Error in get XLSX' });
    }
};