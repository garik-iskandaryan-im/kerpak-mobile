module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'orders_productItems',
            'EAN5',
            {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null
            },
        );
        await queryInterface.addColumn(
            'orders_productItems',
            'expiration_date',
            {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null
            },
        );
        await queryInterface.addColumn(
            'orders_productItems',
            'production_date',
            {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null
            },
        );
        await queryInterface.addColumn(
            'orders_productItems',
            'double_sold',
            {
                type: Sequelize.BOOLEAN,
                allowNull: true,
                defaultValue: false
            },
        );
        await queryInterface.addColumn(
            'orders',
            'has_double_sold',
            {
                type: Sequelize.BOOLEAN,
                allowNull: true,
                defaultValue: false
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('orders_productItems', 'EAN5');
        await queryInterface.removeColumn('orders_productItems', 'expiration_date');
        await queryInterface.removeColumn('orders_productItems', 'production_date');
        await queryInterface.removeColumn('orders_productItems', 'double_sold');
        await queryInterface.removeColumn('orders', 'has_double_sold');
    }
};