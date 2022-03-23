module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'kiosks',
            'use_traffic_saving',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('kiosks', 'use_traffic_saving');
    }
};