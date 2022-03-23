const {
    kiosks: Kiosks,
    kioskSessions: KioskSessions,
} = require('app/models/models');
const { device: deviceValidator } = require('app/schemes');
const { isSchemeValidSync } = require('app/helpers/validate');
const kioskAdapter = require('app/helpers/kiosk');
const log = require('app/helpers/logger');
const Ivideon = require('app/helpers/ivideon');
const { getTeltonikaHost } = require('app/services/teltonika');
const deviceManger = require('app/deviceManager/deviceManager.js');

module.exports.temperature = async (req, res) => {
    const ip = req.query.ip;
    const { isValid, errors } = isSchemeValidSync(deviceValidator.get, { ip });
    if (!isValid) {
        log.error(errors, 'device::controller::getTemperature');
        return res.status(400).json({ message: 'validation failed' });
    }
    const data = await kioskAdapter.getTemperature(ip);
    return res.json(data);

};

module.exports.status = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const kiosk = await Kiosks.findOne({ where: { id } });
        const {teltonikaRemoteAccessId, teltonikaHost, useTeltonika} = kiosk;
        if (!teltonikaRemoteAccessId) {
            return res.json({ message: 'Remote Access ID is empty', error: true });
        }
        let responce;
        let opStatus;
        try {
            const { body } = await kioskAdapter.getStatus(teltonikaHost);
            responce = body;
        } catch (err) {
            // after internet conection restoring teltonikaHost should re-created
            opStatus = 'fail';
        }
        if ('fail' === opStatus) {
            const resTel = await getTeltonikaHost(id, teltonikaRemoteAccessId);
            if (resTel.code && resTel.code === 1) {
                return res.json({ message: resTel.message, error: true});
            }
            if (resTel.code && resTel.code === 2) {
                return res.json({ message: resTel.message, error: true});
            }
            const { body } = await kioskAdapter.getStatus(teltonikaHost);
            responce = body;
        }
        responce.message = 'successfully connected';
        return res.json(responce);
    } catch (err) {
        return res.json({ message: 'No connection with device', error: true });
    }
};

module.exports.door = async (req, res) => {
    const ip = req.query.ip;
    const { isValid, errors } = isSchemeValidSync(deviceValidator.get, { ip });
    if (!isValid) {
        log.error(errors, 'device::controller::getDoorStatus');
        return res.status(400).json({ message: 'validation failed' });
    }
    const data = await kioskAdapter.getDoorLockStatus(ip);
    return res.json(data);
};

module.exports.setStatus = async (req, res) => {
    const { ip, lock } = req.query.ip;
    const { isValid, errors } = isSchemeValidSync(deviceValidator.setStatus, { ip, lock });
    if (!isValid) {
        log.error(errors, 'device::setStatus');
        return res.status(400).json({ message: 'validation failed' });
    }
    const data = await kioskAdapter.setLock(ip, lock);
    return res.json(data);
};

const closeSession = async (id, kioskSessionsId) => {
    await Kiosks.update({ isDoorOpened: false }, { where: { id } });
    await KioskSessions.update({ isSessionOpen: false }, { where: { id: kioskSessionsId } });
};

module.exports.openDoor = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { isValid, errors } = isSchemeValidSync(deviceValidator.openDoor, { id });
        if (!isValid) {
            log.error(errors, 'device::openDoor::validation');
            return res.status(400).json({ message: 'validation failed' });
        }
        const kiosk = await Kiosks.findOne({ where: { id } });
        const {ip, teltonikaRemoteAccessId, teltonikaHost, useTeltonika, useSocket} = kiosk;
        const sessionData = {
            kioskId: id,
            isSessionOpen: true,
            startDate: new Date().toLocaleString(),
            kioskName: kiosk.displayName,
            serviceProviderId: kiosk.serviceProviderId
        };
        sessionData.userId = req.user.id;
        const { id: kioskSessionsId } = await KioskSessions.create(sessionData);
        const lastActivity = sessionData.startDate;
        if (lastActivity) {
            await Kiosks.update({ lastActivity }, {
                where: { id: sessionData.kioskId },
            });
        }
        if (!kioskSessionsId) {
            return res.json({ kioskSessionsId });
        }
        await Ivideon.initializeTokens();
        await Ivideon.createEvent(kiosk.ivideonCameraId, kiosk.id, kioskSessionsId);
        let opStatus;
        if (useSocket) {
            try {
                const res = await deviceManger.openDoor(id);
                if (res.success) {
                    opStatus = 'pass';
                } else {
                    opStatus = 'fail';
                }
            } catch(err) {
                // TODO handle error
            }
        } else if (useTeltonika) {
            if (teltonikaRemoteAccessId) {
                try {
                    const { body: { operationStatus } } = await kioskAdapter.setDoorUnLock(teltonikaHost, kioskSessionsId);
                    opStatus = operationStatus;
                } catch (err) {
                    // after internet conection restoring teltonikaHost should re-created
                    opStatus = 'fail';
                }
                if ('fail' === opStatus) {
                    const res = await getTeltonikaHost(id, teltonikaRemoteAccessId);
                    const { body: { operationStatus } } = await kioskAdapter.setDoorUnLock(res.teltonikaHost, kioskSessionsId);
                    opStatus = operationStatus;
                }
            }
        } else if (ip) {
            const { body: { operationStatus } } = await kioskAdapter.setDoorUnLock(ip, kioskSessionsId);
            opStatus = operationStatus;
        }

        if ('pass' === opStatus) {
            await Kiosks.update({ isDoorOpened: true }, { where: { id } });
            setTimeout(closeSession, 10000, id, kioskSessionsId);
        } else if ('fail' === opStatus) {
            log.error('Kiosk open door fail', 'device::openDoor::fail');
            return res.status(400).json({ message: 'Kiosk open door fail' });
        }
        return res.json({ kioskSessionsId });
    } catch (error) {
        log.error(error, 'device::controller::openDoor');
        return res.status(400).json({ message: 'Kiosk open door fail' });
    }
};

module.exports.getVideo = async (req, res) => {
    try {
        const { videoId, sessionId } = req.query;
        const { isValid, errors } = isSchemeValidSync(deviceValidator.getVideo, { sessionId, videoId });
        if (!isValid) {
            log.error(errors, 'device::controller::getVideo::validation');
            return res.status(400).json({ message: 'validation failed' });
        }
        await Ivideon.initializeTokens();
        let publicUrl = null;
        const { body: { result: { clip } = {}, ...rest } = {} } = await Ivideon.getEvent(videoId) || {};
        if (clip) {
            await KioskSessions.update({ clip }, { where: { id: sessionId } });
            publicUrl = await Ivideon.getPublicURL(clip);
        }
        return res.json({ success: true, clip: publicUrl });
    } catch (error) {
        log.error(error, 'device::getVideo::server error');
        return res.status(500).json({ error, success: false });
    }
};
