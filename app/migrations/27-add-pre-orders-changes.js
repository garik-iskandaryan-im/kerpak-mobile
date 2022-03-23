module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'menuItems',
            'is_only_for_delivery',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'orders_productItems',
            'is_pre_order',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'serviceProviders',
            'is_sp_allow_delivery',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'serviceProviders',
            'have_preOrder',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'delivery_is_kiosk_allow',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'delivery_min_allowed_time',
            {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: null,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'delivery_transfer_time_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
                defaultValue: null,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'delivery_transfer_time_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
                defaultValue: null,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'delivery_monday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'delivery_tuesday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'delivery_wednesday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'delivery_thursday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'delivery_friday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'delivery_saturday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'delivery_sunday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('menuItems', 'is_only_for_delivery');
        await queryInterface.removeColumn('orders_productItems', 'is_pre_order');
        await queryInterface.removeColumn('serviceProviders', 'is_sp_allow_delivery');
        await queryInterface.removeColumn('serviceProviders', 'have_preOrder');
        await queryInterface.removeColumn('kiosks', 'delivery_is_kiosk_allow');
        await queryInterface.removeColumn('kiosks', 'delivery_min_allowed_time');
        await queryInterface.removeColumn('kiosks', 'delivery_transfer_time_from');
        await queryInterface.removeColumn('kiosks', 'delivery_transfer_time_to');
        await queryInterface.removeColumn('kiosks', 'delivery_monday');
        await queryInterface.removeColumn('kiosks', 'delivery_tuesday');
        await queryInterface.removeColumn('kiosks', 'delivery_wednesday');
        await queryInterface.removeColumn('kiosks', 'delivery_thursday');
        await queryInterface.removeColumn('kiosks', 'delivery_friday');
        await queryInterface.removeColumn('kiosks', 'delivery_saturday');
        await queryInterface.removeColumn('kiosks', 'delivery_sunday');
    }
};