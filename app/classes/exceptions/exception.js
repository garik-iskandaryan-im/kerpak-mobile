'use strict';

class Exception {

    constructor(error) {
        if (!error) {
            error = {};
        }

        this.name = error.name || 'Exception';
        this.message = error.message || 'An error has ocurred.';
        this.status = error.status || 500;
        /**
         * Some custom params if they exist
         */
        this.parameter = error.parameter;
        this.allowedParameters = error.allowedParameters;
        this.expiredAt = error.expiredAt;
        this.errors = error.errors;
        this.stack = error.stack;
    }
}

module.exports = Exception;