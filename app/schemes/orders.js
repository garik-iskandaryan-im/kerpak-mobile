const { BALANCE_TYPE } = require('app/constants');
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
    },
    payFromWeb: {
        properties: {
            kioskId: {
                type: 'number'
            },
            consumerId: {
                type: 'number'
            },
            cardId: {
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
        required: ['consumerId', 'cardId', 'kioskId', 'productItems']
    },
    refund: {
        properties: {
            balanceType: { type: 'string', enum: BALANCE_TYPE },
            balanceAmount: { type:'number', minimum: 0 },
            bankAmount: { type:'number', minimum: 0 },
        },
        required: ['balanceType'],
        additionalProperties: false
    }
};
