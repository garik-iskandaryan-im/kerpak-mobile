module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'kiosks',
            'use_socket',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'is_temp_sensor_error',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'is_port_error',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'port_error',
            {
                type: Sequelize.STRING(255),
                allowNull: true,
                defaultValue: null
            },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('kiosks', 'use_socket');
        await queryInterface.removeColumn('kiosks', 'is_temp_sensor_error');
        await queryInterface.removeColumn('kiosks', 'is_port_error');
        await queryInterface.removeColumn('kiosks', 'port_error');
    }
};