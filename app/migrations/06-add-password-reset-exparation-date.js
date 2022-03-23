module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn(
            'users',
            'reset_password_expairation_date', 
            {
                type: Sequelize.DATE,
                allowNull: true,
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('users', 'reset_password_expairation_date');
    }
};