module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'kiosks',
            'launch_date',
            {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null,
                field: 'launch_date'
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('kiosks', 'launch_date');
    }
};