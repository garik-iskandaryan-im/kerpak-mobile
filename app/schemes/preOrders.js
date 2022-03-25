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
    customerCancel: {
        properties: {
            declineReason: {
                type: 'string'
            },
        },
        required: ['declineReason'],
        additionalProperties: false
    },
};
