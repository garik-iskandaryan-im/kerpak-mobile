module.exports = {
    create: {
        properties: {
            rating: {
                type: 'integer',
                minimum: 1,
                maximum: 5,
            },
            message: {
                type: 'string',
                maxLength: 1024,
            },
            orderId: {
                type: 'number'
            },
        },
        required: ['rating', 'orderId']
    },
};
