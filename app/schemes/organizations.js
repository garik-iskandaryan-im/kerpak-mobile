module.exports = {
    addGroupOrMembers: {
        properties: {
            name: { type: 'string' },
            organizationId: { type: 'number' },
            ids: {
                type: 'array',
                items: [{ type: 'number' }]
            }
        },
        required: ['name', 'ids'],
        additionalProperties: false
    },
};