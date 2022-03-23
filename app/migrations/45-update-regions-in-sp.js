
module.exports = {
    async up(queryInterface, Sequelize) {
        const spRegionalSettings = ['AM', 'RU', 'US', 'UK', 'CH', 'CY'];
        await queryInterface.changeColumn('serviceProviders', 'regional_settings', {
            type: Sequelize.ENUM(spRegionalSettings),
            allowNull: false
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('serviceProviders', 'regional_settings', {
            type: Sequelize.ENUM(['AM', 'RU', 'US', 'UK', 'EU']),
            allowNull: false
        });
    }
};