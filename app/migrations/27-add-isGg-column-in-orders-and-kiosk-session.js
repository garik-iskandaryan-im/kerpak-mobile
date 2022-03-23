module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'kioskSessions',
            'is_gg',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
        await queryInterface.addColumn(
            'orders',
            'is_gg',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('kioskSessions', 'is_gg');
        await queryInterface.removeColumn('orders', 'is_gg');
    }
};