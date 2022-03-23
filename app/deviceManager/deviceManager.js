const socket = require('./socket.js');
const socketTrafficSaving = require('./socketTrafficSaving.js');
const connectionLogs = require('app/controllers/connectionLogs');
const {
    temperatureLogs: TemperatureLogs,
    kiosks: Kiosks,
} = require('app/models/models');
const { checkTemperatureLog } = require('app/helpers/kiosk/common');
const log = require('app/helpers/logger');
const {TRAFFIC_SAVING: {INTERVAL_TEMPERATURE: INTERVAL_TEMPERATURE, INTERVAL_DOOR: INTERVAL_DOOR} } = require('app/settings');

const ACTIVE_STATUS = 'active';
const CONNECTION = 'connection';
const DISCONNECT = 'disconnect';

const devices = {};
const doorStatus = {};
let checkingInterval = {};

const openDoorPromise = (uniqueId) => new Promise((resolve, reject) => {
    try {
        let i = 0;
        checkingInterval[uniqueId] = setInterval(() => {
            i++;
            if (i > 50) {
                clearInterval(checkingInterval[uniqueId]);
                reject({success: false, message: 'Connection error. Could not open door in 5 second.'});
            } else if (doorStatus[uniqueId].action === 'responded') {
                if (doorStatus[uniqueId].status) {
                    clearInterval(checkingInterval[uniqueId]);
                    resolve({success: true, message: 'Door successfully opened.'})
                } else {
                    clearInterval(checkingInterval[uniqueId]);
                    reject({success: false, message: doorStatus[uniqueId].error || 'Could not open door.'})
                }
            }
        }, 100);
    } catch (err) {
        log.error(err, 'deviceManager::openDoorPromise::Important::possible memory leak');
        reject({success: false, message: 'Could not open door.'})
    }
});

const getIOClient = async (kioskId) => {
    const { useTrafficSaving } = await Kiosks.findOne({ where: { id: kioskId}});
    let io;
    if (useTrafficSaving) {
        io = socketTrafficSaving.getio();
    } else {
        io = socket.getio();
    }
    return {io: io, useTrafficSaving: useTrafficSaving};
}

module.exports = {
    init: function() {
        const io = socket.getio();
        io.on('connection', function(socket) {
            socket.on('initializing', async (kioskId) => {
                const kiosk = await Kiosks.findOne({ where: { id: kioskId, status: ACTIVE_STATUS, useSocket: true } });
                devices[kioskId] = socket.id;
                if (!kiosk) {
                    return io.to(socket.id).emit('disallowConnection');
                }
                await connectionLogs.create(CONNECTION, kioskId);
                await Kiosks.update({ connected: true }, { where: { id: kioskId, status: ACTIVE_STATUS, useSocket: true } });
                io.to(socket.id).emit('allowConnection');
            });
            socket.on('temperature', async (obj) => {
                const kiosk = await Kiosks.findOne({ where: { id: obj.kioskId, status: ACTIVE_STATUS, useSocket: true } });
                if (!kiosk) {
                    return false;
                }
                const { id, temperatureEmail, displayName, serviceProviderId, isTempSensorError, isPortError } = kiosk;
                await TemperatureLogs.create({ kioskId: obj.kioskId, temperature: Number(obj.temperature).toFixed(1), error: false });
                await checkTemperatureLog(id, temperatureEmail, displayName, serviceProviderId);
                let payload = {temperature: Number(obj.temperature).toFixed(1)};
                if (isTempSensorError) {
                    payload.isTempSensorError = false;
                }
                if (isPortError) {
                    payload.isPortError = false;
                }
                await Kiosks.update(payload, { where: { id: obj.kioskId, status: ACTIVE_STATUS, useSocket: true } });
            });
            socket.on('issueTempSensor', async (obj) => {
                await Kiosks.update({ isTempSensorError: true }, { where: { id: obj.kioskId, status: ACTIVE_STATUS, useSocket: true } });
            });
            socket.on('issuePort', async (obj) => {
                await Kiosks.update({ isPortError: true, portError: obj.msg }, { where: { id: obj.kioskId, status: ACTIVE_STATUS, useSocket: true } });
            });
            socket.on('openDoorResponse', async (obj) => {
                doorStatus[obj.uniqueId].action = 'responded';
                doorStatus[obj.uniqueId].status = obj.status;
                doorStatus[obj.uniqueId].error = obj.error || null;
            });
            socket.on('disconnect', async function () {
                const currKioskId = Object.keys(devices).find(key => devices[key] === socket.id);
                delete devices[currKioskId];
                await connectionLogs.create(DISCONNECT, currKioskId);
                await Kiosks.update({ connected: false }, { where: { id: currKioskId, status: ACTIVE_STATUS, useSocket: true } });
            });
            socket.emit('reinitialize')
        });
        const ioSocketTrafficSaving = socketTrafficSaving.getio();
        ioSocketTrafficSaving.on('connection', function(socket) {
            socket.on('initializing', async (kioskId) => {
                const kiosk = await Kiosks.findOne({ where: { id: kioskId, status: ACTIVE_STATUS, useSocket: true } });
                devices[kioskId] = socket.id;
                if (!kiosk) {
                    return ioSocketTrafficSaving.to(socket.id).emit('disallowConnection');
                }
                await connectionLogs.create(CONNECTION, kioskId);
                await Kiosks.update({ connected: true }, { where: { id: kioskId, status: ACTIVE_STATUS, useSocket: true } });
                ioSocketTrafficSaving.to(socket.id).emit('allowConnection', INTERVAL_TEMPERATURE, INTERVAL_DOOR);
            });
            socket.on('temperature', async (obj) => {
                const kiosk = await Kiosks.findOne({ where: { id: obj.kioskId, status: ACTIVE_STATUS, useSocket: true } });
                if (!kiosk) {
                    return false;
                }
                const { id, temperatureEmail, displayName, serviceProviderId, isTempSensorError, isPortError } = kiosk;
                await TemperatureLogs.create({ kioskId: obj.kioskId, temperature: Number(obj.temperature).toFixed(1), error: false });
                await checkTemperatureLog(id, temperatureEmail, displayName, serviceProviderId);
                let payload = {temperature: Number(obj.temperature).toFixed(1)};
                if (isTempSensorError) {
                    payload.isTempSensorError = false;
                }
                if (isPortError) {
                    payload.isPortError = false;
                }
                await Kiosks.update(payload, { where: { id: obj.kioskId, status: ACTIVE_STATUS, useSocket: true } });
            });
            socket.on('issueTempSensor', async (obj) => {
                await Kiosks.update({ isTempSensorError: true }, { where: { id: obj.kioskId, status: ACTIVE_STATUS, useSocket: true } });
            });
            socket.on('issuePort', async (obj) => {
                await Kiosks.update({ isPortError: true, portError: obj.msg }, { where: { id: obj.kioskId, status: ACTIVE_STATUS, useSocket: true } });
            });
            socket.on('openDoorResponse', async (obj) => {
                doorStatus[obj.uniqueId].action = 'responded';
                doorStatus[obj.uniqueId].status = obj.status;
                doorStatus[obj.uniqueId].error = obj.error || null;
            });
            socket.on('doorStatus', async (obj) => {
                // TODO: keep status for handling door open/close
            });
            socket.on('disconnect', async function () {
                const currKioskId = Object.keys(devices).find(key => devices[key] === socket.id);
                delete devices[currKioskId];
                await connectionLogs.create(DISCONNECT, currKioskId);
                await Kiosks.update({ connected: false }, { where: { id: currKioskId, status: ACTIVE_STATUS, useSocket: true } });
            });
            socket.emit('reinitialize')
        });
    },
    sendMessage: async function(kioskId) {
        const {io} = await getIOClient(kioskId);
        const sessionID = devices[kioskId];
        io.to(sessionID).emit('openDoor');
    },
    openDoor: async function(kioskId, firebaseRegistrationToken) {
        const {io, useTrafficSaving} = await getIOClient(kioskId);
        const sessionID = devices[kioskId];
        let uniqueId = new Date().getTime();
        while (doorStatus[uniqueId] !== undefined) {
            uniqueId = new Date().getTime();
        }
        doorStatus[uniqueId] = {action: 'sent'};
        io.to(sessionID).emit('openDoorAction', uniqueId, firebaseRegistrationToken);

        try {
            const res = await openDoorPromise(uniqueId);
            delete checkingInterval[uniqueId];
            delete doorStatus[uniqueId];
            return res;
        } catch(err) {
            delete checkingInterval[uniqueId];
            delete doorStatus[uniqueId];
            return err;
        }
    },
    disallowConnection: async function(kioskId) {
        const {io} = await getIOClient(kioskId);
        const sessionID = devices[kioskId];
        if (sessionID) {
            io.to(sessionID).emit('disallowConnection');
            await connectionLogs.create(DISCONNECT, kioskId);
            await Kiosks.update({ connected: false }, { where: { id: kioskId } });
        }
    },
    allowConnection: async function(kioskId) {
        const {io, useTrafficSaving} = await getIOClient(kioskId);
        const sessionID = devices[kioskId];
        if (sessionID) {
            await connectionLogs.create(CONNECTION, kioskId);
            await Kiosks.update({ connected: true }, { where: { id: kioskId } });
            if (useTrafficSaving) {
                io.to(sessionID).emit('allowConnection', INTERVAL_TEMPERATURE, INTERVAL_DOOR);
            } else {
                io.to(sessionID).emit('allowConnection');
            }
        }
    }
}
