const CONSTANTS = require('app/constants');

module.exports = {
    create: {
        properties: {
            weekDay: {
                enum: CONSTANTS.WEEK_DAYS.map(marker => marker.id),
            },
            timeFrom: {
                type: 'string',
            },
            timeTo: {
                type: 'string',
            },
        },
        required: []
    }
};