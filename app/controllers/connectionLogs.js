const {
    connectionLogs: ConnectionLogs,
} = require('app/models/models');
const log = require('app/helpers/logger');

module.exports.create = async (type, kioskId) => {
    try {
        let payload = {
            kioskId,
            connectedAt: type === 'connection' ? new Date() : null,
            disconnectedAt: type === 'disconnect' ? new Date() : null
        };
        await ConnectionLogs.create(payload);
    } catch(err) {
        log.error('Error in create ConnectionLogs');
    }
};
