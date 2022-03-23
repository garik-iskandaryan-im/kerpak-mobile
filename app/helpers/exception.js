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
    invalidEmailException: (email) => {

        let exception = {
            name: 'InvalidEmailException',
            message: messages.validations.email.isInvalid(email),
            status: 422
        };

        return new Exception(exception);
    },
    invalidParameterException: (parameter, allowedParameters) => {

        let exception = {
            name: 'InvalidParameterException',
            message: messages.validations.parameter.isNotAllowed(parameter, allowedParameters),
            status: 422,
            parameter: parameter,
            allowedParameters: allowedParameters
        };

        return new Exception(exception);
    },
    notAuthenticatedException: (ex) => {
        if(!ex) {
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
    invalidUserPasswordException: (email) => {
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
    userChangingPasswordException: (email) => {
        let exception = {
            name: 'UserChangingPasswordException',
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
    userLoginNotFoundException: () => {
        let exception = {
            name: 'UserLoginNotFoundException',
            message: messages.validations.login.isInvalid(),
            status: 401
        };

        return new Exception(exception);
    },
    invalidResetPasswordException: () => {
        let exception = {
            name: 'InvalidResetPasswordException',
            message: messages.validations.isNotFound(),
            status: 500
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
    notAuthorizedException: (email) => {
        let exception = {
            name: 'NotAuthorizedException',
            message: messages.validations.user.isNotAuthorized(email),
            status: 403
        };

        return new Exception(exception);
    },
    nullException: () => {
        let exception = {
            name: 'NullValueException',
            message: messages.validations.isNull(),
            status: 422
        };

        return new Exception(exception);
    },
    noContentFoundException: () => {
        let exception = {
            name: 'NoContentFoundException',
            message: messages.validations.isNotFound(),
            status: 204
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
    lowPasswordScoreException: (ex) => {
        let exception = {
            name: 'LowPasswordScoreException',
            message: messages.validations.password.isScoredLow(),
            status: 422,
            errors: ex
        };

        return new Exception(exception);
    },
    previouslyUsedPasswordException: () => {
        let exception = {
            name: 'PreviouslyUsedPasswordException',
            message: messages.validations.password.passwordPreviouslyUsed(),
            status: 422,
        };

        return new Exception(exception);
    }
};