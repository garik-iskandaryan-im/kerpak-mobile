module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn(
            'serviceProviders',
            'is_testing',
            {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('serviceProviders', 'is_testing');
    }
};