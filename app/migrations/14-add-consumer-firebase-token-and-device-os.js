module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'consumers',
            'firebase_registration_token',
            {
                type: Sequelize.STRING(1024),
                allowNull: true,
                defaultValue: null
            },
        );
        await queryInterface.addColumn(
            'consumers',
            'OS',
            {
                type: Sequelize.STRING(255),
                allowNull: true,
                defaultValue: null
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('consumers', 'firebase_registration_token');
        await queryInterface.removeColumn('consumers', 'OS');
    }
};