'use strict';

module.exports = {
    getUser: {
        user: {
            type: 'object',
            properties: {
                guid: {type: 'string', format: 'uuid'}
            },
            required: ['guid']
        },
        required: ['user']
    },
    getUserByEmail: {
        user: {
            type: 'object',
            properties: {
                email: {type: 'string', format: 'email'}
            },
            required: ['email']
        },
        required: ['user']
    },
    deleteUser: {
        properties: {
            id: { type: 'number' }
        },
        required: ['id']
    },
    putUser: {
        properties: {
            id: {type: 'number'},
            firstName: {type: 'string'},
            lastName: {type: 'string'},
            email: {type: 'string', format: 'email'},
            phone: { type: 'string' },
            isChangingPassword: {type: 'boolean'},
            isKerpakOperator: {type: 'boolean'},
            serviceProviderId: {type: ['string', 'null']},
        },
        required: [ 'firstName', 'lastName', 'email'],
        additionalProperties: false
    },
    changeUserPassword: {
        properties: {
            currentPassword: {type: 'string'},
            newPassword: {type: 'string'},
            repeatNewPassword: {type: 'string'},
        },
        required: [ 'currentPassword', 'newPassword', 'repeatNewPassword'],
        additionalProperties: false
    },
    changePassword: {
        properties: {
            email: {type: 'string'},
            oldPassword: {type: 'string'},
            newPassword: {type: 'string'},
            repeatNewPassword: {type: 'string'},
        },
        required: [ 'email', 'oldPassword', 'newPassword', 'repeatNewPassword'],
        additionalProperties: false
    },
    changePasswordByToken: {
        properties: {
            token: {type: 'string'},
            newPassword: {type: 'string'},
            repeatNewPassword: {type: 'string'},
        },
        required: [ 'token', 'newPassword', 'repeatNewPassword'],
        additionalProperties: false
    },
    resetPassword: {
        properties: {
            email: {type: 'string'},
        },
        required: [ 'email' ]
    },
    createUser: {
        properties: {
            firstName: {
                type: 'string',
                maxLength: 255
            },
            lastName: {
                type: 'string',
                maxLength: 255
            },
            isKerpakOperator: {
                type: 'boolean'
            },
            serviceProviderId: {
                type: ['string', 'null'],
            },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
        },
        required: ['firstName', 'lastName', 'email'],
        additionalProperties: false
    },
    inviteUser: {
        properties: {
            firstName: {
                type: 'string',
                maxLength: 255
            },
            lastName: {
                type: 'string',
                maxLength: 255
            },
            isKerpakOperator: {
                type: 'boolean'
            },
            serviceProviderId: {
                type: 'string',
            },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
        },
        required: ['firstName', 'lastName', 'email', 'serviceProviderId'],
        additionalProperties: false
    },
};