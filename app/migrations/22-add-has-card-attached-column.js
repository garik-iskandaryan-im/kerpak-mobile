const { Op } = require('sequelize');
const models = require('../models/models');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn(
            'consumers',
            'has_card_attached',
            {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
        );
        const ids = [];
        const cards = await models.cards.findAll({ where: { archived: false }, raw: true });
        for (i in cards) {
            if (ids.indexOf(cards[i].consumerId) === -1) {
                ids.push(cards[i].consumerId);
            }
        }
        if (ids.length) {
            await models.consumers.update(
                {hasCardAttached: true},
                { where: { id: {[Op.in]: ids}}}
            );
        }
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('consumers', 'has_card_attached');
    }
  };