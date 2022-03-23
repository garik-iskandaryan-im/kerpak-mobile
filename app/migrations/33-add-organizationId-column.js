module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'consumers',
            'organization_id',
            {
                type: Sequelize.DataTypes.INTEGER,
                references: {
                    model: {
                        tableName: 'organizations'
                    },
                    key: 'id'
                },
                allowNull: true,
                field: 'organization_id'
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('consumers', 'organization_id');
    }
};