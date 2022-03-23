'use strict';

const Exception = require('./exception');

class SequelizeException extends Exception {

    constructor(error) {
        super();
        this.name = 'SQLException';//probably shouldn't reveal our orm of choice
        this.message = error.message || 'SQL errors';
        this.status = 500;
        this.errors = error.errors;
    }
}

module.exports = SequelizeException;