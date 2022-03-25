'use strict';

const bcrypt = require('bcrypt');
const saltRounds = 10;

/**
 * Generate a hashed string
 * @param {*} password
 */
module.exports.hash = (string) => {
    return bcrypt.hash(string, saltRounds)
        .then(function (hash) {
            return hash;
        });
};

/**
 * Compare a plain text password to a hashed password
 * @param {*} string
 * @param {*} hash
 */
module.exports.compare = (string, hash) => {
    return bcrypt.compare(string, hash);
};