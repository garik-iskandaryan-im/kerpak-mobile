const models = require('../models/models');
const { Op } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // add allowNull false in dietaryMarkers
            await models.dietaryMarkers.destroy({
                where: {
                    menuItemId: { [Op.is]: null }
                },
                transaction
            });
            await queryInterface.changeColumn('dietaryMarkers', 'menu_item_id', {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: false
            }, { transaction });

            // add allowNull false in nutritionFacts
            await models.nutritionFacts.destroy({
                where: {
                    menuItemId: { [Op.is]: null }
                },
                transaction
            });
            await queryInterface.changeColumn('nutritionFacts', 'menu_item_id', {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: false
            }, { transaction });

            // add on delete cascade in allergens menuItems relation
            await queryInterface.removeConstraint(
                'allergens',
                'allergens_ibfk_1',
                { transaction }
            );
            await queryInterface.addConstraint('allergens', {
                type: 'foreign key',
                name: 'allergens_ibfk_1',
                references: {
                    table: 'menuItems',
                    field: 'id',
                },
                fields: ['menu_item_id'],
                onDelete: 'CASCADE',
                transaction
            });
            // add allowNull false in allergens
            await models.allergens.destroy({
                where: {
                    menuItemId: { [Op.is]: null }
                },
                transaction
            });
            await queryInterface.changeColumn('allergens', 'menu_item_id', {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: false
            }, { transaction });

            // add on delete cascade in menu_categories_menuItems menuItems relation
            await queryInterface.removeConstraint(
                'menu_categories_menuItems',
                'menu_categories_menuItems_ibfk_3',
                { transaction }
            );
            await queryInterface.addConstraint('menu_categories_menuItems', {
                type: 'foreign key',
                name: 'menu_categories_menuItems_ibfk_3',
                references: {
                    table: 'menuItems',
                    field: 'id',
                },
                fields: ['menu_item_id'],
                onDelete: 'CASCADE',
                transaction
            });
            // add allowNull false e in allergens menu_categories_menuItems
            await models.menuCategoriesMenuItems.destroy({
                where: {
                    menuItemId: { [Op.is]: null }
                },
                transaction
            });
            await queryInterface.changeColumn('menu_categories_menuItems', 'menu_item_id', {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: false
            }, { transaction });

            // add on delete cascade in productItems menuItems relation
            await queryInterface.removeConstraint(
                'productItems',
                'productItems_ibfk_3',
                { transaction }
            );
            await queryInterface.addConstraint('productItems', {
                type: 'foreign key',
                name: 'productItems_ibfk_3',
                references: {
                    table: 'menuItems',
                    field: 'id',
                },
                fields: ['menu_item_id'],
                onDelete: 'CASCADE',
                transaction
            });
            // add allowNull false in productItems
            await models.productItems.destroy({
                where: {
                    menuItemId: { [Op.is]: null }
                },
                transaction
            });
            await queryInterface.changeColumn('productItems', 'menu_item_id', {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: false
            }, { transaction });

            // delete archived menu items
            const menuCategoriesIds = new Set();
            const menuItems = await models.menuItems.findAll({
                where: {
                    archived: true
                },
                include: [{ model: models.menuCategoriesMenuItems }],
                transaction
            });
            menuItems.forEach(menuItem => menuItem.menuCategoriesMenuItems.forEach(menuCategoriesMenuItem => menuCategoriesIds.add(menuCategoriesMenuItem.menuCategoriesId)))
            await models.menuItems.destroy({ where: { archived: true }, transaction });
            for (let menuCategoriesId of menuCategoriesIds) {
                const menuCategoriesMenuItemCount = await models.menuCategoriesMenuItems.count({ where: { menuCategoriesId }, transaction });
                if (!menuCategoriesMenuItemCount) {
                    await models.menuCategories.destroy({ where: { id: menuCategoriesId }, transaction });
                }
            }

            // add unique fields in menuItems (barcode-sp, sku-sp)
            await queryInterface.addIndex('menuItems', ['barcode', 'service_provider_id'], {
                name: 'barcode_serviceProviderId_unique',
                unique: true
            });
            await queryInterface.addIndex('menuItems', ['sku', 'service_provider_id'], {
                name: 'sku_serviceProviderId_unique',
                unique: true
            });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.changeColumn('dietaryMarkers', 'menu_item_id', {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: true
            }, { transaction });
            await queryInterface.changeColumn('nutritionFacts', 'menu_item_id', {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: true
            }, { transaction });
            await queryInterface.removeConstraint(
                'allergens',
                'allergens_ibfk_1',
                { transaction }
            );
            await queryInterface.addConstraint('allergens', {
                type: 'foreign key',
                name: 'allergens_ibfk_1',
                references: {
                    table: 'menuItems',
                    field: 'id',
                },
                fields: ['menu_item_id'],
                transaction
            });
            await queryInterface.changeColumn('allergens', 'menu_item_id', {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: true
            }, { transaction });

            await queryInterface.removeConstraint(
                'menu_categories_menuItems',
                'menu_categories_menuItems_ibfk_3',
                { transaction }
            );
            await queryInterface.addConstraint('menu_categories_menuItems', {
                type: 'foreign key',
                name: 'menu_categories_menuItems_ibfk_3',
                references: {
                    table: 'menuItems',
                    field: 'id',
                },
                fields: ['menu_item_id'],
                onDelete: 'SET NULL',
                transaction
            });
            await queryInterface.changeColumn('menu_categories_menuItems', 'menu_item_id', {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: true
            }, { transaction });

            await queryInterface.removeConstraint(
                'productItems',
                'productItems_ibfk_3',
                { transaction }
            );
            await queryInterface.addConstraint('productItems', {
                type: 'foreign key',
                name: 'productItems_ibfk_3',
                references: {
                    table: 'menuItems',
                    field: 'id',
                },
                fields: ['menu_item_id'],
                transaction
            });
            await queryInterface.changeColumn('productItems', 'menu_item_id', {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: true
            }, { transaction });

            await queryInterface.removeIndex('menuItems', 'barcode_serviceProviderId_unique');
            await queryInterface.removeIndex('menuItems', 'sku_serviceProviderId_unique');

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};