const {
    consumers: Consumers,
    regions: Regions,
    sms: Sms,
    smsLog: SmsLog,
    serviceProviders: ServiceProviders
} = require('app/models/models');

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // default region list
            const defaultRegions = [
                { isoCode: 'am', isDefault: true, initialPositionLatitude: 40.13, initialPositionLongitude: 44.515, initialPositionLatitudeDelta: 0.12, initialPositionLongitudeDelta: 0.12, currencyName: 'AMD', currencySymbol: '֏', currencyCode: '051', language: 'hy', weightName: 'grams', weightSymbol: 'g', temperatureName: 'Celsius', temperatureSymbol: '°C', paymentMethod: 1, timezone: '+04:00' },
                { isoCode: 'ch', isDefault: false, initialPositionLatitude: 46.4097, initialPositionLongitude: 6.84035, initialPositionLatitudeDelta: 0.12, initialPositionLongitudeDelta: 0.12, currencyName: 'CHF', currencySymbol: 'CHF', currencyCode: null, language: null, weightName: 'grams', weightSymbol: 'g', temperatureName: 'Celsius', temperatureSymbol: '°C', paymentMethod: 3, timezone: '+01:00' },
                { isoCode: 'cy', isDefault: false, initialPositionLatitude: 35.1856, initialPositionLongitude: 33.3823, initialPositionLatitudeDelta: 0.12, initialPositionLongitudeDelta: 0.12, currencyName: 'EUR', currencySymbol: '€', currencyCode: null, language: null, weightName: 'grams', weightSymbol: 'g', temperatureName: 'Celsius', temperatureSymbol: '°C', paymentMethod: 2, timezone: '+02:00' },
                { isoCode: 'ca', isDefault: false, initialPositionLatitude: 45.4247, initialPositionLongitude: -75.695, initialPositionLatitudeDelta: 0.12, initialPositionLongitudeDelta: 0.12, currencyName: 'CAD', currencySymbol: 'C$', currencyCode: null, language: null, weightName: 'grams', weightSymbol: 'g', temperatureName: 'Celsius', temperatureSymbol: '°C', paymentMethod: 3, timezone: '+05:00' },
                { isoCode: 'ru', isDefault: false, initialPositionLatitude: 55.5815182, initialPositionLongitude: 36.8237761, initialPositionLatitudeDelta: 0.12, initialPositionLongitudeDelta: 0.12, currencyName: 'RUB', currencySymbol: '₽', currencyCode: null, language: null, weightName: 'grams', weightSymbol: 'g', temperatureName: 'Celsius', temperatureSymbol: '°C', paymentMethod: null, timezone: '+03:00' },
                { isoCode: 'us', isDefault: false, initialPositionLatitude: 37.274207, initialPositionLongitude: -104.6749957, initialPositionLatitudeDelta: 0.12, initialPositionLongitudeDelta: 0.12, currencyName: 'USD', currencySymbol: '$', currencyCode: null, language: null, weightName: 'pound', weightSymbol: 'lb', temperatureName: 'Fahrenheit', temperatureSymbol: '°F', paymentMethod: null, timezone: '-08:00' },
                { isoCode: 'gb', isDefault: false, initialPositionLatitude: 54.2302561, initialPositionLongitude: -13.4454411, initialPositionLatitudeDelta: 0.12, initialPositionLongitudeDelta: 0.12, currencyName: 'GBP', currencySymbol: '£', currencyCode: null, language: null, weightName: 'pound', weightSymbol: 'lb', temperatureName: 'Celsius', temperatureSymbol: '°C', paymentMethod: null, timezone: '+00:00' }
            ];
            await Regions.bulkCreate(defaultRegions, { transaction });

            const regions = await Regions.findAll({ transaction });

            // add region_id relation in consumers table
            await queryInterface.addColumn(
                'consumers',
                'region_id',
                {
                    type: Sequelize.DataTypes.INTEGER,
                    references: {
                        model: {
                            tableName: 'regions'
                        },
                        key: 'id'
                    },
                    field: 'region_id'
                },
                { transaction }
            );
            const consumers = await Consumers.findAll({ transaction });
            for (let i = 0; i < consumers.length; i++) {
                const consumer = consumers[i];
                const region = regions.find(region => region.isoCode === consumer.countryISO);

                if (region) {
                    await Consumers.update(
                        { regionId: region.id },
                        { where: { id: consumer.id }, transaction });
                }
            }
            await queryInterface.removeIndex('consumers', 'phone_country_ISO_unique', { transaction });
            await queryInterface.addIndex('consumers', ['phone', 'region_id'], {
                name: 'phone_region_unique',
                unique: true
            }, { transaction });

            // add region_id relation in sms table
            await queryInterface.addColumn(
                'sms',
                'region_id',
                {
                    type: Sequelize.DataTypes.INTEGER,
                    references: {
                        model: {
                            tableName: 'regions'
                        },
                        key: 'id'
                    },
                    field: 'region_id'
                },
                { transaction }
            );
            const allSms = await Sms.findAll({ transaction });
            for (let i = 0; i < allSms.length; i++) {
                const sms = allSms[i];
                const region = regions.find(region => region.isoCode === sms.countryISO);
                if (region) {
                    await Sms.update(
                        { regionId: region.id },
                        { where: { id: sms.id }, transaction });
                }
            }
            await queryInterface.removeIndex('sms', 'sms_phone_country_ISO_unique', { transaction });
            await queryInterface.addIndex('sms', ['phone', 'region_id'], {
                name: 'phone_region_unique',
                unique: true
            }, { transaction });

            // add region_id relation in smsLog table
            await queryInterface.addColumn(
                'smsLog',
                'region_id',
                {
                    type: Sequelize.DataTypes.INTEGER,
                    references: {
                        model: {
                            tableName: 'regions'
                        },
                        key: 'id'
                    },
                    field: 'region_id'
                },
                { transaction }
            );
            const allSmsLogs = await SmsLog.findAll({ transaction });
            for (let i = 0; i < allSmsLogs.length; i++) {
                const smsLog = allSmsLogs[i];
                const region = regions.find(region => region.isoCode === smsLog.countryISO);
                if (region) {
                    await SmsLog.update(
                        { regionId: region.id },
                        { where: { id: smsLog.id }, transaction });
                }
            }

            // add region_id serviceProvider in consumers table
            await queryInterface.addColumn(
                'serviceProviders',
                'region_id',
                {
                    type: Sequelize.DataTypes.INTEGER,
                    references: {
                        model: {
                            tableName: 'regions'
                        },
                        key: 'id'
                    },
                    field: 'region_id'
                },
                { transaction }
            );
            const serviceProviders = await ServiceProviders.findAll({ transaction });
            for (let i = 0; i < serviceProviders.length; i++) {
                const serviceProvider = serviceProviders[i];
                const region = regions.find(region => region.isoCode === serviceProvider.regionalSettings.toLowerCase());
                if (region) {
                    await ServiceProviders.update(
                        { regionId: region.id },
                        { where: { id: serviceProvider.id }, transaction });
                }
            }

            await queryInterface.changeColumn(
                'consumers',
                'country_ISO',
                {
                    type: Sequelize.STRING,
                    allowNull: true,
                },
                { transaction }
            );
            await queryInterface.changeColumn(
                'sms',
                'country_ISO',
                {
                    type: Sequelize.STRING,
                    allowNull: true,
                },
                { transaction }
            );
            await queryInterface.changeColumn(
                'smsLog',
                'country_ISO',
                {
                    type: Sequelize.STRING,
                    allowNull: true,
                },
                { transaction }
            );
            await queryInterface.changeColumn(
                'serviceProviders',
                'regional_settings',
                {
                    type: Sequelize.STRING,
                    allowNull: true,
                },
                { transaction }
            );
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('consumers', 'region_id');
        await queryInterface.removeColumn('sms', 'region_id');
        await queryInterface.removeColumn('smsLog', 'region_id');
        await queryInterface.removeColumn('serviceProviders', 'region_id');
    }
};