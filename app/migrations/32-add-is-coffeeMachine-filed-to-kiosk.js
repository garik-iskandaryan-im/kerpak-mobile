module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'kiosks',
            'is_coffeeMachine',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'coffeeMachine_id',
            {
                type: Sequelize.DataTypes.INTEGER,
                allowNull: true
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('kiosks', 'is_coffeeMachine');
        await queryInterface.removeColumn('kiosks', 'coffeeMachine_id');
    }
};