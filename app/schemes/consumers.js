const CONSTANTS = require('app/constants');

module.exports = {
    get: {
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    },
    create: {
        properties: {
            phone: {
                type: 'string',
                maxLength: 255
            },
            registerCompleted: {
                type: 'boolean',
            },
            email: {
                type: 'string',
                maxLength: 255
            },
            firstName: {
                type: 'string',
                maxLength: 255
            },
            lastName: {
                type: 'string',
                maxLength: 255
            },
            country: {
                type: 'string',
                maxLength: 255
            },
            zipCode: {
                type: 'string',
                maxLength: 255
            },
            firebaseRegistrationToken: {
                type: ['string', 'null'],
            },
            OS: {
                type: 'string',
            }
        },
        required: [],
        additionalProperties: false
    },
    addBalance: {
        properties: {
            balance: { type:'number'},
            balanceType: {type: 'string', enum: CONSTANTS.BALANCE_TYPE},
        },
        required: ['balance', 'balanceType'],
        additionalProperties: false
    },
    bulkAddBalance: {
        properties: {
            balance: { type:'number'},
            balanceType: {
                type: 'string',
                enum: CONSTANTS.BALANCE_TYPE
            },
            ids: {
                type: 'array',
                items: [{type: 'number'}]
            }
        },
        required: ['balance', 'balanceType', 'ids'],
        additionalProperties: false
    }
};