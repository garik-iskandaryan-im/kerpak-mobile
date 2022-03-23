const {INTERNAL_SERVER_ERROR} = require('http-status-codes');

class ResponseError {
    constructor(message, status, errors) {
        this.message = message;
        this.status = status || INTERNAL_SERVER_ERROR;
        this.errors = errors;
    }
}

module.exports = {ResponseError};
