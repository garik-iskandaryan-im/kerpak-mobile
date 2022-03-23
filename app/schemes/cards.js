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
            bindingId: {
                type: 'string',
                maxLength: 255
            },
            expirationDate: {
                type: 'string',
                maxLength: 255
            },
            active: {
                type: 'boolean'
            },
            isDefault: {
                type: 'boolean'
            }
        },
        required: [
            'bindingId',
            'expirationDate',
            'active',
            'isDefault'
        ]
    },
    delete: {
        properties: {
            id: { type: 'number' }
        },
        required: ['id']
    },
    addCardByType: {
        properties: {
            consumerId: { type: 'number' },
            cardType: { type: 'string', enum: Object.values(CONSTANTS.CARD_TYPES) },
        },
        required: ['consumerId', 'cardType']
    }
};