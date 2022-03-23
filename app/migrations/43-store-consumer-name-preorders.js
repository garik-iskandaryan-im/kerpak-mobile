const models = require('../models/models');

const {
    preOrders: PreOrders,
    consumers: Consumers,
} = require('app/models/models');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.addColumn(
                'preOrders',
                'stored_consumer_name',
                {
                    type: Sequelize.STRING(255),
                    allowNull: true,
                },
                { transaction }
            );

            let payload = {
                attributes: ['id', 'consumerId', 'stored_consumer_name'],
                include: [
                    {
                        model: Consumers,
                        attributes: ['id', 'firstName', 'lastName'],
                    }
                ],
            };

            const allPreOrders = await PreOrders.findAll(payload);

            for (let i = 0; i < allPreOrders.length; ++i) {
                const preOrder = allPreOrders[i];
                const storedConsumerName = `${preOrder.consumer.firstName} ${preOrder.consumer.lastName}`;
                if (storedConsumerName) {
                    await PreOrders.update({ storedConsumerName }, {
                        where: { id: preOrder.id },
                        transaction
                    });
                }
            }
            await transaction.commit();
        }  catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
    down: async (queryInterface) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeColumn('preOrders', 'stored_consumer_name'),
            await transaction.commit();
        } catch(error) {
            await transaction.rollback();
            throw error;
        }
    }
};