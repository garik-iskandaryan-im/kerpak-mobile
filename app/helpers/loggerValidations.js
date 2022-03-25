'use strict';

let log;

/**
 * Init log
 * @param {*} logger
 */
module.exports.use = (logger) => {
    log = logger;
};

/**
 * Using the app logger instance, log an info message
 * @param {array} args arguments list
 */
module.exports.info = (...args) => {
    return new Promise((resolve, reject) => {
        try {
            if (log.info) {
                log.info(...args);
            }
            return resolve();
        }
        catch (err) {
            return reject(err);
        }
    });
};

/**
 * Using the app logger instance, log a debug message
 * @param {array} args arguments list
 */
module.exports.debug = (...args) => {
    return new Promise((resolve, reject) => {
        try {
            if (log.debug) {
                log.debug(...args);
            }
            return resolve();
        }
        catch (err) {
            return reject(err);
        }
    });
};

/**
 * Using the app logger instance, log an warning message
 * @param {array} args arguments list
 */
module.exports.warn = (...args) => {
    return new Promise((resolve, reject) => {
        try {
            if (log.warn) {
                log.warn(...args);
            }
            return resolve();
        }
        catch (err) {
            return reject(err);
        }
    });
};

/**
 * Using the app logger instance, log an error message
 * @param {array} args arguments list
 */
module.exports.error = (...args) => {
    return new Promise((resolve, reject) => {
        try {
            if (log.error) {
                log.error(...args);
            }
            return resolve();
        }
        catch (err) {
            return reject(err);
        }
    });
};