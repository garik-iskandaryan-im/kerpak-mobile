module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'serviceProviders',
            'allowPaymentByCredit',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
        await queryInterface.addColumn(
            'serviceProviders',
            'creditAmount',
            {
                type: Sequelize.DataTypes.DECIMAL(10,2),
                allowNull: true,
                field: 'creditAmount'
            },
        );

        await queryInterface.addColumn(
            'orders',
            'isRegisterTimeout',
            {
                type: Sequelize.BOOLEAN,
                allowNull: true,
                field: 'isRegisterTimeout'
            },
        );
        await queryInterface.addColumn(
            'orders',
            'isPayTimeout',
            {
                type: Sequelize.BOOLEAN,
                allowNull: true,
                field: 'isPayTimeout'
            },
        );
        await queryInterface.addColumn(
            'orders',
            'isStatusTimeout',
            {
                type: Sequelize.BOOLEAN,
                allowNull: true,
                field: 'isStatusTimeout'
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('serviceProviders', 'allowPaymentByCredit');
        await queryInterface.removeColumn('serviceProviders', 'creditAmount');
        await queryInterface.removeColumn('orders', 'isRegisterTimeout');
        await queryInterface.removeColumn('orders', 'isPayTimeout');
        await queryInterface.removeColumn('orders', 'isStatusTimeout');
    }
};