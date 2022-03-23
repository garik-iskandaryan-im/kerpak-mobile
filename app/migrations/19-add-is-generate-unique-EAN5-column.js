module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn(
            'menuItems',
            'is_generate_unique_EAN5',
            {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('menuItems', 'is_generate_unique_EAN5');
    }
};