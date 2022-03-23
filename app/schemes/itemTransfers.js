module.exports = {
    get: {
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    },
    create: {
        properties: {
            fromId: {
                type: 'integer'
            },
            toId: {
                type: 'integer'
            },
            isFromWarhouse: {
                type: 'boolean'
            },
            transferMenuItems: {
                type: 'array',
                items: {
                    properties: {
                        count: { type: 'integer' },
                        id: { type: 'integer' }
                    },
                }
            },
        }
    },
    createFromWarehouse: {
        properties: {
            fromId: {
                type: 'integer'
            },
            toId: {
                type: 'integer'
            },
            isFromWarhouse: {
                type: 'boolean'
            },
            itemTransfersMenuItems: {
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
        required: ['fromId', 'toId', 'isFromWarhouse', 'itemTransfersMenuItems']
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
