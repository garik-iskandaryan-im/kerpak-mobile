const { TRANSFER_STATUS_ALLOWED, TRANSFER_STATUS_ALLOWED_NEW_LIST } = require('../constants');

module.exports = {
    up  : function (queryInterface, Sequelize) {
      return queryInterface
        .changeColumn('itemTransfers', 'status', {
          type: Sequelize.ENUM(TRANSFER_STATUS_ALLOWED_NEW_LIST.map(status => status.id)),
          allowNull: false
        });
    },
    down: function (queryInterface, Sequelize) {
      return queryInterface
        .changeColumn(tableName, 'status', {
            type: Sequelize.ENUM(TRANSFER_STATUS_ALLOWED.map(status => status.id)),
            allowNull: false
        });
    }
  };
