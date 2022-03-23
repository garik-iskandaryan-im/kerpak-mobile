const {
    kiosks: Kiosks,
    consumers: Consumers,
    kioskSessions: KioskSessions,
    serviceProviders: ServiceProviders,
} = require('app/models/models');
const { device: deviceValidator } = require('app/schemes/integrations/gg');
const { isSchemeValidSync } = require('app/helpers/validate');
const kioskAdapter = require('app/helpers/kiosk');
const log = require('app/helpers/logger');
const Ivideon = require('app/helpers/ivideon');
const deviceManger = require('app/deviceManager/deviceManager.js');
const { getTeltonikaHost } = require('app/services/teltonika');

const closeSession = async (id, kioskSessionsId) => {
    await Kiosks.update({ isDoorOpened: false }, { where: { id } });
    await KioskSessions.update({ isSessionOpen: false }, { where: { id: kioskSessionsId } });
};

/**
 * @swagger
 * /integrations/gg/devices/{id}/opendoor:
 *   put:
 *     tags:
 *       - GG
 *     summary: Open door
 *     description: ''
 *     parameters:
 *      - in: path
 *        name: id
 *        description: Kiosk ID
 *        required: true
 *        type: number
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *       - bearerAuth: []
 */
module.exports.openDoor = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { isValid, errors } = isSchemeValidSync(deviceValidator.openDoor, { id, ...req.body });
        if (!isValid) {
            log.error(errors, 'device::openDoor::validation');
            return res.status(400).json({ message: 'validation failed' });
        }
        const { phone } = req.body;
        const user = await Consumers.findOne({ where: { phone } });
        let consumerId;
        if (!user) {
            const newUser = await Consumers.create({ phone });
            consumerId = newUser.id;
        } else {
            consumerId = user.id;
        }
        const kiosk = await Kiosks.findOne({
            where: { id },
            include: [
                {
                    model: ServiceProviders,
                    attributes: ['isGg']
                }
            ],
            raw: true
        });
        if (!kiosk['serviceProvider.isGg']) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const {ip, teltonikaRemoteAccessId, teltonikaHost, useTeltonika, useSocket} = kiosk;
        const sessionData = {
            kioskId: id,
            isSessionOpen: true,
            startDate: new Date().toLocaleString(),
            kioskName: kiosk.displayName,
            serviceProviderId: kiosk.serviceProviderId,
            integration: 'gg'
        };
        sessionData.consumerId = consumerId;
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
        log.error(error, 'device::openDoor::server error');
        return res.status(500).json({ message: 'Kiosk open door fail' });
    }
};