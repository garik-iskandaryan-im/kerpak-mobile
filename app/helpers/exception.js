'use strict';

const messages = require('app/helpers/messages');
const Exception = require('app/classes/exceptions/exception');

/**
 * Implement the base exception
 */
module.exports = {
    exception: (message) => {
        let exception = {
            name: 'Exception',
            message: message,
            status: 500
        };

        return new Exception(exception);
    },
    notAuthenticatedException: (ex) => {
        if (!ex) {
            ex = {};
        }
        let exception = {
            name: 'NotAuthenticatedException',
            message: ex.message || messages.validations.user.isNotAuthenticated(),
            status: 401,
            stack: ex.stack
        };

        return new Exception(exception);
    },
    invalidUserPasswordException: () => {
        let exception = {
            name: 'InvalidUserPasswordException',
            message: messages.validations.login.isInvalid(),
            status: 401
        };

        return new Exception(exception);
    },
    inactiveUserException: (email) => {
        let exception = {
            name: 'InactiveUserException',
            message: messages.validations.user.isNotActive(email),
            status: 401
        };

        return new Exception(exception);
    },
    expiredTokenException: (ex) => {
        let exception = {
            name: 'ExpiredTokenException',
            message: ex.message,
            expiredAt: ex.expiredAt,
            status: 401,
            stack: ex.stack
        };

        return new Exception(exception);
    },
    jsonWebTokenNotBeforeException: (ex) => {
        let exception = {
            name: 'JsonWebTokenNotBeforeException',
            message: ex.message,
            date: ex.date,
            status: 401,
            stack: ex.stack
        };

        return new Exception(exception);
    },
    jsonWebTokenInvalidException: () => {
        let exception = {
            name: 'JsonWebTokenInvalidException',
            message: messages.validations.user.isNotAuthenticated(),
            status: 500
        };

        return new Exception(exception);
    },
    jsonWebTokenException: (ex) => {
        let exception = {
            name: 'JsonWebTokenException',
            message: ex.message,
            status: 500,
            stack: ex.stack
        };

        return new Exception(exception);
    },
    schemeIsInvalidException: (ex) => {
        let exception = {
            name: 'SchemeIsInvalidException',
            message: messages.validations.scheme.isInvalid(),
            status: 422,
            errors: ex
        };

        return new Exception(exception);
    },
};