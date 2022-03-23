const {
    consumers: Consumers,
    orders: Orders,
} = require('app/models/models');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn(
            'consumers',
            'last_order_date',
            {
                type: Sequelize.DATE,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'consumers',
            'kiosk_id_of_last_order',
            {
                type: Sequelize.INTEGER(11),
                allowNull: true,
            },
        );
        const allConsumers = await Consumers.findAll({
            include: [
                {
                    model: Orders,
                    attributes: ['kioskId', 'orderDate'],
                    order: [['orderDate', 'DESC']],
                    limit: 1,
                }
            ]
        });
        allConsumers.forEach(async consumer => {
            const lastOrder = consumer.orders[0];
            if (lastOrder) {
                Consumers.update(
                    {
                        lastOrderDate: lastOrder.orderDate,
                        kioskIdOfLastOrder: lastOrder.kioskId
                    },
                    {
                        where: { id: consumer.id }
                    }
                )
            }
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('consumers', 'last_order_date');
        await queryInterface.removeColumn('consumers', 'kiosk_id_of_last_order');
    }
};