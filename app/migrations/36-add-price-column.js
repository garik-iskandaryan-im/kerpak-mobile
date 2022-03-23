module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'itemsWriteOffs_Products',
            'price',
            {
                type: Sequelize.DataTypes.DECIMAL(10,2),
                allowNull: true,
                defaultValue: null,
                field: 'price'
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('itemsWriteOffs_Products', 'price');
    }
};