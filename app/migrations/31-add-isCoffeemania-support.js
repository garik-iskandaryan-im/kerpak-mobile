const { INTEGRATION_TYPES } = require('app/constants');

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'serviceProviders',
            'is_coffeemania',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
        await queryInterface.addColumn(
            'kioskSessions',
            'integration',
            {
                type: Sequelize.ENUM(INTEGRATION_TYPES.map(integration => integration.id)),
                allowNull: true,
                field: 'integration'
            },
        );
        await queryInterface.addColumn(
            'orders',
            'integration',
            {
                type: Sequelize.ENUM(INTEGRATION_TYPES.map(integration => integration.id)),
                allowNull: true,
                field: 'integration'
            },
        );
        await queryInterface.removeColumn('kioskSessions', 'is_gg');
        await queryInterface.removeColumn('orders', 'is_gg');
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('serviceProviders', 'is_coffeemania');
        await queryInterface.removeColumn('kioskSessions', 'integration');
        await queryInterface.removeColumn('orders', 'integration');
    }
};