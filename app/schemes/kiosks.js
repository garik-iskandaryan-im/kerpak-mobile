const CONSTANTS = require('app/constants');
const kioskWeekTimeSchema = require('app/schemes/kioskWeekTimeSchema');

module.exports = {
    get: {
        properties: {
            id: { type: 'number' }
        },
        required: ['id']
    },
    create: {
        properties: {
            displayName: {
                type: 'string',
            },
            description: {
                type: 'string',
            },
            address1: {
                type: 'string',
            },
            address2: {
                type: 'string',
            },
            city: {
                type: 'string',
            },
            state: {
                type: 'string',
            },
            zipCode: {
                type: 'string',
            },
            country: {
                type: 'string',
            },
            hotDishAvailability: {
                type: 'string',
            },
            warehouse: {
                type: 'string',
            },
            simCardNumber: {
                type: 'string',
            },
            fridgeModel: {
                type: 'string',
            },
            fridgeSn: {
                type: 'string',
            },
            controllerUnitSn: {
                type: 'string',
            },
            public: {
                type: 'string',
            },
            hostName: {
                type: 'string',
            },
            localContact: {
                type: 'string',
            },
            localContactNumber: {
                type: 'string',
            },
            rentAmount: {
                type: ['number', 'null'],
            },
            serviceFee: {
                type: ['number', 'null'],
            },
            utilitiesAmount: {
                type: ['number', 'null'],
            },
            accessNotes: {
                type: 'string',
            },
            latitude: {
                type: 'string',
            },
            longitude: {
                type: 'string',
            },
            image: {
                type: 'string',
            },
            status: {
                enum: CONSTANTS.KIOSK_STATUSES
            },
            temperature: {
                type: ['number', 'null'],
            },
            isDoorOpened: {
                type: 'boolean',
            },
            isLocked: {
                type: 'boolean',
            },
            ip: {
                type: 'string',
            },
            timeBasedDiscount: {
                type: 'boolean',
            },
            doorStatus: {
                type: 'boolean',
            },
            timeDiscountAmount: {
                type: ['number', 'null'],
                minimum: 1,
                maximum: 99,
            },
            firstPurchaseDiscount: {
                type: 'boolean',
            },
            firstPurchaseDiscountAmount: {
                type: ['number', 'null'],
                minimum: 1,
                maximum: 99,
            },
            serviceProviderId: {
                type: ['number', 'null'],
            },
            menuId: {
                type: ['number', 'null'],
            },
            discountSchedules: {
                'type': 'array',
                'items': kioskWeekTimeSchema.create
            },
            hoursOfOperations: {
                'type': 'array',
                'items': kioskWeekTimeSchema.create
            },
            ivideonCameraId: {
                type: 'string'
            },
            kerpakUnitSn: {
                type: 'string'
            },
            controllerMac: {
                type: 'string'
            },
            routerSn: {
                type: 'string'
            },
            routerMac: {
                type: 'string'
            },
            ivideonCameraSn: {
                type: 'string'
            },
            ivideonCameraMac: {
                type: 'string'
            },
            paymentTerminalSn: {
                type: 'string'
            },
            paymentTerminalIp: {
                type: 'string'
            },

            hoursOfOperationsMonday: {
                type: 'boolean'
            },
            hoursOfOperationsMondayFrom: {
                type: 'string'
            },
            hoursOfOperationsMondayTo: {
                type: 'string'
            },
            hoursOfOperationsTuesday: {
                type: 'boolean'
            },
            hoursOfOperationsTuesdayFrom: {
                type: 'string'
            },
            hoursOfOperationsTuesdayTo: {
                type: 'string'
            },
            hoursOfOperationsWednesday: {
                type: 'boolean'
            },
            hoursOfOperationsWednesdayFrom: {
                type: 'string'
            },
            hoursOfOperationsWednesdayTo: {
                type: 'string'
            },
            hoursOfOperationsThursday: {
                type: 'boolean'
            },
            hoursOfOperationsThursdayFrom: {
                type: 'string'
            },
            hoursOfOperationsThursdayTo: {
                type: 'string'
            },
            hoursOfOperationsFriday: {
                type: 'boolean'
            },
            hoursOfOperationsFridayFrom: {
                type: 'string'
            },
            hoursOfOperationsFridayTo: {
                type: 'string'
            },
            hoursOfOperationsSaturday: {
                type: 'boolean'
            },
            hoursOfOperationsSaturdayFrom: {
                type: 'string'
            },
            hoursOfOperationsSaturdayTo: {
                type: 'string'
            },
            hoursOfOperationsSunday: {
                type: 'boolean'
            },
            hoursOfOperationsSundayFrom: {
                type: 'string'
            },
            hoursOfOperationsSundayTo: {
                type: 'string'
            },

            discountSchedulesMonday: {
                type: 'boolean'
            },
            discountSchedulesMondayFrom: {
                type: 'string'
            },
            discountSchedulesMondayTo: {
                type: 'string'
            },
            discountSchedulesTuesday: {
                type: 'boolean'
            },
            discountSchedulesTuesdayFrom: {
                type: 'string'
            },
            discountSchedulesTuesdayTo: {
                type: 'string'
            },
            discountSchedulesWednesday: {
                type: 'boolean'
            },
            discountSchedulesWednesdayFrom: {
                type: 'string'
            },
            discountSchedulesWednesdayTo: {
                type: 'string'
            },
            discountSchedulesThursday: {
                type: 'boolean'
            },
            discountSchedulesThursdayFrom: {
                type: 'string'
            },
            discountSchedulesThursdayTo: {
                type: 'string'
            },
            discountSchedulesFriday: {
                type: 'boolean'
            },
            discountSchedulesFridayFrom: {
                type: 'string'
            },
            discountSchedulesFridayTo: {
                type: 'string'
            },
            discountSchedulesSaturday: {
                type: 'boolean'
            },
            discountSchedulesSaturdayFrom: {
                type: 'string'
            },
            discountSchedulesSaturdayTo: {
                type: 'string'
            },
            discountSchedulesSunday: {
                type: 'boolean'
            },
            discountSchedulesSundayFrom: {
                type: 'string'
            },
            discountSchedulesSundayTo: {
                type: 'string'
            },
            launchDate: {
                type: ['string', 'null'],
            },
        },
        required: [
            'displayName', 'address1',
            'city', 'state', 'zipCode', 'country',
            'hostName'
        ]
    },
    update: {
        properties: {
            displayName: {
                type: 'string',
            },
            description: {
                type: 'string',
            },
            address1: {
                type: 'string',
            },
            address2: {
                type: 'string',
            },
            city: {
                type: 'string',
            },
            state: {
                type: 'string',
            },
            zipCode: {
                type: 'string',
            },
            country: {
                type: 'string',
            },
            hotDishAvailability: {
                type: ['string', 'null'],
            },
            warehouse: {
                type: 'string',
            },
            simCardNumber: {
                type: 'string',
            },
            fridgeModel: {
                type: 'string',
            },
            fridgeSn: {
                type: 'string',
            },
            controllerUnitSn: {
                type: 'string',
            },
            public: {
                type: ['string', 'null'],
            },
            hostName: {
                type: 'string',
            },
            localContact: {
                type: 'string',
            },
            localContactNumber: {
                type: 'string',
            },
            rentAmount: {
                type: ['number', 'null'],
            },
            serviceFee: {
                type: ['number', 'null'],
            },
            utilitiesAmount: {
                type: ['number', 'null'],
            },
            accessNotes: {
                type: 'string',
            },
            latitude: {
                type: 'string',
            },
            longitude: {
                type: 'string',
            },
            image: {
                type: 'string',
            },
            status: {
                enum: CONSTANTS.KIOSK_STATUSES
            },
            temperature: {
                type: ['number', 'null'],
            },
            isDoorOpened: {
                type: 'boolean',
            },
            isLocked: {
                type: 'boolean',
            },
            ip: {
                type: 'string',
            },
            timeBasedDiscount: {
                type: 'boolean',
            },
            doorStatus: {
                type: 'boolean',
            },
            timeDiscountAmount: {
                type: ['number', 'null'],
                minimum: 1,
                maximum: 99,
            },
            firstPurchaseDiscount: {
                type: 'boolean',
            },
            firstPurchaseDiscountAmount: {
                type: ['number', 'null'],
                minimum: 1,
                maximum: 99,
            },
            serviceProviderId: {
                type: ['number', 'null'],
            },
            menuId: {
                type: ['number', 'null'],
            },
            discountSchedules: {
                'type': ['array', 'null'],
                'items': kioskWeekTimeSchema.create
            },
            hoursOfOperations: {
                'type': ['array', 'null'],
                'items': kioskWeekTimeSchema.create
            },
            ivideonCameraId: {
                type: 'string'
            },
            kerpakUnitSn: {
                type: 'string'
            },
            controllerMac: {
                type: 'string'
            },
            routerSn: {
                type: 'string'
            },
            routerMac: {
                type: 'string'
            },
            ivideonCameraSn: {
                type: 'string'
            },
            ivideonCameraMac: {
                type: 'string'
            },
            paymentTerminalSn: {
                type: 'string'
            },
            paymentTerminalIp: {
                type: 'string'
            },

            hoursOfOperationsMonday: {
                type: 'boolean'
            },
            hoursOfOperationsMondayFrom: {
                type: 'string'
            },
            hoursOfOperationsMondayTo: {
                type: 'string'
            },
            hoursOfOperationsTuesday: {
                type: 'boolean'
            },
            hoursOfOperationsTuesdayFrom: {
                type: 'string'
            },
            hoursOfOperationsTuesdayTo: {
                type: 'string'
            },
            hoursOfOperationsWednesday: {
                type: 'boolean'
            },
            hoursOfOperationsWednesdayFrom: {
                type: 'string'
            },
            hoursOfOperationsWednesdayTo: {
                type: 'string'
            },
            hoursOfOperationsThursday: {
                type: 'boolean'
            },
            hoursOfOperationsThursdayFrom: {
                type: 'string'
            },
            hoursOfOperationsThursdayTo: {
                type: 'string'
            },
            hoursOfOperationsFriday: {
                type: 'boolean'
            },
            hoursOfOperationsFridayFrom: {
                type: 'string'
            },
            hoursOfOperationsFridayTo: {
                type: 'string'
            },
            hoursOfOperationsSaturday: {
                type: 'boolean'
            },
            hoursOfOperationsSaturdayFrom: {
                type: 'string'
            },
            hoursOfOperationsSaturdayTo: {
                type: 'string'
            },
            hoursOfOperationsSunday: {
                type: 'boolean'
            },
            hoursOfOperationsSundayFrom: {
                type: 'string'
            },
            hoursOfOperationsSundayTo: {
                type: 'string'
            },

            discountSchedulesMonday: {
                type: 'boolean'
            },
            discountSchedulesMondayFrom: {
                type: 'string'
            },
            discountSchedulesMondayTo: {
                type: 'string'
            },
            discountSchedulesTuesday: {
                type: 'boolean'
            },
            discountSchedulesTuesdayFrom: {
                type: 'string'
            },
            discountSchedulesTuesdayTo: {
                type: 'string'
            },
            discountSchedulesWednesday: {
                type: 'boolean'
            },
            discountSchedulesWednesdayFrom: {
                type: 'string'
            },
            discountSchedulesWednesdayTo: {
                type: 'string'
            },
            discountSchedulesThursday: {
                type: 'boolean'
            },
            discountSchedulesThursdayFrom: {
                type: 'string'
            },
            discountSchedulesThursdayTo: {
                type: 'string'
            },
            discountSchedulesFriday: {
                type: 'boolean'
            },
            discountSchedulesFridayFrom: {
                type: 'string'
            },
            discountSchedulesFridayTo: {
                type: 'string'
            },
            discountSchedulesSaturday: {
                type: 'boolean'
            },
            discountSchedulesSaturdayFrom: {
                type: 'string'
            },
            discountSchedulesSaturdayTo: {
                type: 'string'
            },
            discountSchedulesSunday: {
                type: 'boolean'
            },
            discountSchedulesSundayFrom: {
                type: 'string'
            },
            discountSchedulesSundayTo: {
                type: 'string'
            },
            launchDate: {
                type: ['string', 'null'],
            },
        },
        required: [ ]
    },
};