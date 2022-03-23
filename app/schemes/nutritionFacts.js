const CONSTANTS = require('app/constants');

module.exports = {
    create: {
        properties: {
            name: {
                type: 'string',
                maxLength: 255
            },
            value: {
                type: 'string',
                maxLength: 255
            }
        },
        required: []
    }
};