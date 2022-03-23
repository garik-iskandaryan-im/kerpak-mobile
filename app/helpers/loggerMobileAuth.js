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
 * Using the app logger instance, log an error message
 * @param {array} args arguments list
 */
module.exports.error = (err, req, msg) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const consumerId = req.user ? req.user.id : null;
    const url = req.url;
    console.log('err1', err);
    const body = req.body;
    const errObject = {
        err: err,
        extraInfo: {
            ip,
            consumerId,
            body,
            url
        }
    };
    console.log('errObject', errObject);
    return new Promise((resolve, reject) => {
        try {
            if(log.error) {
                log.error(errObject, msg);
            }
            return resolve();
        }
        catch(err) {
            return reject(err);
        }
    });
};