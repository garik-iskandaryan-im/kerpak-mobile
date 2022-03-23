module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'kiosks',
            'connection_email',
            {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('kiosks', 'connection_email');
    }
};