module.exports = {
    create: {
        properties: {
            kioskId: {
                type: 'integer'
            },
            price: {
                type: 'number',
            },
            expectedDeliveryDate: {
                type: 'string'
            },
            comment: {
                type: 'string'
            },
            useBalance: {
                type: 'boolean'
            },
            productItems: {
                type: 'array',
                items: {
                    properties: {
                        barcode: {
                            type: 'string'
                        },
                        count: {
                            type: 'integer'
                        }
                    },
                    required: ['barcode', 'count']
                }
            },
        },
        required: ['kioskId', 'expectedDeliveryDate', 'productItems'],
        additionalProperties: false
    },
    removeFromTransfer: {
        properties: {
            transferId: {
                type: 'number'
            },
            preOrdersList: {
                type: 'array',
                items: {
                    type: 'number',
                }
            }
        },
        required: ['transferId', 'preOrdersList']
    },
    pay: {
        properties: {
            code: {
                type: 'string'
            },
            kioskId: {
                type: 'integer'
            },
            sessionId: {
                type: 'integer'
            },
        },
        required: ['code', 'kioskId', 'sessionId'],
        additionalProperties: false
    },
    cancelPreOrder: {
        properties: {
            declineReason: {
                type: 'string'
            },
        },
        required: ['declineReason'],
        additionalProperties: false
    },
    acceptPreOrder: {
        properties: {
            productionDate: {
                type: 'string'
            },
        },
        required: ['productionDate'],
        additionalProperties: false
    },
    customerCancel: {
        properties: {
            declineReason: {
                type: 'string'
            },
        },
        required: ['declineReason'],
        additionalProperties: false
    },
    changeKiosk: {
        properties: {
            kioskId: {
                type: 'number'
            },
        },
        required: ['kioskId'],
        additionalProperties: false
    },
    changeExpectedDeliveryDate: {
        properties: {
            expectedDeliveryDate: {
                type: 'string'
            },
            transferTimeFrom: {
                type: 'string'
            },
        },
        required: ['expectedDeliveryDate', 'transferTimeFrom'],
        additionalProperties: false
    },
};
