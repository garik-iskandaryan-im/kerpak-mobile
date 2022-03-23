'use strict';

const CONSTANTS = require('app/constants');

module.exports = {
    postLogin: {
        type: 'object',
        properties: {
            email: {type: 'string', format: 'email'},
            password: {type: 'string'}
        },
        required: ['email', 'password']
    },
    postLoginSMS: {
        type: 'object',
        properties: {
            phone: {type: 'string'},
            code: {type: 'string'}
        },
        required: ['phone', 'code']
    },
    postLoginEmail: {
        type: 'object',
        properties: {
            phone: {type: 'string'},
            email: {type: 'string'},
            code: {type: 'string'},
        },
        required: ['phone', 'email', 'code']
    },
    refreshToken: {
        type: 'object',
        properties: {
            phone: {type: 'string'},
        },
        required: ['phone']
    },
    registerConsumer: {
        type: 'object',
        properties: {
            phone: {type: 'string'},
            hash: {type: 'string'}
        },
        required: ['phone']
    },
    registerConsumerByEmail: {
        type: 'object',
        properties: {
            phone: {type: 'string'},
            email: {type: 'string'},
        },
        required: ['phone', 'email']
    },
    postReset: {
        type: 'object',
        properties: {
            email: {type: 'string', format: 'email'}
        },
        required: ['email']
    },
    userToken: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                enum: [
                    CONSTANTS.JSON_TOKEN_TYPES.USER_AUTH,
                    CONSTANTS.JSON_TOKEN_TYPES.CONSUMER_AUTH,
                    CONSTANTS.JSON_TOKEN_TYPES.USER_SET_PASSWORD,
                    CONSTANTS.JSON_TOKEN_TYPES.USER_REGISTER
                ]
            },
            user: {
                type: 'object',
                properties: {
                    id: {type: 'integer'}
                },
                required: ['id']
            },
            iat: {type: 'integer'},
            exp: {type: 'integer'},
            iss: {type: 'string'}
        },
        required: ['type', 'user', 'iat', 'exp', 'iss']
    }
};