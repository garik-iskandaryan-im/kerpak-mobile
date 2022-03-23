const models = require('../models/models');

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'serviceProviders',
            'pinIcon',
            {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: true,
                defaultValue: null
            },
        );
        await queryInterface.addColumn(
            'serviceProviders',
            'label_monochrome',
            {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: true,
                defaultValue: null
            },
        );
        await queryInterface.addColumn(
            'serviceProviders',
            'primary_logo',
            {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: true,
                defaultValue: null
            },
        );
        await queryInterface.addColumn(
            'serviceProviders',
            'primary_monochrome',
            {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: true,
                defaultValue: null
            },
        );
        await models.serviceProviders.update({ pinIcon: Sequelize.literal(`logo`)});
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('serviceProviders', 'pinIcon');
        await queryInterface.removeColumn('serviceProviders', 'label_monochrome');
        await queryInterface.removeColumn('serviceProviders', 'primary_logo');
        await queryInterface.removeColumn('serviceProviders', 'primary_monochrome');
    }
};