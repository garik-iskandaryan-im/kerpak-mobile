module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('kiosks', 'delivery_transfer_time_from', {
          type: Sequelize.DataTypes.DATE,
        });

        await queryInterface.changeColumn('kiosks', 'delivery_transfer_time_to', {
            type: Sequelize.DataTypes.DATE,
        });
        await queryInterface.changeColumn('preOrders', 'kiosk_delivery_transfer_time_from', {
              type: Sequelize.DataTypes.DATE,
        });
    },
    down: async (queryInterface) => {
        await queryInterface.changeColumn('kiosks', 'delivery_transfer_time_from', {
            type: Sequelize.DataTypes.TIME
        });
        await queryInterface.changeColumn('kiosks', 'delivery_transfer_time_to', {
            type: Sequelize.DataTypes.TIME
        });
        await queryInterface.changeColumn('preOrders', 'kiosk_delivery_transfer_time_from', {
            type: Sequelize.DataTypes.TIME,
        });
    }
};