const tableName = 'integrations';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn(
            tableName,
            'access_token',
            {type: Sequelize.STRING(1024)}
        );
        await queryInterface.changeColumn(
            tableName,
            'refresh_token',
            {type: Sequelize.STRING(1024)}
        );
        await queryInterface.bulkInsert(tableName, [{
            name: 'Teltonika'
        }]);

        await queryInterface.addColumn(
            'kiosks',
            'teltonika_remote_access_id', 
            {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'teltonika_host', 
            {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'use_teltonika', 
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: 0
            },
        );
    },
    down: queryInterface => {
        return queryInterface.bulkDelete(tableName, null, {});
    }
};