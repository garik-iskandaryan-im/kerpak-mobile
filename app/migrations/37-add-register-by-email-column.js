module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'consumers',
            'register_by_email_completed',
            {
                type: Sequelize.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                field: 'register_by_email_completed'
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('consumers', 'register_by_email_completed');
    }
};