module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn(
            'orders',
            'bank_order_id', 
            {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('orders', 'bank_order_id');
    }
}; 