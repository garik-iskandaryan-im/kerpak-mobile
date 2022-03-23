const { consumers: Consumers, emails: Emails } = require('app/models/models');

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.addColumn(
                'emails',
                'consumer_id',
                {
                    type: Sequelize.INTEGER(11),
                    references: {
                        model: 'consumers',
                        key: 'id',
                    },
                    onDelete: 'CASCADE',
                },
                { transaction }
            );

            await queryInterface.addIndex('emails', ['consumer_id'], {
                name: 'consumer_id_unique',
                unique: true
            }, { transaction });

            const emails = await Emails.findAll();
            for (let i = 0; i < emails.length; ++i) {
                const email = emails[i];
                const consumer = await Consumers.findOne({ where: { phone: email.phone, email: email.email }});
                if (consumer) {
                    await Emails.update({consumerId: consumer.id}, { where: { id: email.id }, transaction });
                }
            }
            await transaction.commit();
        } catch(error) {
            await transaction.rollback();
            throw error;
        }

    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('emails', 'consumer_id');
        await queryInterface.removeIndex('emails', 'consumer_id_unique');
    }
};