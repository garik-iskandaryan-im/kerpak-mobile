const models = require('../models/models');

const { TRANSFER_STATUS_ALLOWED } = require('../constants');

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'itemTransfers_menuItems',
            'hasEAN5',
            {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
        );
        await models.itemTransfers.update({ status: 'completed' }, { where: {}});
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('itemTransfers_menuItems', 'hasEAN5');
    }
};