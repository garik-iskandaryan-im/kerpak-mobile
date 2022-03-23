const models = require('../models/models');
const { Op } = require('sequelize');

module.exports = {
    async up() {
        const ordersWithRefund = await models.orders.findAll({
            where: {
                refund: { [Op.gt]: 0 }
            }
        });
        for (let i = 0; i < ordersWithRefund.length; i++) {
            const order = ordersWithRefund[i];
            await models.ordersRefund.create({
                orderId: order.id,
                refundBalance: order.refund
            });
        }
    },
    down: async () => { }
};