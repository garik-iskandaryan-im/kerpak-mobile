const Got = require('got');
const {
    kiosks: Kiosks,
    consumers: Consumers,
    kioskSessions: KioskSessions,
} = require('app/models/models');
const { device: deviceValidator } = require('app/schemes');
const { isSchemeValid } = require('app/helpers/validate');
const kioskAdapter = require('app/helpers/kiosk');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');
const Ivideon = require('app/helpers/ivideon');
const { getTeltonikaHost } = require('app/services/teltonika');

const closeSession = async (id, kioskSessionsId) => {
    await Kiosks.update({ isDoorOpened: false }, { where: { id } });
    await KioskSessions.update({ isSessionOpen: false }, { where: { id: kioskSessionsId } });
};

/**
 * @swagger
 * /mobile/device/opendoor/{id}:
 *   put:
 *     tags:
 *       - Private - Device
 *     summary: Open door
 *     description: ''
 *     parameters:
 *      - in: path
 *        name: id
 *        description: Kiosk ID
 *        required: true
 *        type: number
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.openDoor = async (req, res) => {
    try {
        const id = Number(req.params.id);
        try {
            await isSchemeValid(deviceValidator.openDoor, { id });
        } catch (err) {
            loggerValidations.error(err, 'device::openDoor::validation');
            return res.status(400).json({ err, message: 'validation error' });
        }
        const kiosk = await Kiosks.findOne({ where: { id } });
        const { ip, teltonikaRemoteAccessId, teltonikaHost, useTeltonika, useSocket } = kiosk;
        const sessionData = {
            kioskId: id,
            isSessionOpen: true,
            startDate: new Date().toLocaleString(),
            kioskName: kiosk.displayName,
            serviceProviderId: kiosk.serviceProviderId
        };
        sessionData.consumerId = req.user.id;
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
                const consumer = await Consumers.findOne({ where: { id: req.user.id } });
                const res = await Got.put('http://localhost:4000/api/mobile/device/opendoor', {
                    headers: {
                        authorization: req.headers.authorization,
                    },
                    json: {
                        kioskId: id,
                        firebaseRegistrationToken: consumer.firebaseRegistrationToken
                    },
                    responseType: 'json'
                }).json();
                if (res.success) {
                    opStatus = 'pass';
                } else {
                    opStatus = 'fail';
                }
            } catch (err) {
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
            } else {
                return res.status(400).json({ message: 'Kiosk open door fail' });
            }
        } else if (ip) {
            const { body: { operationStatus } } = await kioskAdapter.setDoorUnLock(ip, kioskSessionsId);
            opStatus = operationStatus;
        } else {
            return res.status(400).json({ message: 'Kiosk open door fail' });
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
        log.error(error, 'device::openDoor');
        return res.status(500).json({ message: 'Kiosk open door fail' });
    }
};
