const CONSTANTS = require('app/constants');

module.exports = {
    create: {
        properties: {
            name: {
                enum: CONSTANTS.DIETARY_MARKERS.map(marked => marked.id),
            }
        },
        required: []
    }
};