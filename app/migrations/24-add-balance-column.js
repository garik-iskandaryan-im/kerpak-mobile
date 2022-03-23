const models = require('../models/models');

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'consumers',
            'balance',
            {
                type: Sequelize.DECIMAL(10,2),
                allowNull: true,
                defaultValue: 0,
            },
        );
        await queryInterface.addColumn(
            'orders',
            'used_balance',
            {
                type: Sequelize.DECIMAL(10,2),
                allowNull: true,
                defaultValue: 0,

            },
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('consumers', 'balance');
        await queryInterface.removeColumn('orders', 'used_balance');
    }
};