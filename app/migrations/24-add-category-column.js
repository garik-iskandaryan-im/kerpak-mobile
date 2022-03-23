const models = require('../models/models');

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'orders_productItems',
            'category',
            {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: true,
                defaultValue: null
            },
        );
        const menuItems = await models.menuItems.findAll({
            raw: true,
            attributes: ['barcode', 'serviceProviderId'],
            where: { archived: false },
            include: [
                {
                    model: models.categories,
                    attributes: ['name'],
                    as: 'categories',
                    include: [
                        {
                            model: models.defaultCategories,
                            attributes: ['name'],
                            required: false
                        },
                    ]
                }
            ],
        });
        for (let i in menuItems) {
            const menuItem = menuItems[i];
            const productItems = await models.ordersProductItems.findAll({
                where: {
                    barcode: menuItem.barcode,
                },
                attributes: ['id'],
                include: [
                    {
                        model: models.orders,
                        attributes: [],
                        where: {
                            serviceProviderId: menuItem.serviceProviderId
                        },
                    }
                ],
                raw: true
            });
            if (productItems.length) {
                await models.ordersProductItems.update(
                    {
                        category: menuItem['categories.name'] || menuItem['categories.defaultCategory.name']
                    },
                    {
                        where: {
                            id: { [Sequelize.Op.in]: productItems.map(productItem => productItem.id) },
                        },
                    });
            }
        }
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('orders_productItems', 'category');
    }
};