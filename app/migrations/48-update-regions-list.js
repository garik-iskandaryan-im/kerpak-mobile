module.exports = {
    async up(queryInterface, Sequelize) {
        // SP
        const spRegionalSettings = ['AM', 'RU', 'US', 'GB', 'CH', 'CY'].map(name => name.toUpperCase());
        await queryInterface.changeColumn('serviceProviders', 'regional_settings', {
            type: Sequelize.ENUM(spRegionalSettings),
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
    },
    down: async (queryInterface, Sequelize) => {
        // SP
        const spRegionalSettings = ['AM', 'RU', 'US', 'UK', 'CH', 'CY'];
        await queryInterface.changeColumn('serviceProviders', 'regional_settings', {
            type: Sequelize.ENUM(spRegionalSettings),
            allowNull: false
        });

        // Consumer
        await queryInterface.changeColumn('consumers', 'country_ISO', {
            type: Sequelize.DataTypes.ENUM(['am', 'ru', 'us', 'uk', 'ch', 'cy']),
            allowNull: false,
        });

        // SMS
        await queryInterface.changeColumn('sms', 'country_ISO', {
            type: Sequelize.DataTypes.ENUM(['am', 'ru', 'us', 'uk', 'ch', 'cy']),
            allowNull: false,
        });

        // SMS Log
        await queryInterface.changeColumn('smsLog', 'country_ISO', {
            type: Sequelize.DataTypes.ENUM(['am', 'ru', 'us', 'uk', 'ch', 'cy']),
            allowNull: false,
        });
    }
};