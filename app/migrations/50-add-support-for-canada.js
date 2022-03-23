module.exports = {
    async up(queryInterface, Sequelize) {
        // SP
        await queryInterface.changeColumn('serviceProviders', 'regional_settings', {
            type: Sequelize.ENUM(['AM', 'RU', 'US', 'GB', 'CH', 'CY', 'CA']),
            allowNull: false
        });

        // Consumer
        await queryInterface.changeColumn('consumers', 'country_ISO', {
            type: Sequelize.DataTypes.ENUM(['am', 'ru', 'us', 'gb', 'ch', 'cy', 'ca']),
            allowNull: false,
        });

        // SMS
        await queryInterface.changeColumn('sms', 'country_ISO', {
            type: Sequelize.DataTypes.ENUM(['am', 'ru', 'us', 'gb', 'ch', 'cy', 'ca']),
            allowNull: false,
        });

        // SMS Log
        await queryInterface.changeColumn('smsLog', 'country_ISO', {
            type: Sequelize.DataTypes.ENUM(['am', 'ru', 'us', 'gb', 'ch', 'cy', 'ca']),
            allowNull: false,
        });
    },
    down: async (queryInterface, Sequelize) => {
        // SP
        await queryInterface.changeColumn('serviceProviders', 'regional_settings', {
            type: ['AM', 'RU', 'US', 'GB', 'CH', 'CY'],
            allowNull: false
        });

        // Consumer
        await queryInterface.changeColumn('consumers', 'country_ISO', {
            type: Sequelize.DataTypes.ENUM(['am', 'ru', 'us', 'gb', 'ch', 'cy']),
            allowNull: false,
        });

        // SMS
        await queryInterface.changeColumn('sms', 'country_ISO', {
            type: Sequelize.DataTypes.ENUM(['am', 'ru', 'us', 'gb', 'ch', 'cy']),
            allowNull: false,
        });

        // SMS Log
        await queryInterface.changeColumn('smsLog', 'country_ISO', {
            type: Sequelize.DataTypes.ENUM(['am', 'ru', 'us', 'gb', 'ch', 'cy']),
            allowNull: false,
        });
    }
};