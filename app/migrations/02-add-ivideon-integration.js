const tableName = 'integrations';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        return queryInterface.bulkInsert(tableName, [{
            name: 'Ivideon'
        }]);
    },
    down: queryInterface => {
        return queryInterface.bulkDelete(tableName, null, {});
    }
};