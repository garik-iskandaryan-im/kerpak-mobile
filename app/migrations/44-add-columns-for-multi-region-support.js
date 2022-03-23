const {
    consumers: Consumers,
    sms: SMS,
    smsLog: SmsLog
} = require('app/models/models');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // consumer model
            await queryInterface.addColumn(
                'consumers',
                'country_ISO',
                {
                    type: Sequelize.DataTypes.ENUM(['am', 'ru', 'us', 'uk', 'ch', 'cy']),
                    allowNull: false,
                },
                { transaction }
            );
            await Consumers.update({countryISO: 'am'}, {transaction});
            await queryInterface.removeIndex('consumers', 'consumers_phone', { transaction });
            await queryInterface.removeIndex('consumers', 'phone', { transaction });
            await queryInterface.addIndex('consumers', ['phone', 'country_ISO'], {
                name: 'phone_country_ISO_unique',
                unique: true
            }, { transaction });

            // sms model
            await queryInterface.addColumn(
                'sms',
                'country_ISO',
                {
                    type: Sequelize.DataTypes.ENUM(['am', 'ru', 'us', 'uk', 'ch', 'cy']),
                    allowNull: false,
                },
                { transaction }
            );
            await SMS.update({countryISO: 'am'}, {where: {}, transaction});
            await queryInterface.removeIndex('sms', 'sms_phone', { transaction });
            await queryInterface.addIndex('sms', ['phone', 'country_ISO'], {
                name: 'sms_phone_country_ISO_unique',
                unique: true
            }, { transaction });

            // smsLog model
            await queryInterface.addColumn(
                'smsLog',
                'country_ISO',
                {
                    type: Sequelize.DataTypes.ENUM(['am', 'ru', 'us', 'uk', 'ch', 'cy']),
                    allowNull: false,
                },
                { transaction }
            );
            await SmsLog.update({countryISO: 'am'}, {where: {}, transaction});

            await transaction.commit();
        } catch(err) {
            await transaction.rollback();
            throw err;
        }

    },
    down: async (queryInterface) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeColumn('consumers', 'country_ISO', {transaction});
            await queryInterface.addIndex('consumers', ['phone'], {
                name: 'consumers_phone',
                unique: true
            }, { transaction });

            await queryInterface.removeIndex('consumers', 'phone_country_ISO_unique', { transaction });

            await queryInterface.removeColumn('sms', 'country_ISO', {transaction});
            await queryInterface.addIndex('sms', ['phone'], {
                name: 'sms_phone',
                unique: true
            }, { transaction });

            await queryInterface.removeIndex('sms', 'sms_phone_country_ISO_unique', { transaction });
            await transaction.commit();
        } catch(error) {
            await transaction.rollback();
            throw error;
        }
    }
};