module.exports = {
    get: {
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    },
    create: {
        properties: {
            reason: {
                type: 'string',
                maxLength: 255
            },
            ids: {
                type: 'array',
                items: [{type: 'number'}]
            },
            userId: {
                type: 'integer',
            },
            reasonId: {
                type: 'integer',
            },
            reasons: {
                type: 'array',
                items: {
                    properties: {
                        name: { type: 'string' },
                        serviceProviderId: { type: 'integer' },
                    },
                }
            },
        },
        required: ['reason', 'ids']
    },
    createFromWarehouse: {
        properties: {
            warehouseId: {
                type: 'integer'
            },
            reason: {
                type: 'string',
            },
            itemWriteOffMenuItems: {
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
            reasonId: {
                type: 'integer',
            },
            reasons: {
                type: 'array',
                items: {
                    properties: {
                        name: { type: 'string' },
                        serviceProviderId: { type: 'integer' },
                    },
                }
            },
        },
        required: ['reason', 'warehouseId', 'itemWriteOffMenuItems']
    },
    createFromKiosk: {
        properties: {
            kioskId: {
                type: 'integer'
            },
            reason: {
                type: 'string',
            },
            itemWriteOffMenuItems: {
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
            reasonId: {
                type: 'integer',
            },
            reasons: {
                type: 'array',
                items: {
                    properties: {
                        name: { type: 'string' },
                        serviceProviderId: { type: 'integer' },
                    },
                }
            },
        },
        required: ['reason', 'kioskId', 'itemWriteOffMenuItems']
    },
};
