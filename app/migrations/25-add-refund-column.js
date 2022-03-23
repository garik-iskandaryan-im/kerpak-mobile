const models = require('../models/models');

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'orders',
            'refund',
            {
                type: Sequelize.DECIMAL(10,2),
                allowNull: true,
                defaultValue: 0,

            },
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('orders', 'refund');
    }
};