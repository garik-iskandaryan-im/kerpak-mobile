const { Op } = require('sequelize');
const csv = require('csv-parser');
const Stream = require('stream');
const {
    menuItems: MenuItems,
    serviceProviders: ServiceProviders,
    dietaryMarkers: DietaryMarkers,
    nutritionFacts: NutritionFacts,
    allergens: Allergens,
    productItems: ProductItems,
    categories: Categories,
    defaultCategories: DefaultCategories,
    menuCategoriesMenuItems: MenuCategoriesMenuItems,
    menuCategories: MenuCategories,
    foodProviders: FoodProviders,
    regions: Regions,
    sequelize,
    Sequelize
} = require('app/models/models');
const { menuItems: menuItemsValidator } = require('app/schemes');
const { isSchemeValid, isSchemeValidSync } = require('app/helpers/validate');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');
const { getListPayload, getOnePayload, addAssociationOrder, addOrderById } = require('app/controllers/common');
const CONSTANTS = require('app/constants');
const { Parser } = require('json2csv');

const PATTERN_MESSAGES = {
    'should match pattern "^[0-9]{8}$|^[0-9]{13}$"': 'length must be 8 or 13.'
}

const updateMenuItemAssociation = async (Model, items = [], id, t) => {
    const itemNames = items.map(item => item.name);

    await Model.destroy({
        where: {
            menuItemId: id,
            name: { [Op.notIn]: itemNames }
        }, transaction: t
    });

    const remainingItems = await Model.findAll({
        where: {
            menuItemId: id,
            name: { [Op.in]: itemNames }
        },
        attributes: ['name']
    });

    const remainingItemsNames = remainingItems.map(item => item.name);
    const itemsToCreate = items.filter(item => !remainingItemsNames.includes(item.name));
    itemsToCreate.forEach(item => item.menuItemId = id);

    await Model.bulkCreate(itemsToCreate, {transaction: t});
};

const updateNutritionFacts = async (nutritionFacts = [], id, t) => {
    const itemNameValues = nutritionFacts.map(item => ({
        name: item.name,
        value: item.value,
    }));

    await NutritionFacts.destroy({
        where: {
            menuItemId: id,
            [Op.not]: {
                [Op.or]: itemNameValues
            }
        }, transaction: t
    });

    const remainingItems = await NutritionFacts.findAll({
        where: {
            menuItemId: id,
            [Op.or]: itemNameValues
        }
    });

    const remainingItemsNameValues = remainingItems.map(item => ({
        name: item.name,
        value: item.value,
    }));
    const itemsToCreate = nutritionFacts.filter(item => {
        return !remainingItemsNameValues.find(i => {
            return i.name === item.name && i.value === item.value;
        });
    });

    itemsToCreate.forEach(item => item.menuItemId = id);

    await NutritionFacts.bulkCreate(itemsToCreate, {transaction: t});
};

module.exports.list = async (req, res) => {
    try {
        let payload = getListPayload(req);
        payload.include = [
            { model: Categories, as: 'categories', required: false, include: [
                { model: DefaultCategories, required: false},
            ]},
            {
                model: ServiceProviders, attributes: ['id', 'legalName'], required: false,
                include: [{ model: Regions, attributes: ['currencySymbol'], required: true }]
            },
            {
                model: ProductItems,
                attributes: [],
                where: {
                    status: 'available',
                    archived: false
                },
                required: false
            },
            { model: FoodProviders, attributes: ['name'], required: false },
        ];

        payload = addAssociationOrder(payload);
        payload = addOrderById(payload);
        payload.attributes = [
            'id', 'name', 'sku', 'barcode', 'image', 'imageMedium', 'imageSmall', 'price', 'serviceProviderId', 'duration', 'durationType', 'itemAvailability', [Sequelize.fn('COUNT', Sequelize.col('productItems.id')), 'itemsCount']
        ];

        payload.subQuery = false;
        payload.group = [Sequelize.col('menuItems.id')];
        if (!payload.where.archived) {
            payload.where.archived = false;
        }
        const { count, rows } = await MenuItems.findAndCountAll(payload)
        return res.json({ count: count.length, data: rows });
    } catch (err) {
        log.error(err, 'menuItems::controller::getMenuItems');
        return res.status(500).json({ message: 'Error in get user list' });
    }
};

/**
 * @swagger
 * '/menuItem/{id}':
 *   get:
 *     tags:
 *       - Catalogs
 *     summary: Get catalog by id
 *     description: ''
 *     parameters:
 *       - name: id
 *         in: path
 *         description: catalog ID
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
module.exports.get = async (req, res) => {
    try {
        const id = req.params.id;
        try {
            await isSchemeValid(menuItemsValidator.get, { id });
        } catch (err) {
            loggerValidations.error(err, 'menuItem::getMenuItem::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        const payload = getOnePayload(req, id);
        payload.include = [
            { model: DietaryMarkers, attributes: ['name'], required: false },
            { model: Allergens, attributes: ['name'], required: false },
            { model: NutritionFacts, attributes: ['name', 'value'], required: false },
            { model: ServiceProviders, attributes: ['multiTenantSupport'], required: false },
            { model: Categories, as: 'categories', required: false, include: [
                { model: DefaultCategories, required: false},
            ]},
        ];

        const menuItem = await MenuItems.findOne(payload);

        if (!menuItem) {
            return res.status(404).json({ message: 'menuItem not found' });
        }

        return res.json(menuItem);
    } catch (err) {
        log.error(err, 'menuItem::getMenuItem::server error');
        return res.status(500).json({ message: 'Error in get menu item' });
    }
};

const validateCategoriesObject = async (menuItem) => {
    if (menuItem && menuItem.categories && menuItem.categories.length) {
        if (menuItem.categories[0].name) {
            if (menuItem.categories[0].isDefaultCategory) {
                return {success: false, message: 'validation failed: categories object is not a valid (Step 1).', status: 409};
            } else {
                const existedDefCat = await DefaultCategories.findOne({where: {name: menuItem.categories[0].name}});
                if (existedDefCat) {
                    return {success: false, message: 'validation failed: default category with this name already exists (Step 2).', status: 409};
                }
            }
            const existedCat = await Categories.findOne({where: {serviceProviderId:  menuItem.serviceProviderId, name: menuItem.categories[0].name}});
            if (existedCat) {
                return {success: false, message: 'validation failed: category with this name already exists (Step 3).', status: 409};
            }
            return {success: true};
        } else {
            if (!menuItem.categories[0].isDefaultCategory) {
                return {success: false, message: 'validation failed: categories object is not a valid (Step 4).', status: 409};
            }
            const existedDefCat = await DefaultCategories.findOne({where: {id: menuItem.categories[0].defaultCategoriesId}});
            if (!existedDefCat) {
                return {success: false, message: 'validation failed: categories object is not a valid (Step 5).', status: 409};
            }
            const existedCat = await Categories.findOne({
                where: {
                    isDefaultCategory: true,
                    serviceProviderId: menuItem.serviceProviderId,
                    defaultCategoriesId: menuItem.categories[0].defaultCategoriesId
                }
            });
            if (existedCat) {
                return {success: false, message: 'validation failed: category with this name already exists (Step 6).', status: 409};
            }
            return {success: true};
        }
    } else if (menuItem && menuItem.categoriesId) {
        const existedCat = await Categories.findOne({
            where: {
                serviceProviderId: menuItem.serviceProviderId,
                id: menuItem.categoriesId
            }
        });
        if (!existedCat) {
            return {success: false, message: 'validation failed: category does not exists (Step 7).', status: 409};
        }
        return {success: true};
    }
    return {success: false, message: 'validation failed: category cannot be null', status: 409};
}

const validateFoodProviderObject = async (menuItem) => {
    if (menuItem) {
        const serviceProvider = await ServiceProviders.findOne({ where: { id: menuItem.serviceProviderId } });
        if (!serviceProvider.multiTenantSupport) {
            return { success: true };
        }
        if (menuItem.foodProvider) {
            if (menuItem.foodProvider.name) {
                const existedProvider = await FoodProviders.findOne({ where: { serviceProviderId: menuItem.serviceProviderId, name: menuItem.foodProvider.name } });
                if (existedProvider) {
                    return { success: false, message: 'validation failed: food provider with this name already exists.', status: 409 };
                }
                return { success: true };
            }
        } else if (menuItem.foodProviderId) {
            const existedProvider = await FoodProviders.findOne({
                where: {
                    serviceProviderId: menuItem.serviceProviderId,
                    id: menuItem.foodProviderId
                }
            });
            if (!existedProvider) {
                return { success: false, message: 'validation failed: food provider does not exists.', status: 409 };
            }
            return { success: true };
        }
        return { success: true };
    }
    return { success: false, message: 'validation failed: menu item cannot be null', status: 409 };
};

module.exports.create = async (req, res) => {
    let t;
    try {
        const payload = { ...req.body };
        const { isValid, errors, data: menuItem } = isSchemeValidSync(menuItemsValidator.create, payload);
        if (!isValid) {
            log.error(errors, 'menuItem::create::validation');
            if (errors[0]?.message.includes("match pattern")) {
                const msgText = PATTERN_MESSAGES[errors[0]?.message] || `validation failed`
                return res.status(400).json({ message: errors[0]?.dataPath ? `${errors[0].dataPath.substring(1)} ${msgText}` : 'validation failed' });
            }
            return res.status(400).json({ message: errors[0]?.dataPath && errors[0]?.message ?
                `${errors[0].dataPath.substring(1)} ${errors[0].message}` : 'validation failed'});
        }

        const item = await MenuItems.findAll({
            where: {
                barcode: '' + menuItem.barcode,
                serviceProviderId: menuItem.serviceProviderId,
            }
        });

        if (item && item.length) {
            return res.status(409).json({ message: 'Barcode is not unique' });
        }

        const validatedCategoriesObj = await validateCategoriesObject(menuItem);
        const validatedFoodProviderObj = await validateFoodProviderObject(menuItem);

        if (validatedCategoriesObj && !validatedCategoriesObj.success) {
            return res.status(validatedCategoriesObj.status || 409).json({ message: validatedCategoriesObj.message || 'validation failed.' });
        }

        if (validatedFoodProviderObj && !validatedFoodProviderObj.success) {
            return res.status(validatedFoodProviderObj.status || 409).json({ message: validatedFoodProviderObj.message || 'validation failed.' });
        }

        const productIDIem = await MenuItems.findAll({
            where: {
                sku: '' + menuItem.sku,
                serviceProviderId: menuItem.serviceProviderId
            }
        });

        if (productIDIem && productIDIem.length) {
            return res.status(409).json({ message: 'SKU is not unique' });
        }
        if (menuItem.itemAvailability === CONSTANTS.ITEM_AVAILABILITY.deliveryExclusive) {
            const serviceProvider = await ServiceProviders.findOne({ where: { id: menuItem.serviceProviderId }});
            if (!serviceProvider || !serviceProvider.isSpAllowDelivery) {
                log.error('Forbidden. SP does not support delivery.', 'menuItems::create::SP does not support delivery');
                return res.status(403).json({ message: "Forbidden. SP does not support delivery." });
            }
        }
        t = await sequelize.transaction();
        let newMenuItem = await MenuItems.create(menuItem, {
            include: [
                { association: MenuItems.associations.dietaryMarkers },
                { association: MenuItems.associations.allergens },
                { association: MenuItems.associations.nutritionFacts },
                { association: MenuItems.associations.categories },
                { association: MenuItems.associations.foodProvider }
            ],
            transaction: t
        });
        await t.commit();
        return res.json({ menuItem: newMenuItem, message: 'menuItem has been created' });
    } catch (err) {
        try {
            await t.rollback();
        } catch (errRollback) {
            log.error(errRollback, 'menuItem::create::rollback');
        }
        log.error(err, 'menuItem::create:server error');
        return res.status(500).json({ message: 'Error in create menu item' });
    }
};

const collectCSVMenuItemObj = (curr) => {
    const obj = {};
    Object.keys(curr).map((key, index) => {
        switch(index) {
            case 0:
                obj.name = curr[key];
                break;
            case 1:
                obj.description = curr[key];
                break;
            case 2:
                obj.ingredients = curr[key];
                break;
            case 3:
                obj.sku = curr[key];
                break;
            case 4:
                obj.barcode = curr[key];
                break;
            case 5:
                let value = curr[key].trim().replace(/\s\s+/g, ' ');
                if (value === '') {
                    obj.category = 'Other';
                } else {
                    obj.category = value;
                }
                break;
            case 6:
                obj.price = curr[key];
                break;
            case 7:
                obj.weight = curr[key];
                break;
            case 8:
                obj.duration = curr[key];
                break;
            case 9:
                const valueToLowerCase = curr[key].toLowerCase();
                if (valueToLowerCase === 'h' || valueToLowerCase === 'hour' || valueToLowerCase === 'hours') {
                    obj.durationType = 'hour';
                    break;
                }
                if (valueToLowerCase === 'd' || valueToLowerCase === 'day' || valueToLowerCase === 'days') {
                    obj.durationType = 'day';
                    break;
                }
                if (valueToLowerCase === 'm' || valueToLowerCase === 'month' || valueToLowerCase === 'months') {
                    obj.durationType = 'month';
                    break;
                }
                obj.durationType = curr[key];
                break;
            case 10:
                obj.caloriesCount = curr[key];
                break;
            case 11:
                obj.isGenerateUniqueEAN5 = curr[key].toLowerCase() === 'yes' ? true : false;
                break;
        }
    })
    return obj;
}

const hasDuplicates = (array) => {
    return (new Set(array)).size !== array.length;
}

const getUniqueCategories = (results) => {
    let uniqueCategories = [];
    for (let i = 0, len = results.length; i < len; i++) {
        let category = results[i].category;
        if (uniqueCategories.indexOf(category) === -1) {
            uniqueCategories.push(category)
        }
    }
    return uniqueCategories;
}

const getCategoriesMap = async (results, uniqueCategories, SPID) => {
    let categories = await Categories.findAll({
        where: {
            name: { [Op.in]: uniqueCategories },
            serviceProviderId: SPID,
        }
    });
    let defaultCategories = await DefaultCategories.findAll({
        where: {
            name: { [Op.in]: uniqueCategories }
        },
        include: [
            {
                model: Categories,
                required: false,
                where:  {
                    serviceProviderId: SPID
                }
            }
        ]
    });
    let uniqueNameOfCategoriesToBeCreated = [];
    let categoriesToBeCreated = [];
    for (let i = 0, lenResults = results.length; i < lenResults; i++) {
        let isExist = false;
        let name = results[i].category;
        for (let j = 0, lenCategories = categories.length; j < lenCategories; j++) {
            if (name === categories[j].name) {
                results[i].categoriesId = categories[j].id;
                let index = uniqueCategories.indexOf(name);
                if (index !== -1) {
                    uniqueCategories.splice(index, 1);
                }
                isExist = true;
            }
        }
        if (!isExist) {
            for (let h = 0, lenDefaultCategories = defaultCategories.length; h < lenDefaultCategories; h++) {
                if (name === defaultCategories[h].name) {
                    isExist = true;
                    if (defaultCategories[h].categories.length === 0) {
                        if (uniqueNameOfCategoriesToBeCreated.indexOf(name) === -1) {
                            categoriesToBeCreated.push({
                                name: null,
                                serviceProviderId: SPID,
                                defaultCategoriesId: defaultCategories[h].id,
                                isDefaultCategory: true,
                            });
                            uniqueNameOfCategoriesToBeCreated.push(name);
                        }
                    } else {
                        results[i].categoriesId = defaultCategories[h].categories[0].id;
                        let index = uniqueCategories.indexOf(name);
                        if (index !== -1) {
                            uniqueCategories.splice(index, 1);
                        }
                    }
                }
            }
        }
        if (!isExist) {
            if (uniqueNameOfCategoriesToBeCreated.indexOf(name) === -1) {
                categoriesToBeCreated.push({
                    name: name,
                    serviceProviderId: SPID,
                    defaultCategoriesId: null,
                    isDefaultCategory: false,
                });
                uniqueNameOfCategoriesToBeCreated.push(name);
            }
        }
    }
    return {results, uniqueCategories, categoriesToBeCreated};
}

module.exports.importCSV = async (req, res) => {
    try {
        const SPID = Number(req.params.id);
        const fileContent  = Buffer.from(req.files.file.data, 'binary');
        let results = [];
        let dataList = [];
        const readable =  new Stream.Readable()
        readable.push(fileContent)
        readable.push(null);
        let count = 0;
        let maxLines = 1000;
        let maxLinesError = false;
        readable.pipe(csv())
        .on('data', (data) => {
            if (count < maxLines) {
                dataList.push(data);
                count++;
            } else if (count === maxLines) {
                maxLinesError = true;
                dataList = [];
                count++;
            }
        })
        .on('end', async () => {
            if (maxLinesError) {
                return res.status(500).json({ message: 'The imported file must contain no more than 1000 lines.' });
            }
            if (!dataList.length) {
                return res.status(500).json({ message: 'Parse error' });
            }
            dataList.map(data => {
                const obj = {...collectCSVMenuItemObj(data), serviceProviderId: SPID};
                results.push(obj);
            });
            const { isValid, errors } = isSchemeValidSync(menuItemsValidator.importCSV, results);
            if (!isValid) {
                log.error(errors, 'menuItem::importCSV::validation');
                return res.status(400).json({ message: errors[0]?.dataPath && errors[0]?.message ?
                    `${errors[0].dataPath.substring(1)} ${errors[0].message}` : 'validation failed'});
            }

            const barcodeList = results.map(i => i.barcode);
            const skuList = results.map(i => i.sku);

            if (hasDuplicates(barcodeList)) {
                return res.status(500).json({ message: 'One or more items in the file has the same barcode. Barcode must be unique for each item.' });
            }

            if (hasDuplicates(skuList)) {
                return res.status(500).json({ message: 'One or more items in the file has the same SKU. SKU must be unique for each item.' });
            }

            const filterByBarcode = await MenuItems.findAll({
                where: {
                    barcode: { [Op.in]: barcodeList },
                    serviceProviderId: SPID
                }
            });
            if (filterByBarcode && filterByBarcode.length) {
                return res.status(500).json({ message: 'There is one or more items in the file which have an already existing barcode. Please check your catalog for duplicates.' });
            }

            const filterBySKU = await MenuItems.findAll({
                where: {
                    sku: { [Op.in]: skuList },
                    serviceProviderId: SPID
                }
            });
            if (filterBySKU && filterBySKU.length) {
                return res.status(500).json({ message: 'There is one or more items in the file which have an already existing SKU. Please check your catalog for duplicates.' });
            }
            let uniqueCategories = getUniqueCategories(results);

            let categoriesMap = await getCategoriesMap(results, uniqueCategories, SPID);

            let newMenuItem;
            try {
                await Categories.bulkCreate(categoriesMap.categoriesToBeCreated);
                let {results: newResults} = await getCategoriesMap(categoriesMap.results, categoriesMap.uniqueCategories, SPID);
                newMenuItem = await MenuItems.bulkCreate(newResults, {
                    include: [
                        { association: MenuItems.associations.dietaryMarkers },
                        { association: MenuItems.associations.allergens },
                        { association: MenuItems.associations.nutritionFacts }
                    ]
                });
            } catch (err) {
                log.error(err, 'menuItem::importCSV::menu item create');
                return res.status(500).json({ message: 'Error in create menu item' });
            }
            return res.json({ menuItem: newMenuItem, message: 'menuItem has been created' });
        });
    } catch (err) {
        log.error(err, 'menuItem::importCSV');
        return res.status(404).json({ message: 'Error in import CSV' });
    }
};

module.exports.update = async (req, res) => {
    let t;
    try {
        const payload = { ...req.body };
        const id = Number(req.params.id);
        let {
            isValid,
            data: {
                dietaryMarkers,
                allergens,
                nutritionFacts,
                ...updates
            },
            errors
        } = isSchemeValidSync(menuItemsValidator.create, payload);
        if (!isValid) {
            if (errors[0]?.message.includes("match pattern")) {
                const msgText = PATTERN_MESSAGES[errors[0]?.message] || `validation failed`
                return res.status(400).json({ message: errors[0]?.dataPath ? `${errors[0].dataPath.substring(1)} ${msgText}` : 'validation failed' });
            }
            log.error(errors, 'menuItem::update::validation');
            return res.status(400).json({ message: 'validation failed' });
        }
        const item = await MenuItems.findAll({
            where: {
                id: {[Op.ne]: id},
                barcode: '' + updates.barcode,
                serviceProviderId: updates.serviceProviderId
            }
        });

        if (item && item.length) {
            return res.status(409).json({ message: 'Barcode is not unique' });
        }

        const validatedCategoriesObj = await validateCategoriesObject(updates);
        const validatedFoodProviderObj = await validateFoodProviderObject(updates);

        if (validatedCategoriesObj && !validatedCategoriesObj.success) {
            return res.status(validatedCategoriesObj.status || 409).json({ message: validatedCategoriesObj.message || 'validation failed.' });
        }
        if (validatedFoodProviderObj && !validatedFoodProviderObj.success) {
            return res.status(validatedFoodProviderObj.status || 409).json({ message: validatedFoodProviderObj.message || 'validation failed.' });
        }

        const productIDIem = await MenuItems.findAll({
            where: {
                id: {[Op.ne]: id},
                sku: '' + updates.sku,
                serviceProviderId: updates.serviceProviderId
            }
        });

        if (productIDIem && productIDIem.length) {
            return res.status(409).json({ message: 'SKU is not unique' });
        }

        if (!allergens) {
            allergens = [];
        }
        if (!dietaryMarkers) {
            dietaryMarkers = [];
        }
        if (!nutritionFacts) {
            nutritionFacts = [];
        }

        if (updates.itemAvailability === CONSTANTS.ITEM_AVAILABILITY.deliveryExclusive) {
            const serviceProvider = await ServiceProviders.findOne({ where: { id: updates.serviceProviderId }});
            if (!serviceProvider || !serviceProvider.isSpAllowDelivery) {
                log.error('Forbidden. SP does not support delivery.', 'menuItems::update::SP does not support delivery');
                return res.status(403).json({ message: "Forbidden. SP does not support delivery." });
            }
        }

        delete updates.serviceProviderId;
        t = await sequelize.transaction();

        if (updates.categories) {
            let newCategories = await Categories.create(updates.categories[0], {transaction: t});
            updates.categoriesId = newCategories.id;
        }
        if (updates.foodProvider) {
            let newFoodProvider = await FoodProviders.create(updates.foodProvider, {transaction: t});
            updates.foodProviderId = newFoodProvider.id;
        }
        await MenuItems.update(updates, { where: { id }, transaction: t });

        await updateMenuItemAssociation(Allergens, allergens, id, t);
        await updateMenuItemAssociation(DietaryMarkers, dietaryMarkers, id, t);
        await updateNutritionFacts(nutritionFacts, id, t);

        const menuCategories = await MenuCategoriesMenuItems.findAll({
            where: {
                menuItemId: updates.id
            }
        });
        if (menuCategories?.length) {
            const menuCategoryIds = menuCategories.map(menuCategory => menuCategory.menuCategoriesId);
            await MenuCategories.update({ categoriesId: updates.categoriesId }, {
                where: {
                    id: { [Op.in]: menuCategoryIds }
                }, transaction: t
            });
        }
        await t.commit();
        return res.json({ messages: 'MenuItem successfully updated' });
    } catch (err) {
        try {
            await t.rollback();
        } catch (errRollback) {
            log.error(errRollback, 'menuItem::update::rollback');
        }
        log.error(err, 'menuItem::update::server error');
        return res.status(500).json({ message: 'Error in update menuItem' });
    }
};

/**
 * @swagger
 * '/menuItems':
 *   delete:
 *     tags:
 *       - Catalogs
 *     summary: Delete item(s)
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: number
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.delete = async (req, res) => {
    let transaction;
    try {
        const { ids } = req.body;
        try {
            await isSchemeValid(menuItemsValidator.delete, ids);
        } catch (err) {
            loggerValidations.error(err, 'MenuItems::delete::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        const menuCategoriesIds = new Set();
        const menuItems = await MenuItems.findAll({
            where: {
                id: ids,
                archived: true
            },
            include: [{ model: MenuCategoriesMenuItems }]
        });
        if (ids.length && menuItems.length !== ids.length) {
            log.error('invalid catalogue id', 'MenuItems::delete::invalid item id');
            return res.status(409).json({ message: 'Invalid item id.' });
        }
        menuItems.forEach(menuItem => menuItem.menuCategoriesMenuItems.forEach(menuCategoriesMenuItem => menuCategoriesIds.add(menuCategoriesMenuItem.menuCategoriesId)))
        const productItemsCount = await ProductItems.unscoped().count({ where: { menuItemId: ids, status: 'available'}});
        if (productItemsCount > 0) {
            log.error('One or more items has available instances', 'MenuItems::delete::items has available instances');
            return res.status(409).json({ message: 'One or more items has available instances. Make sure they\'re removed from warehouse or kiosk and try again.' });
        }
        transaction = await sequelize.transaction();
        await MenuItems.destroy({ where: { id: ids, archived: true }, transaction});
        for (let menuCategoriesId of menuCategoriesIds) {
            const menuCategoriesMenuItemCount =  await MenuCategoriesMenuItems.count({ where: { menuCategoriesId }, transaction});
            if (!menuCategoriesMenuItemCount) {
                await MenuCategories.destroy({ where: { id: menuCategoriesId }, transaction });
            }
        }
        await transaction.commit();
        return res.json({ ids, message: 'Item(s) were deleted' });
    } catch (err) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (errRollback) {
                log.error(errRollback, 'MenuItems::delete::rollback');
            }
        }
        log.error(err, 'MenuItems::delete::server error');
        return res.status(500).json({ message: 'Error when trying to delete item(s)' });
    }
};

/**
 * @swagger
 * '/menuItem/{id}/name':
 *   get:
 *     tags:
 *       - Catalogs
 *     summary: Get catalog name
 *     description: ''
 *     parameters:
 *       - name: id
 *         in: path
 *         description: catalog ID
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
        const id = req.params.id;
        try {
            await isSchemeValid(menuItemsValidator.get, { id });
        } catch (err) {
            loggerValidations.error(err, 'menuItem::getName::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        const payload = getOnePayload(req, id);
        payload.attributes = ['id', 'name'];
        payload.where.archived = false;
        const menuItem = await MenuItems.findOne(payload);

        if (!menuItem) {
            return res.status(404).json({ message: 'menuItem not found' });
        }

        return res.json(menuItem);
    } catch (err) {
        log.error(err, 'menuItem::getName::server error');
        return res.status(500).json({ message: 'Error in get menu item name' });
    }
};

 module.exports.getCatalogCount = async (req, res) => {
    try {
        const payload = getListPayload(req);
        payload.where.archived = false;
        const count = await MenuItems.count(payload);
        return res.json(count);
    } catch (err) {
        log.error(err, 'menuItems::controller::getCatalogCount');
        return res.status(400).json({ message: 'validation error' });
    }
};

module.exports.exportXLSX = async (req, res) => {
    try {
        let payload = getListPayload(req, false);

        payload.include = [
            { model: Categories, as: 'categories', required: false, include: [ { model: DefaultCategories, required: false} ]},
        ];

        payload = addAssociationOrder(payload);
        payload.attributes = [ 'id', 'name', 'sku', 'barcode', 'price', 'duration', 'durationType', 'calories_count', 'description', 'is_generate_unique_EAN5', 'weight', 'ingredients'];

        payload.subQuery = false;
        payload.group = [Sequelize.col('menuItems.id')];
        if (!payload.where.archived) {
            payload.where.archived = false;
        }
        const menuItems = await MenuItems.findAll(payload);

        const fileName = 'menuItems.xlsx';
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('menuItems');

        worksheet.columns = [
            { header: 'Name', key: 'A', width: 32 },
            { header: 'Description', key: 'B', width: 32 },
            { header: 'Ingredients', key: 'C', width: 32 },
            { header: 'SKU', key: 'D', width: 16 },
            { header: 'Barcode', key: 'E', width: 24 },
            { header: 'Category', key: 'F', width: 24 },
            { header: 'Price', key: 'G', width: 8 },
            { header: 'Weight (grams)', key: 'H', width: 8 },
            { header: 'Shelf life', key: 'I', width: 8 },
            { header: 'Shelf life measure', key: 'J', width: 8 },
            { header: 'Calories', key: 'K', width: 8 },
            { header: 'Enable unique identifier', key: 'L', width: 8 },
        ];

        menuItems.forEach(element => {
            worksheet.addRow({
                A: element.name,
                B: element.description,
                C: element.ingredients,
                D: element.sku,
                E: element.barcode,
                F: element.categories.name || element.categories.defaultCategory && element.categories.defaultCategory.name,
                G: element.price,
                H: element.weight,
                I: element.duration,
                J: element.durationType,
                K: element.dataValues.calories_count,
                L: element.dataValues.is_generate_unique_EAN5
            });
        });

        worksheet.getRow(1).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        log.error(err, 'menuItems::controller::exportXLSX');
        return res.status(500).json({ message: 'Error in get XLSX data.' });
    }
};

module.exports.exportCSV = async (req, res) => {
    try {
        let payload = getListPayload(req, false);

        payload.include = [
            { model: Categories, as: 'categories', required: false, include: [ { model: DefaultCategories, required: false} ]},
        ];

        payload = addAssociationOrder(payload);
        payload.attributes = [ 'id', 'name', 'description', 'ingredients', 'sku', 'barcode', 'weight', 'price', 'serviceProviderId', 'duration', 'durationType', 'itemAvailability', 'caloriesCount', 'isGenerateUniqueEAN5' ];

        payload.subQuery = false;
        payload.group = [Sequelize.col('menuItems.id')];
        if (!payload.where.archived) {
            payload.where.archived = false;
        }
        const menuItems = await MenuItems.findAll(payload);

        menuItems.forEach(menuItem => {
            menuItem.categoryName = menuItem.categories.name || menuItem.categories.defaultCategory.name;
            menuItem.isGenerateUniqueEAN5 = menuItem.isGenerateUniqueEAN5 ? 'Yes' : 'No';
        });

        const fields = [
            { label: 'NAME', value: 'name' },
            { label: 'Description', value: 'description' },
            { label: 'Ingredients', value: 'ingredients' },
            { label: 'SKU', value: 'sku' },
            { label: 'Barcode', value: 'barcode' },
            { label: 'Category', value: 'categoryName' },
            { label: 'Price', value: 'price' },
            { label: 'Weight (grams)', value: 'weight' },
            { label: 'Shelf life', value: 'duration' },
            { label: 'Shelf life measure', value: 'durationType' },
            { label: 'Calories', value: 'caloriesCount' },
            { label: 'Enable unique identifier', value: 'isGenerateUniqueEAN5' }
        ];

        const json2csv = new Parser({ fields: fields });

        try {
            const csv = json2csv.parse(menuItems);
            res.attachment('menuItems.csv');
            res.status(200).send(csv);
        } catch (error) {
            log.error(error, 'menuItems::controller::exportCSV::parser');
            res.status(500).json({ message: 'Error in get csv data.' });
        }
    } catch (err) {
        log.error(err, 'menuItems::controller::exportCSV');
        return res.status(500).json({ message: 'Error in get CSV data.' });
    }
};

module.exports.getCSV = async (req, res) => {
    try {
        const pdfName = 'catalog-template.csv';
        const file = `./app/assets/csvTemplate/${pdfName}`;
        res.download(file);
    } catch (err) {
        log.error(err, 'menuItems::controller::getCSV');
        return res.status(400).json({ message: 'Something went wrong.' });
    }
};

/**
 * @swagger
 * '/menuItems/restore':
 *   put:
 *     tags:
 *       - Catalogs
 *     summary: Restore item(s)
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: number
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.restore = async (req, res) => {
    let transaction;
    try {
        const { ids } = req.body;
        try {
            await isSchemeValid(menuItemsValidator.restore, ids);
        } catch (err) {
            loggerValidations.error(err, 'menuItems::restore::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        const menuItemsCount = await MenuItems.count({ where: { id: ids, archived: true } });
        if (ids.length && menuItemsCount !== ids.length) {
            log.error('invalid catalogue id', 'menuItems::restore::invalid item id');
            return res.status(409).json({ message: 'Invalid item id.' });
        }
        transaction = await sequelize.transaction();
        await MenuItems.update({ archived: false }, { where: { id: ids, archived: true }, transaction });
        await ProductItems.update({ archived: false }, { where: { menuItemId: ids, archived: true }, transaction });
        await transaction.commit();
        return res.json({ ids, message: 'Item(s) were restored to catalog' });
    } catch (err) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (errRollback) {
                log.error(errRollback, 'menuItems::restore::rollback');
            }
        }
        log.error(err, 'menuItems::restore::server error');
        return res.status(500).json({ message: 'Error when restoring item(s)' });
    }
};

/**
 * @swagger
 * '/menuItems/archive':
 *   put:
 *     tags:
 *       - Catalogs
 *     summary: Archive item(s)
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: number
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.archive = async (req, res) => {
    let transaction;
    try {
        const { ids } = req.body;
        try {
            await isSchemeValid(menuItemsValidator.archive, ids);
        } catch (err) {
            loggerValidations.error(err, 'menuItems::archive::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        const menuItemsCount = await MenuItems.count({ where: { id: ids, archived: false }});
        if (ids.length && menuItemsCount !== ids.length) {
            log.error('invalid catalogue id', 'menuItems::archive::invalid item id');
            return res.status(409).json({ message: 'Invalid item id.' });
        }
        const productItemsCount = await ProductItems.count({ where: { menuItemId: ids, status: 'available'}});
        if (productItemsCount > 0) {
            log.error('One or more items has available instances', 'menuItems::archive::has available instances');
            return res.status(409).json({ message: 'One or more items has available instances. Make sure they\'re removed from warehouse or kiosk and try again.' });
        }
        transaction = await sequelize.transaction();
        await MenuItems.update({ archived: true }, { where: { id: ids, archived: false }, transaction });
        await ProductItems.update({ archived: true }, { where: { menuItemId: ids }, transaction });
        await transaction.commit();
        return res.json({ ids, message: 'Item(s) were moved to Catalog archive' });
    } catch (err) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (errRollback) {
                log.error(errRollback, 'menuItems::archive::rollback');
            }
        }
        log.error(err, 'menuItems::archive');
        return res.status(500).json({ message: 'Error when moving item(s) to Catalog archive' });
    }
};