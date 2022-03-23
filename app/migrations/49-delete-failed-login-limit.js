module.exports = {
    async up(queryInterface) {
        await queryInterface.removeColumn('users', 'failed_login_limit');
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users',
            'failed_login_limit',
            {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            });
    }
};