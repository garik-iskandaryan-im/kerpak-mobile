module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn(
            'notifications',
            'text',
            {
                type: Sequelize.STRING(560) + ' CHARSET utf8mb4',
                allowNull: true,
            },
        );
        
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn(
            'notifications',
            'text',
            {
                type: Sequelize.STRING(560) + ' CHARSET utf8',
                allowNull: true,
            },
        );
    }
};