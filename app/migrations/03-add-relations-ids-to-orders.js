const models = require('../models/models');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn(
            'orders',
            'stored_kiosk_id', 
            {
                type: Sequelize.INTEGER(11),
                allowNull: false,
            },
        );
        await queryInterface.addColumn(
            'orders',
            'stored_consumer_id', 
            {
                type: Sequelize.INTEGER(11),
                allowNull: false,
            },
        );
        await queryInterface.addColumn(
            'orders',
            'stored_sp_id', 
            {
                type: Sequelize.INTEGER(11),
                allowNull: false,
            },
        );
        const orders = await models.orders.findAll({raw: true});
        for (i in orders) {
            const order = orders[i];
            await models.orders.update({
                    storedKioskId: order.kioskId, 
                    storedConsumerId: order.consumerId,
                    storedSPId: order.serviceProviderId
                }, { where: { id: order.id }
            });
        }
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('orders', 'stored_kiosk_id'),
        await queryInterface.removeColumn('orders', 'stored_consumer_id'),
        await queryInterface.removeColumn('orders', 'stored_sp_id')
    }
};