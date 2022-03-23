const models = require('../models/models');

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'menuItems',
            'categories_id',
            {
                type: Sequelize.DataTypes.INTEGER,
                references: {
                    model: {
                        tableName: 'categories'
                    },
                    key: 'id'
                },
                allowNull: true,
                field: 'categories_id'
            },
        );
        queryInterface.bulkInsert('defaultCategories', [{
            name: 'Appetizers',
          }, {
            name: 'Breakfast',
          }, {
            name: 'Desserts',
          }, {
            name: 'Drinks',
          }, {
            name: 'Lunch',
          }, {
            name: 'Main Dishes',
          }, {
            name: 'Salads',
          }, {
            name: 'Sandwiches and wraps',
          }, {
            name: 'Sides',
          }, {
            name: 'Snacks',
          }, {
            name: 'Soups',
          }, {
            name: 'Sweets',
          }, {
            name: 'Baked goods',
          }, {
            name: 'Pies',
          }, {
            name: 'Other',
          }]);
        
        const menuItems = await models.menuItems.findAll({ where: { archived: false }, raw: true });
        for (let i in menuItems) {
            let category = menuItems[i].category;
            let resDefaultCategories = await models.defaultCategories.findAll({ where: { name:  category}, raw: true });
            if (resDefaultCategories.length) {
                let resCategories = await models.categories.findAll({ where: { 
                    defaultCategoriesId: resDefaultCategories[0].id,
                    isDefaultCategory: true,
                    serviceProviderId: menuItems[i].serviceProviderId
                }, raw: true });
                if (resCategories.length) {
                    await models.menuItems.update({ categoriesId: resCategories[0].id }, { where: { id: menuItems[i].id, archived: false } });
                } else {
                    let newCategory = await models.categories.create({
                        defaultCategoriesId: resDefaultCategories[0].id,
                        isDefaultCategory: true,
                        name: null,
                        serviceProviderId: menuItems[i].serviceProviderId
                    });
                    await models.menuItems.update({ categoriesId: newCategory.id }, { where: { id: menuItems[i].id, archived: false } });
                }
            } else {
                let resCategories = await models.categories.findAll({ where: {
                    defaultCategoriesId: null,
                    isDefaultCategory: false,
                    name: category,
                    serviceProviderId: menuItems[i].serviceProviderId
                }, raw: true });
                if (resCategories.length) {
                    await models.menuItems.update({ categoriesId: resCategories[0].id }, { where: { id: menuItems[i].id, archived: false } });
                } else {
                    let newCategory = await models.categories.create({
                        defaultCategoriesId: null,
                        isDefaultCategory: false,
                        name: category,
                        serviceProviderId: menuItems[i].serviceProviderId
                    });
                    await models.menuItems.update({ categoriesId: newCategory.id }, { where: { id: menuItems[i].id, archived: false } });
                }
            }
        }
        const menus = await models.menus.findAll({
            include: [
                { model: models.menuItems, where: { archived: false },  attributes: ['id', 'name', 'categoriesId'] , required: false },
            ],
            where: { archived: false },
            distinct: true 
        });
        for (let j in menus) {
            let menu = JSON.parse(JSON.stringify(menus[j]));
            for (h in menu.menuItems) {
                let menuItem = menu.menuItems[h];
                let isExist = await models.menuCategories.findOne({
                    where: {
                        menuId: menu.id,
                        serviceProviderId: menu.serviceProviderId,
                        categoriesId: menuItem.categoriesId
                    }
                })
                if (isExist) {
                    let countMenuItem = await models.menuCategoriesMenuItems.count({
                        where: {
                            menuCategoriesId: isExist.id,
                            serviceProviderId: menu.serviceProviderId,
                        }
                    });
                    let orderMenuItem = countMenuItem + 1;
                    let newMunuCategoriesMenuItem = await models.menuCategoriesMenuItems.create({
                        order: orderMenuItem,
                        menuCategoriesId: isExist.id,
                        serviceProviderId: menu.serviceProviderId,
                        menuItemId: menuItem.id
                    });
                } else {
                    let count = await models.menuCategories.count({
                        where: {
                            menuId: menu.id,
                            serviceProviderId: menu.serviceProviderId,
                        }
                    });
                    let order = count + 1;
                    let newMenuCategories = await models.menuCategories.create({
                        isPopular: false,
                        order: order,
                        categoriesId: menuItem.categoriesId,
                        serviceProviderId: menu.serviceProviderId,
                        menuId: menu.id
                    });
                    let countMenuItem = await models.menuCategoriesMenuItems.count({
                        where: {
                            menuCategoriesId: newMenuCategories.id,
                            serviceProviderId: menu.serviceProviderId,
                        }
                    });
                    let orderMenuItem = countMenuItem + 1;
                    let newMunuCategoriesMenuItem = await models.menuCategoriesMenuItems.create({
                        order: orderMenuItem,
                        menuCategoriesId: newMenuCategories.id,
                        serviceProviderId: menu.serviceProviderId,
                        menuItemId: menuItem.id
                    });
                }
            } 
        }
        return false;
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('menuItems_categories');
        await queryInterface.dropTable('default_categories');
    }
};