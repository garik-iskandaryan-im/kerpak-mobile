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
            hostName: {
                type: 'string',
            },
            hostContact: {
                type: 'string',
            },
            hostContactPhoneNumber: {
                type: 'string',
            },
        },
        required: [
            'displayName',
        ]
    },
    update: {
        properties: {
            displayName: {
                type: 'string',
            },
            description: {
                type: ['string', 'null'],
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
            hostName: {
                type: 'string',
            },
            hostContact: {
                type: 'string',
            },
            hostContactPhoneNumber: {
                type: 'string',
            },
        },
        required: [ ]
    },
    getLabels: {
        properties: {
            warehouseId: {
                type: 'integer'
            },
            itemsList: {
                type: 'array',
                items: {
                    properties: {
                        count: { type: 'integer' },
                        id: { type: 'integer' },
                        productionDate: {type: 'string'},
                        expirationDate: {type: 'string'}
                    },
                }
            },
        },
        required: ['warehouseId', 'itemsList']
    },
};