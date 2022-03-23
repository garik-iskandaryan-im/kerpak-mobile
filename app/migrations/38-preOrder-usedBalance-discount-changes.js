const { ORDER_STATUS, ORDER_STATUS_NEW_LIST } = require('../constants');

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('orders', 'order_status', {
            type: Sequelize.ENUM(ORDER_STATUS_NEW_LIST.map(status => status.id)),
            allowNull: false
        });
        await queryInterface.addColumn(
            'orders',
            'delivery_discount_amount',
            {
                type: Sequelize.DECIMAL(10,2),
                allowNull: false,
                defaultValue: 0,
            },
        );
        await queryInterface.addColumn(
            'preOrders',
            'used_balance',
            {
                type: Sequelize.DECIMAL(10,2),
                allowNull: false,
                defaultValue: 0,
            },
        );
        await queryInterface.addColumn(
            'preOrders',
            'discount_sum',
            {
                type: Sequelize.DECIMAL(10,2),
                allowNull: false,
                defaultValue: 0,
            },
        );
        await queryInterface.addColumn(
            'preOrders',
            'discount_amount',
            {
                type: Sequelize.DECIMAL(10,2),
                allowNull: false,
                defaultValue: 0,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'delivery_discount',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'delivery_discount_amount',
            {
                type: Sequelize.DECIMAL(10,2),
                allowNull: false,
                defaultValue: 0,
            },
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('orders', 'order_status', {
            type: Sequelize.ENUM(ORDER_STATUS.map(status => status.id)),
            allowNull: false
        });
        await queryInterface.removeColumn('orders', 'delivery_discount_amount');
        await queryInterface.removeColumn('preOrders', 'used_balance');
        await queryInterface.removeColumn('preOrders', 'discount_sum');
        await queryInterface.removeColumn('preOrders', 'discount_amount');
        await queryInterface.removeColumn('kiosks', 'delivery_discount');
        await queryInterface.removeColumn('kiosks', 'delivery_discount_amount');
    }
};