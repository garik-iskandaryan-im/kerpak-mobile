module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'orders_productItems',
            'foodProvider',
            {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: true,
                defaultValue: null
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('orders_productItems', 'foodProvider');
    }
};