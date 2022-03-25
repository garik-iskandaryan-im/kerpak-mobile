const Got = require('got');
const {
    requestOptions,
    protocol,
    api: { DOOR_LOCK }
} = require('./constants');

const setDoorLockStatus = async (ip, doorSessionId, lockDoor) => {
    return await Got.post(`${protocol}://${ip}${DOOR_LOCK}`, { ...requestOptions, json: { doorSessionId, lockDoor } });
};

const setDoorUnLock = async (ip, id) => {
    return await setDoorLockStatus(ip, id, false);
};
module.exports = { setDoorUnLock };