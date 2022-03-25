const CONSTANTS = require('app/constants');

module.exports = {
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
    pay: {
        properties: {
            kioskId: {
                type: 'number'
            },
            sessionId: {
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
            },
        },
        required: ['kioskId', 'productItems', 'sessionId']
    },
    register: {
        properties: {
            kioskId: {
                type: 'number'
            },
            sessionId: {
                type: 'number'
            },
            cardType: {
                type: 'string', enum: Object.values(CONSTANTS.CARD_TYPES)
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
            },
        },
        required: ['kioskId', 'productItems', 'sessionId', 'cardType']
    },
    confirm: {
        properties: {
            orderId: {
                type: 'number'
            },
            consumerId: {
                type: 'number'
            },
            cardType: {
                type: 'string', enum: Object.values(CONSTANTS.CARD_TYPES)
            },
        },
        required: ['orderId', 'cardType', 'consumerId']
    },
    payCoffeemachineOrder: {
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
                        }
                    }
                }
            },
        },
        required: ['kioskId', 'productItems']
    }
};
