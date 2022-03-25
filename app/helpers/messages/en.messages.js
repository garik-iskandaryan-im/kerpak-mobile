'use strict';

const vsprintf = require('sprintf-js').vsprintf;

module.exports = {
    validations: {
        scheme: {
            isInvalid: () => {
                return 'Request scheme is invalid.';
            }
        },
        user: {
            isNotActive: (user) => {
                return vsprintf('%s is not active.', user);
            },
            isNotAuthenticated: (user) => {
                user = user || 'User';
                return vsprintf('%s is not authenticated.', user);
            }
        },
        login: {
            isInvalid: () => {
                return 'Invalid username or password.';
            }
        },
        email: {
            isInvalid: (email) => {
                email = email || 'The email address provided';
                return vsprintf('%s is an invalid email address.', email);
            },
            isNotUnique: (email) => {
                return vsprintf('%s already exists.', email);
            }
        },
    }
};