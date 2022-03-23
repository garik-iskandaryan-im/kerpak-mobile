module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'users',
            'failed_login_limit',
            {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('users', 'failed_login_limit');
    }
};