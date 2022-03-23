module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'productItems',
            'EAN5',
            {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('productItems', 'EAN5');
    }
};