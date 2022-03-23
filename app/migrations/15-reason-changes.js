module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'itemsWriteOffs',
            'reason_id',
            {
                type: Sequelize.INTEGER(11),
                allowNull: true,
                references: {
                    model: 'writeOffReasons',
                    key: 'id',
                    defaultValue: null
                },
            },
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('itemsWriteOffs', 'reason_id');
    }
};