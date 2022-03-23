const crypt = require('app/helpers/crypt');
const tableName = 'users';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const date = new Date();
        return queryInterface.bulkInsert(tableName, [{
            email: 'mkhitar_h@instigatemobile.com',
            password_hash: await crypt.hash('Angular#123'),
            is_kerpak_operator: true,
            createdAt: date,
            updatedAt: date
        }]);
    },
    down: queryInterface => {
        return queryInterface.bulkDelete(tableName, null, {});
    }
};