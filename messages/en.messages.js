'use strict';

const vsprintf = require('sprintf-js').vsprintf;

module.exports = {
    validations: {
        isNotFound: () => {
            return 'No content found';
        },
        isNull: () => {
            return 'Invalid null value.';
        },
        scheme: {
            isInvalid: () => {
                return 'Request scheme is invalid.';
            }
        },
        parameter: {
            isNotAllowed: (param, allowedParameters) => {
                return vsprintf('Given parameter {%s} is not in defined list of allowed parameters {%s}.', [param, allowedParameters]);
            }
        },
        user: {
            notFound: () => {
                return 'User not found exception.';
            },
            isNotActive: (user) => {
                return vsprintf('%s is not active.', user);
            },
            isNotAuthorized: (user) => {
                user = user || 'User';
                return vsprintf('%s is not authorized to access this resource.', user);
            },
            isNotAuthenticated: (user) => {
                user = user || 'User';
                return vsprintf('%s is not authenticated.', user);
            }
        },
        canNotCreateDeleteRight: (rightName) => {
            return vsprintf('Can not add %s right.', rightName);
        },

        canNotCreateViewAuditRight: (rightName) => {
            return vsprintf('Can not add %s right.', rightName);
        },

        username: {
            isNull: () => {
                return 'username cannot be null.';
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
        password: {
            matchesPrevious: () => {
                return 'Password must not match a previously used password.';
            },
            isScoredLow: () => {
                return 'Password is not strong enough.';
            },
            passwordPreviouslyUsed: () => {
                return 'This password has been previously used, choose another one.';
            }
        },
        login: {
            isInvalid: () => {
                return 'Invalid username or password.';
            }
        }
    }
};