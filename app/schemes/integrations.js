module.exports = {
    get: {
        properties: {
            id: { type: 'number' }
        },
        required: ['id']
    },
    create: {
        properties: {
            name: { type: 'string' },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            criticalError: { type: 'boolean' },
        },
        required: ['name']

    },
    update: {
        properties: {
            name: { type: 'string' },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            criticalError: { type: 'boolean' },
        },
        required: []
    }
};