const Got = require('got');
const {
    requestOptions,
    protocol,
    port,
    api: { TEMPERATURE, STATUS, TERMINAL_ID, DOOR_LOCK_STATUS, DOOR_LOCK, LOCK }
} = require('./constants');

const getTemperature = async (ip, options = requestOptions) => {
    return await Got.get(`${protocol}://${ip}${TEMPERATURE}`, options);
};

const getStatus = async (ip) => {
    return await Got.get(`${protocol}://${ip}${STATUS}`, requestOptions);
};

const getTerminalId = async (ip) => {
    return await Got.get(`${protocol}://${ip}${TERMINAL_ID}`, requestOptions);
};

const getDoorLockStatus = async (ip) => {
    return await Got.get(`${protocol}://${ip}${DOOR_LOCK_STATUS}`, requestOptions);
};

const setDoorLockStatus = async (ip, doorSessionId, lockDoor) => {
    return await Got.post(`${protocol}://${ip}${DOOR_LOCK}`, { ...requestOptions, json: { doorSessionId, lockDoor } });
};

const setDoorLock = async (ip, id) => {
    return await setDoorLockStatus(ip, id, true);
};

const setDoorUnLock = async (ip, id) => {
    return await setDoorLockStatus(ip, id, false);
};

const setLock = async (ip, lockFridge) => {
    return await Got.post(`${protocol}://${ip}${LOCK}`, { ...requestOptions, json: { lockFridge } });
};

module.exports = {
    getTemperature,
    getStatus,
    getTerminalId,
    getDoorLockStatus,
    setDoorLock,
    setDoorUnLock,
    setLock,
    setDoorLockStatus
};