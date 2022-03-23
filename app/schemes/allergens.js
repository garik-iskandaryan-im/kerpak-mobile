const CONSTANTS = require('app/constants');

module.exports = {
    create: {
        properties: {
            name: {
                enum: CONSTANTS.ALLERGENS.map(allegen => allegen.id),
            }
        },
        required: []
    }
};