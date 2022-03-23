module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'serviceProviders',
            'multi_tenant_support',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
        await queryInterface.addColumn(
            'menuItems',
            'food_provider_id',
            {
                type: Sequelize.DataTypes.INTEGER,
                references: {
                    model: {
                        tableName: 'foodProviders'
                    },
                    key: 'id'
                },
                allowNull: true,
                field: 'food_provider_id'
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('serviceProviders', 'multi_tenant_support');
    }
};