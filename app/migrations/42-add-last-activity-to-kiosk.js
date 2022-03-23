const {
    kiosks: Kiosks,
    kioskSessions: KioskSessions,
} = require('app/models/models');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.addColumn(
                'kiosks', 'last_activity',
                { type: Sequelize.DATE, allowNull: true },
                { transaction }
            );

            let payload = {
                attributes: ['id', 'status', 'hostName', 'displayName', 'temperature', 'connected'],
                include: [
                    {
                        model: KioskSessions,
                        attributes: ['id', 'start_date'],
                        required: true,
                    }
                ],
                order: [[Sequelize.literal('kioskSessions.start_date'), 'DESC']]
            };

            const allKiosks = await Kiosks.findAll(payload);

            for (let i = 0; i < allKiosks.length; ++i) {
                const kiosk = allKiosks[i];
                const lastActivity = kiosk.kioskSessions[0].dataValues.start_date;
                if (lastActivity) {
                    await Kiosks.update({ lastActivity }, {
                        where: { id: kiosk.id },
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
            await queryInterface.removeColumn('kiosks', 'last_activity');
            await transaction.commit();
        } catch(error) {
            await transaction.rollback();
            throw error;
        }
    }
};