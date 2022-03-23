module.exports = {
    get: {
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    },
    create: {
        properties: {
            menuName: {
                type: 'string',
                maxLength: 255
            },
            description: {
                type: 'string',
                maxLength: 255
            },
            menuItems: {
                type: 'array',
                items: [{ type: 'number' }]
            }
        },
        required: ['menuName']
    },
    delete: {
        properties: {
            ids: {
                type: 'array',
                items: [{type: 'number'}]
            }
        },
        required: ['id']
    },
};