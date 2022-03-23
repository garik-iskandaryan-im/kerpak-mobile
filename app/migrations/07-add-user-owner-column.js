module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn(
            'users',
            'owner',
            {
                type: Sequelize.BOOLEAN,
                allowNull: true,
                defaultValue: false
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('users', 'owner');
    }
};