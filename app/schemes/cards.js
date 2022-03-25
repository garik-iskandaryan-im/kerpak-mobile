const CONSTANTS = require('app/constants');
module.exports = {
    addCardByType: {
        properties: {
            consumerId: { type: 'number' },
            cardType: { type: 'string', enum: Object.values(CONSTANTS.CARD_TYPES) },
        },
        required: ['consumerId', 'cardType']
    }
};