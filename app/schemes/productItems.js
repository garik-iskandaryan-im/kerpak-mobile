module.exports = {
    check: {
        properties: {
            spID: { type: 'number' },
            EAN13: {
                type: 'string',
                minLength: 13,
                maxLength: 13
            },
            EAN5: {
                type: 'string',
                minLength: 5,
                maxLength: 5
            },
        },
        required: ['spID', 'EAN13', 'EAN5']
    },
};
