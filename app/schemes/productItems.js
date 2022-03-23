const { PRODUCT_ITEM_STATUS_ALLOWED } = require('../constants');

module.exports = {
    get: {
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    },
    create: {
        properties: {
            rfId: {
                type: 'string',
                minLength: 7,
                maxLength: 7
            },
            productionDate: {
                type: ['string', 'null'],
                maxLength: 255
            },
            expirationDate: {
                type: ['string', 'null'],
                maxLength: 255
            },
            status: {
                enum: PRODUCT_ITEM_STATUS_ALLOWED.map(status => status.id)
            },
            place: {
                type: 'string',
                maxLength: 255
            },
        },
        required: ['status']
    },
    createMany: {
        properties: {
            count: { type: 'number' },
            serviceProviderId: { type: 'number' },
            kioskId: { type: 'number' },
            menuItemId: { type: 'number' },
            productionDate: {
                type: ['string', 'null'],
                maxLength: 255
            },
            expirationDate: {
                type: ['string', 'null'],
                maxLength: 255
            }
        },
        required: ['count', 'serviceProviderId', 'kioskId', 'menuItemId', 'productionDate']
    },
    check: {
        properties: {
            spID: { type: 'number' },
            EAN13: {
                type: 'string',
                minLength: 13,
                maxLength: 13
            },
            EAN5: {
                type: 'string',
                minLength: 5,
                maxLength: 5
            },
        },
        required: ['spID', 'EAN13', 'EAN5']
    },
    createManyDifferentItems: {
        properties: {
            productItems: {
                type: 'array',
                items: {
                    properties: {
                        count: { type: 'number' },
                        serviceProviderId: { type: 'number' },
                        kioskId: { type: 'number' },
                        menuItemId: { type: 'number' },
                        productionDate: {
                            type: ['string', 'null'],
                            maxLength: 255
                        },
                        expirationDate: {
                            type: ['string', 'null'],
                            maxLength: 255
                        }
                    },
                    required: ['count', 'serviceProviderId', 'kioskId', 'menuItemId', 'productionDate', 'expirationDate']
                },
            },
        }
    },
};
