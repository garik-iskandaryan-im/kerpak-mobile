module.exports = {
    get: {
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    },
    create: {
        properties: {
            paymentType: {
                type: 'number',
            },
            paymentProvider: {
                type: 'number',
            },
            providerStatus: {
                type: 'number',
            },
            providerOrderId: {
                type: 'string',
                maxLength: 255,
            },
            description: {
                type: 'string',
                maxLength: 255,
            },
            amount: {
                type: 'number',
            },
            status: {
                type: 'number',
            },
            errorCode: {
                type: 'number',
            },
            error: {
                type: 'string',
                maxLength: 255,
            },
            mdOrder: {
                type: 'string',
                maxLength: 255,
            },
        },
        required: [
            'paymentType',
            'paymentProvider',
            'amount'
        ]
    },
};
