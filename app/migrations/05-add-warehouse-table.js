
const models = require('../models/models');

module.exports = {
    async up(queryInterface, Sequelize) {
        const warehouseIDs = {};
        await queryInterface.createTable('warehouses', {
            id: {
                type: Sequelize.DataTypes.INTEGER(11),
                allowNull: false,
                primaryKey: true,
                autoIncrement: true,
                field: 'id'
            },
            displayName: {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: false,
                field: 'display_name'
            },
            description: {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: true,
            },
            address1: {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: true,
            },
            address2: {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: true,
            },
            city: {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: true,
            },
            state: {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: true,
            },
            zipCode: {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: false,
                field: 'zip_code'
            },
            country: {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: false,
            },
            hostName: {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: false,
                field: 'host_name'
            },
            hostContact: {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: false,
                field: 'local_contact'
            },
            hostContactPhoneNumber: {
                type: Sequelize.DataTypes.STRING(255),
                allowNull: false,
                field: 'local_contact_number'
            },
            serviceProviderId: {
                type: Sequelize.DataTypes.INTEGER,
                references: {
                  model: {
                    tableName: 'serviceProviders'
                  },
                  key: 'id'
                },
                allowNull: true,
                field: 'service_provider_id'
            },

        });
        await queryInterface.addColumn(
            'productItems',
            'warehouse_id', 
            {
                type: Sequelize.INTEGER(11),
                allowNull: true,
                references: {
                    model: 'warehouses',
                    key: 'id',
                    defaultValue: null
                },
            },
        );
        await queryInterface.addColumn(
            'itemsWriteOffs',
            'warehouse_id', 
            {
                type: Sequelize.INTEGER(11),
                allowNull: true,
                references: {
                    model: 'warehouses',
                    key: 'id',
                    defaultValue: null
                },
            },
        );
        await queryInterface.addColumn(
            'itemTransfers',
            'from_warehouse_id', 
            {
                type: Sequelize.INTEGER(11),
                allowNull: true,
                references: {
                    model: 'warehouses',
                    key: 'id',
                    defaultValue: null
                },
            },
        );
        await queryInterface.addColumn(
            'itemTransfers',
            'to_warehouse_id', 
            {
                type: Sequelize.INTEGER(11),
                allowNull: true,
                references: {
                    model: 'warehouses',
                    key: 'id',
                    defaultValue: null
                },
            },
        );
        await queryInterface.addColumn(
          'itemsWriteOffs',
          'warehouse_name',
          {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
        );
        await queryInterface.addColumn(
            'productItems',
            'isReturnedItem',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        );
        await queryInterface.addColumn(
            'productItems',
            'returnedKioskId',
            {
                type: Sequelize.INTEGER(11),
                allowNull: true,
                references: {
                    model: 'kiosks',
                    key: 'id',
                    defaultValue: null
                },
            },
        );
        await queryInterface.addColumn(
            'productItems',
            'returnedKioskName',
            {
                type: Sequelize.STRING(255),
                allowNull: true,
                defaultValue: null
            },
        );
        const kiosks = await models.kiosks.findAll({where: {warehouse: true}, raw: true});
        const warhousesIDsArr = [];
        for (let i in kiosks) {
            const kiosk = kiosks[i];
            const res = await models.warehouses.create({
                displayName: kiosk.displayName, 
                description: kiosk.description,
                address1: kiosk.address1,
                address2: kiosk.address2,
                city: kiosk.city,
                state: kiosk.state,
                zipCode: kiosk.zipCode,
                country: kiosk.country,
                hostName: kiosk.hostName,
                hostContact: kiosk.hostContact,
                hostContactPhoneNumber: kiosk.hostContactPhoneNumber,
                serviceProviderId: kiosk.serviceProviderId
            });
            warehouseIDs[kiosk.id] = res.id;
            warhousesIDsArr.push(res.id);
        }
        for (let j in warehouseIDs) {
            await models.productItems.update({ warehouseId: warehouseIDs[j], kioskId: null }, {where: {kioskId: j}});
            await models.itemsWriteOffs.update({ warehouseId: warehouseIDs[j], kioskId: null }, {where: {kioskId: j}});
        }
        await models.kiosks.destroy({where: {warehouse: true}});
        await queryInterface.removeColumn('kiosks', 'warehouse');

        await models.productItems.update({
            productionDate: models.sequelize.fn('DATE_FORMAT', models.Sequelize.col('production_date'), '%d/%m/%y,%H:00:00'),
            expirationDate: models.sequelize.fn('DATE_FORMAT', models.Sequelize.col('expiration_date'), '%d/%m/%y,%H:00:00')
        });
      },
      down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('warehouse');
      }
};