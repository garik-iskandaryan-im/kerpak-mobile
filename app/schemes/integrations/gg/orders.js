module.exports = {
    pay: {
        properties: {
            phone: {
                type: 'string'
            },
            kioskId: {
                type: 'number'
            },
            sessionId: {
                type: 'number'
            },
            total: {
                type: 'number'
            },
            productItems: {
                type: 'array',
                items: {
                    properties: {
                        barcode: {
                            type: 'string'
                        },
                        EAN5: {
                            type: 'string'
                        }
                    }
                }
            }
        },
        required: ['phone', 'kioskId', 'productItems', 'sessionId', 'total']
    },
    create: {
        properties: {
            kioskId: {
                type: 'number'
            },
            productItems: {
                type: 'array',
                items: {
                    properties: {
                        barcode: {
                            type: 'string'
                        },
                        EAN5: {
                            type: 'string'
                        }
                    }
                }
            }
        },
        required: ['kioskId', 'productItems']
    },
};