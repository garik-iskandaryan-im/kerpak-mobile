module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'serviceProviders',
            'secondaryLogo',
            {
                type: Sequelize.STRING(255),
                allowNull: true,
                defaultValue: null
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('serviceProviders', 'secondaryLogo');
    }
};