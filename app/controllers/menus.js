const { Op } = require('sequelize');
const {
    menus: Menus,
    menuItems: MenuItems,
    serviceProviders: ServiceProviders,
    kiosks: Kiosks,
    menuCategories: MenuCategories,
    menuCategoriesMenuItems: MenuCategoriesMenuItems,
    categories: Categories,
    defaultCategories: DefaultCategories,
    menuTags: MenuTags,
    sequelize,
    Sequelize
} = require('app/models/models');
const { menus: menusValidator } = require('app/schemes');
const { isSchemeValid, isSchemeValidSync } = require('app/helpers/validate');
const loggerValidations = require('app/helpers/loggerValidations');
const log = require('app/helpers/logger');
const { getListPayload, getOnePayload, addOrderById } = require('app/controllers/common');

const updateMenuItemAssociation = async (items, id, t) => {
    const Model = sequelize.models.menus_menuItems;

    await Model.destroy({
        where: {
            menuId: id,
            menuItemId: { [Op.notIn]: items }
        }, transaction: t
    });

    const remainingItems = await Model.findAll({
        where: {
            menuId: id,
            menuItemId: { [Op.in]: items }
        },
        attributes: ['menuItemId']
    });

    const remainingItemsIds = remainingItems.map(item => item.menuItemId);
    const itemIdsToCreate = items.filter(item => !remainingItemsIds.includes(item));
    const itemsToCreate = itemIdsToCreate.map(item => ({ menuId: id, menuItemId: item }));

    await Model.bulkCreate(itemsToCreate, { transaction: t });
};

module.exports.list = async (req, res) => {
    let payload = getListPayload(req);
    payload.include = [
        { model: MenuItems, where: { archived: false },  attributes: [], required: false},
        { model: ServiceProviders, attributes: ['id', 'legalName'], required: false },
        { model: Kiosks, attributes: [], required: false }
    ];

    payload.subQuery = false;
    payload.group = [Sequelize.col('menus.id')];
    payload.attributes = [
        'id',
        'menuName',
        [Sequelize.col('`serviceProvider`.`id`'), 'serviceProviderId'],
        [Sequelize.col('`serviceProvider`.`legal_name`'), 'legalName'],
        [sequelize.literal('COUNT(DISTINCT(`kiosks`.`id`))'), 'kiosksCount'],
        [sequelize.literal('COUNT(DISTINCT(`menuItems`.`id`))'), 'menuItemsCount']
    ];
    payload.includeIgnoreAttributes = false;
    payload = addOrderById(payload);
    Menus.findAndCountAll(payload)
        .then(({ count, rows }) => {
            return res.json({ count: count.length, data: rows });
        })
        .catch((err) => {
            log.error(err, 'menu::controller::getMenus');
            return res.status(500).json({ message: 'Error in get user list' });
        });
};

const getPayload = (req, id) => {
    const payload = getOnePayload(req, id);
    payload.include = [
        { model: MenuCategories, required: false, include: [
            { model: MenuCategoriesMenuItems, required: false, include: [
                { model: MenuItems, where: { archived: false }, required: true, attributes: ['id', 'name', 'categoriesId']},
            ]},
            { model: Categories, required: false, include: [
                { model: DefaultCategories, required: false},
            ]},
        ]},
        { model: ServiceProviders, attributes: ['legalName', 'id'], required: false },
        { model: Kiosks, attributes: ['id', 'displayName'], required: false },
        { model: MenuTags, required: false},
    ];
    payload.attributes = ['id', 'menuName', 'description'];
    payload.order = Sequelize.literal('menuCategories.order ASC');
    return payload;
}

module.exports.get = async (req, res) => {
    const id = req.params.id;
    const payload = getPayload(req, id);
    return Menus.findOne(payload)
        .then((menu) => {
            return res.json(menu);
        })
        .catch((err) => {
            log.error(err, 'menu::controller::getMenu');
            return res.status(500).json({ message: 'Error in get menu' });
        });
};

module.exports.clone = async (req, res) => {
    const id = req.params.id;
    try {
        const payload = getPayload(req, id);
        let cloneMenu = await Menus.findOne(payload)
        cloneMenu = JSON.parse(JSON.stringify(cloneMenu))
        delete cloneMenu.id;
        delete cloneMenu.kiosks;
        cloneMenu.menuName = `${cloneMenu.menuName} - Copy`;
        let uniqueMenuItemIDs = [];
        for (let i = 0; i < cloneMenu.menuCategories.length; i += 1) {
            delete cloneMenu.menuCategories[i].id;
            delete cloneMenu.menuCategories[i].category;
            delete cloneMenu.menuCategories[i].menuId;
            for (let j = 0; j < cloneMenu.menuCategories[i].menuCategoriesMenuItems.length; j += 1) {
                delete cloneMenu.menuCategories[i].menuCategoriesMenuItems[j].id;
                delete cloneMenu.menuCategories[i].menuCategoriesMenuItems[j].menuItem;
                delete cloneMenu.menuCategories[i].menuCategoriesMenuItems[j].menuCategoriesId;
                cloneMenu.menuCategories[i].menuCategoriesMenuItems[j].categoriesId = cloneMenu.menuCategories[i].categoriesId;
                let menuItemId = cloneMenu.menuCategories[i].menuCategoriesMenuItems[j].menuItemId;
                if (uniqueMenuItemIDs.indexOf(menuItemId) === -1) {
                    uniqueMenuItemIDs.push(menuItemId);
                }
            }
        }
        let newTags = [];
        for (let j = 0; j < cloneMenu.menuTags.length; j += 1) {
            newTags.push(cloneMenu.menuTags[j].id)
        }
        cloneMenu.selectedExistingTagsIds = newTags;
        cloneMenu.menuItems = uniqueMenuItemIDs;
        cloneMenu.serviceProviderId = cloneMenu.serviceProvider.id;
        delete cloneMenu.serviceProvider;
        const newMenu = await Menus.create(cloneMenu, {
            include: [{
                association: Menus.associations.menuCategories,
                include: [{
                    association: MenuCategories.associations.menuCategoriesMenuItems,
                }]
            }]
        });
        const menuTagsIds = cloneMenu.selectedExistingTagsIds.map(i => ({menuId: newMenu.id, menuTagId: i}));
        await sequelize.models.menus_menuTags.bulkCreate(menuTagsIds);

        // TO DO remove following row after mobile changes.
        await sequelize.models.menus_menuItems.bulkCreate(uniqueMenuItemIDs.map(menuItemId => ({
            menuItemId,
            menuId: newMenu.id
        })));
        return res.json(newMenu);
    } catch (err) {
        log.error(err, 'menu::controller::clone');
        return res.status(500).json({ message: 'can not clone menu' });
    }
};

module.exports.create = async (req, res) => {
    let t;
    try {
        const payload = { ...req.body };
        const {
            isValid, data: { menuItems, ...menu }, errors
        } = isSchemeValidSync(menusValidator.create, payload);

        if (!isValid) {
            log.error(errors, 'menu::create::validation');
            return res.status(400).json({ message: 'validation failed' });
        }
        t = await sequelize.transaction();
        if (payload.newTags) {
            const menuTagsRes = await MenuTags.bulkCreate(payload.newTags, {transaction: t});
            menuTagsRes.forEach(i => { payload.selectedExistingTagsIds.push(i.id); });
        }
        const newMenu = await Menus.create(payload, {
            include: [{
                association: Menus.associations.menuCategories,
                include: [{
                    association: MenuCategories.associations.menuCategoriesMenuItems,
                }]
            }],
            transaction: t
        });
        const menuTagsIds = payload.selectedExistingTagsIds.map(i => ({menuId: newMenu.id, menuTagId: i}));
        await sequelize.models.menus_menuTags.bulkCreate(menuTagsIds, {transaction: t});

        // TO DO remove following row after mobile changes.
        await sequelize.models.menus_menuItems.bulkCreate(menuItems.map(menuItemId => ({
            menuItemId,
            menuId: newMenu.id
        })), {transaction: t});
        await t.commit();
        return res.json({ menu: newMenu });
    } catch (err) {
        try {
            await t.rollback();
        } catch (errRollback) {
            log.error(errRollback, 'menu::create::rollback');
        }
        log.error(err, 'menu::create::server error');
        return res.status(500).json({ message: 'can not create menu' });
    }
};

module.exports.update = async (req, res) => {
    let t;
    try {
        const id = Number(req.params.id);
        const payload = { ...req.body };
        const {
            isValid, data: { menuItems, ...updates }, errors
        } = isSchemeValidSync(menusValidator.create, payload);

        if (!isValid) {
            log.error(errors, 'menu::update::validation');
            return res.status(400).json({ message: 'validation failed' });
        }

        delete updates.serviceProviderId;
        // create new added tags
        t = await sequelize.transaction();
        if (payload.newTags) {
            const newTagsResponse = await MenuTags.bulkCreate(payload.newTags, {transaction: t});
            newTagsResponse.forEach(i => { payload.selectedExistingTagsIds.push(i.id); })
        }

        await Menus.update(updates, { where: { id } }, {transaction: t});
        // TO DO remove following row after mobile changes.
        await updateMenuItemAssociation(menuItems, id, t);
        await MenuCategories.destroy({ where: { menuId:  id}}, {transaction: t})
        await MenuCategories.bulkCreate(updates.menuCategories, {
            include: [{
                association: MenuCategories.associations.menuCategoriesMenuItems,
            }],
            transaction: t
        })

        const menu = await Menus.scope({ method: ['id', id] }).findOne({
            include: [
                { model: MenuItems, where: { archived: false }, through: { attributes: [] }, required: false },
                { model: ServiceProviders, attributes: ['legalName'], required: false },
                { model: Kiosks, attributes: ['displayName'], required: false }
            ]
        });

        // destroy menus_menuTags old relations
        const MenusMenuTagsModel = sequelize.models.menus_menuTags;
        await MenusMenuTagsModel.destroy({
            where: {
                menuId: id,
            },
            transaction: t
        });
        // create menus_menuTags new relations
        const menusTagsIds = payload.selectedExistingTagsIds.map(i => ({menuId: id, menuTagId: i}));
        await MenusMenuTagsModel.bulkCreate(menusTagsIds, {transaction: t});
        await t.commit();
        return res.json({ menu });
    } catch (err) {
        try {
            await t.rollback();
        } catch (errRollback) {
            log.error(errRollback, 'menu::update::rollback');
        }
        log.error(err, 'menu::update::server error');
        return res.status(500).json({ message: 'Error in update menuItem' });
    }
};

/**
 * @swagger
 * '/menus':
 *   delete:
 *     tags:
 *       - Menus
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
    try {
        const { ids } = req.body;
        try {
            await isSchemeValid(menusValidator.delete, ids);
        } catch (err) {
            loggerValidations.error(err, 'menu::controller::delete::validate');
            return res.status(400).json({ message: 'validation error' });
        }
        const menus = await Menus.unscoped().findAll({
            where: {
                id: ids,
            }
        });
        if (ids.length && menus.length !== ids.length) {
            log.error('invalid menu id', 'menu::controller::delete::invalidItemId');
            return res.status(409).json({ message: 'Invalid menu id.' });
        }
        const kioskMenu = await Kiosks.findOne({ where: { menuId: ids }});
        if (kioskMenu) {
            log.error('One or more menus is assigned to a kiosk.', 'menu::controller::delete::kioskMenu');
            return res.status(409).json({ message: 'One or more menus is assigned to a kiosk. Make sure that none of the menus are assigned to proceed.' });
        }
        await Menus.unscoped().destroy({ where: { id: ids }});
        return res.json({ ids, message: 'Item(s) were deleted' });
    } catch (err) {
        log.error(err, 'menu::controller::delete');
        return res.status(500).json({err,  message: 'Error when trying to delete item(s)' });
    }
};
