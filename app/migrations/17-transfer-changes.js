const models = require('../models/models');

const { TRANSFER_STATUS_ALLOWED } = require('../constants');

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'itemTransfers',
            'status',
            {
                type: Sequelize.ENUM(TRANSFER_STATUS_ALLOWED.map(status => status.id)),
                allowNull: true,
                defaultValue: null
            },
        );
        await queryInterface.addColumn(
            'productItems',
            'itemTransferId',
            {
                type: Sequelize.INTEGER(11),
                allowNull: true,
                defaultValue: null,
                references: {
                    model: 'itemTransfers',
                    key: 'id',
                    defaultValue: null
                }
            },
        );
        await queryInterface.addColumn(
            'itemTransfers_menuItems',
            'menuItemId',
            {
                type: Sequelize.INTEGER(11),
                allowNull: true,
                defaultValue: null,
            },
        );
        await queryInterface.addColumn(
            'itemTransfers_menuItems',
            'barcode',
            {
                type: Sequelize.STRING(255),
                allowNull: true,
                defaultValue: null,
            },
        );
        await queryInterface.addColumn(
            'itemTransfers_menuItems',
            'productionDate',
            {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null,
            },
        );
        await queryInterface.addColumn(
            'itemTransfers_menuItems',
            'expirationDate',
            {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null,
            },
        );
        await models.itemTransfers.update({ status: 'completed' }, { where: {}});
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('itemTransfers', 'status');
        await queryInterface.removeColumn('productItems', 'itemTransferId');
        await queryInterface.removeColumn('itemTransfers_menuItems', 'menuItemId');
        await queryInterface.removeColumn('itemTransfers_menuItems', 'barcode');
        await queryInterface.removeColumn('itemTransfers_menuItems', 'productionDate');
        await queryInterface.removeColumn('itemTransfers_menuItems', 'expirationDate');
    }
};