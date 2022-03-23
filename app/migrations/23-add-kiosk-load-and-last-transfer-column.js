const models = require('../models/models');

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'kiosks',
            'kiosk_load',
            {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'last_transfer_date',
            {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null,
            },
        );
        const kiosks = await models.kiosks.findAll({raw: true});
        for (let i in kiosks) {
            const kiosk = kiosks[i];
            const productItemPayload = {
                where: {
                    kioskId: kiosk.id,
                    status: 'available',
                    archived: false
                }
            }
            const lastTransferPayload = {
                where: {
                    toKioskId: kiosk.id,
                    status: 'completed'
                },
                order: [ [ 'id', 'desc' ] ],
                limit: 1
            }
            const productItemsCount = await models.productItems.count(productItemPayload);
            const lastTransfer = await models.itemTransfers.findAll(lastTransferPayload);
            const lastTransferDate = lastTransfer && lastTransfer[0] ? lastTransfer[0].transferDate : null
            await models.kiosks.update({ kioskLoad: productItemsCount, lastTransferDate: lastTransferDate }, { where: {id: kiosk.id}});
        }
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('kiosks', 'kiosk_load');
        await queryInterface.removeColumn('kiosks', 'last_transfer_date');
    }
};