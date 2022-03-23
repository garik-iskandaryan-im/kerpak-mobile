const {
    consumers: Consumers,
    orders: Orders,
} = require('app/models/models');

module.exports = {
    up: async () => {
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
            Consumers.update(
                {
                    lastOrderDate: lastOrder ? lastOrder.orderDate : null,
                    kioskIdOfLastOrder: lastOrder ? lastOrder.kioskId : null,
                },
                {
                    where: { id: consumer.id }
                }
            );
        });
    },
    down: async () => { }
};