const models = require('../models/models');

module.exports = {
    async up(queryInterface, Sequelize) {
        // monday
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_monday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_monday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_monday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        // tuesday
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_tuesday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_tuesday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_tuesday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        // wednesday
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_wednesday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_wednesday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_wednesday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        // thursday
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_thursday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_thursday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_thursday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        // friday
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_friday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_friday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_friday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        // saturday
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_saturday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_saturday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_saturday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        // sunday
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_sunday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_sunday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'hoursOfOperations_sunday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );

        // monday
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_monday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_monday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_monday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        // tuesday
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_tuesday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_tuesday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_tuesday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        // wednesday
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_wednesday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_wednesday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_wednesday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        // thursday
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_thursday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_thursday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_thursday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        // friday
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_friday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_friday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_friday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        // saturday
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_saturday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_saturday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_saturday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        // sunday
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_sunday',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_sunday_from',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );
        await queryInterface.addColumn(
            'kiosks',
            'discountSchedules_sunday_to',
            {
                type: Sequelize.TIME,
                allowNull: true,
            },
        );

        const modifyArrayOfObj = (result, key, list) => {
            list.forEach(i => {
                if (!result[i.kioskId]) {
                    result[i.kioskId] = {};
                }
                const capitalize = i.weekDay.charAt(0).toUpperCase() + i.weekDay.slice(1);
                result[i.kioskId][`${key}${capitalize}`] = i.value;
                result[i.kioskId][`${key}${capitalize}From`] = i.timeFrom;
                result[i.kioskId][`${key}${capitalize}To`] = i.timeTo;
            })
        }

        const result = {};

        const hoursOfOperations = await models.hoursOfOperations.findAll();
        const discountSchedules = await models.discountSchedules.findAll();
        modifyArrayOfObj(result, 'hoursOfOperations', hoursOfOperations);
        modifyArrayOfObj(result, 'discountSchedules', discountSchedules);

        const kioskIds = Object.keys(result);
        for(let i = 0; i < kioskIds.length; ++i) {
            let currID = kioskIds[i];
            await models.kiosks.update(result[currID], { where: { id: +currID }});
        }
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_monday');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_monday_from');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_monday_to');

        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_tuesday');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_tuesday_from');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_tuesday_to');

        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_wednesday');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_wednesday_from');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_wednesday_to');

        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_thursday');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_thursday_from');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_thursday_to');

        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_friday');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_friday_from');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_friday_to');

        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_saturday');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_saturday_from');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_saturday_to');

        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_sunday');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_sunday_from');
        await queryInterface.removeColumn('kiosks', 'hoursOfOperations_sunday_to');


        await queryInterface.removeColumn('kiosks', 'discountSchedules_monday');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_monday_from');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_monday_to');

        await queryInterface.removeColumn('kiosks', 'discountSchedules_tuesday');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_tuesday_from');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_tuesday_to');

        await queryInterface.removeColumn('kiosks', 'discountSchedules_wednesday');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_wednesday_from');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_wednesday_to');

        await queryInterface.removeColumn('kiosks', 'discountSchedules_thursday');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_thursday_from');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_thursday_to');

        await queryInterface.removeColumn('kiosks', 'discountSchedules_friday');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_friday_from');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_friday_to');

        await queryInterface.removeColumn('kiosks', 'discountSchedules_saturday');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_saturday_from');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_saturday_to');

        await queryInterface.removeColumn('kiosks', 'discountSchedules_sunday');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_sunday_from');
        await queryInterface.removeColumn('kiosks', 'discountSchedules_sunday_to');
    }
};