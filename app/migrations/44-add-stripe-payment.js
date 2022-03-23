const {
    orders: Orders,
} = require('app/models/models');
const { payment: { PROVIDERS } } = require('app/settings');
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'consumers',
            'stripe_customer_id',
            {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'orders',
            'payment_method',
            {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
        );
        await Orders.update({
            paymentMethod: PROVIDERS.ID_BANK
        }, { where: {} });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('consumers', 'stripe_customer_id');
        await queryInterface.removeColumn('orders', 'payment_method');
    }
};