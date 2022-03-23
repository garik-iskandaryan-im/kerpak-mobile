const CONSTANTS = require('app/constants');

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.removeColumn('menuItems', 'is_only_for_delivery');

        await queryInterface.addColumn(
            'menuItems',
            'item_availability',
            {
                type: Sequelize.ENUM(CONSTANTS.ITEM_AVAILABILITY.options),
                allowNull: false,
                defaultValue: CONSTANTS.ITEM_AVAILABILITY.defaultValue,
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('menuItems', 'item_availability');
    }
};