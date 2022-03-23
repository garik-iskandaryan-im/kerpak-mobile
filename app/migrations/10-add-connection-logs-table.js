
const models = require('../models/models');

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('connectionLogs', {
            id: {
                type: Sequelize.DataTypes.INTEGER(11),
                allowNull: false,
                primaryKey: true,
                autoIncrement: true,
                field: 'id'
            },
            connectedAt: {
                type: Sequelize.DataTypes.DATE,
                allowNull: true,
            },
            disconnectedAt: {
                type: Sequelize.DataTypes.DATE,
                allowNull: true,
            },
            kioskId: {
                type: Sequelize.DataTypes.INTEGER,
                references: {
                  model: {
                    tableName: 'kiosks'
                  },
                  key: 'id'
                },
                allowNull: false,
                field: 'kiosks_id'
            },

        });
      },
      down: (queryInterface) => {
        return queryInterface.dropTable('connectionLogs');
      }
};