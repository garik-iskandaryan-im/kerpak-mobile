const CONSTANTS = require('app/constants');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('balance_histary', 'type', {
            type: Sequelize.ENUM(CONSTANTS.BALANCE_TYPE),
            allowNull: false,
            field: 'type'
        });
        await queryInterface.addColumn(
            'balance_histary',
            'preOrder_id',
            {
                type: Sequelize.DataTypes.INTEGER,
                references: {
                    model: {
                        tableName: 'preOrders'
                    },
                    key: 'id'
                },
                allowNull: true,
                field: 'preOrder_id'
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('balance_histary', 'preOrder_id');
    }
};