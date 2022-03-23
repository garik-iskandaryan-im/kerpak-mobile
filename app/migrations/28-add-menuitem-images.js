module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'menuItems',
            'imageMedium',
            {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'menuItems',
            'imageSmall',
            {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('menuItems', 'imageMedium');
        await queryInterface.removeColumn('menuItems', 'imageSmall');
    }
};