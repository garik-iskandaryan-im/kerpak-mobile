module.exports = {
    create: {
        properties: {
            phone: {
                type: 'string',
                maxLength: 255
            },
            registerCompleted: {
                type: 'boolean',
            },
            email: {
                type: 'string',
                maxLength: 255
            },
            firstName: {
                type: 'string',
                maxLength: 255
            },
            lastName: {
                type: 'string',
                maxLength: 255
            },
            country: {
                type: 'string',
                maxLength: 255
            },
            zipCode: {
                type: 'string',
                maxLength: 255
            },
            firebaseRegistrationToken: {
                type: ['string', 'null'],
            },
            OS: {
                type: 'string',
            }
        },
        required: [],
        additionalProperties: false
    }
};