const {BAD_REQUEST} = require('http-status-codes');

const {ResponseError} = require('./ResponseError');

const validate = (schema, data) => {
    const {error, value} = schema.validate(data);
    if(error) {
        throw new ResponseError(error.message, BAD_REQUEST);
    }
    return value;
};

module.exports = {validate};