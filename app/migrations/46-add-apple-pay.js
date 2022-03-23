const {
    orders: Orders,
    stripeCards: StripeCards,
    cards: Cards,
} = require('app/models/models');
const { payment: { TYPE } } = require('app/settings');
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.addColumn(
                'orders',
                'payment_type',
                {
                    type: Sequelize.INTEGER(11),
                    allowNull: true
                },
                { transaction }
            );
            await Orders.update({
                paymentType: TYPE.BANK_CARD
            }, { where: {}, transaction });
            await queryInterface.addColumn(
                'stripeCards',
                'payment_type',
                {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                { transaction }
            );
            await StripeCards.update({
                paymentType: TYPE.BANK_CARD
            }, { where: {}, transaction });
            await queryInterface.addColumn(
                'cards',
                'payment_type',
                {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                { transaction }
            );
            await Cards.unscoped().update({
                paymentType: TYPE.BANK_CARD
            }, { where: {}, transaction });
            await queryInterface.addColumn(
                'serviceProviders',
                'stripe_id',
                {
                    type: Sequelize.STRING(255),
                    allowNull: true,
                },
                { transaction }
            );
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('orders', 'payment_type');
        await queryInterface.removeColumn('stripeCards', 'payment_type');
        await queryInterface.removeColumn('serviceProviders', 'stripe_id');
        await queryInterface.removeColumn('cards', 'payment_type');
    }
};