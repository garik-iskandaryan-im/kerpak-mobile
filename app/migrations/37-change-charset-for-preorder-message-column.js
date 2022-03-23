module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn(
            'preOrders_details',
            'comment',
            {
                type: Sequelize.STRING(1024) + ' CHARSET utf8mb4',
                allowNull: true,
            },
        );
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn(
            'preOrders_details',
            'comment',
            {
                type: Sequelize.STRING(1024) + ' CHARSET utf8',
                allowNull: true,
            },
        );
    }
};