module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'serviceProviders',
            'is_gg',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('serviceProviders', 'is_gg');
    }
};