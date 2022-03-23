const {
    kiosks: Kiosks,
    temperatureLogs: TemperatureLogs,
    preOrders: PreOrders,
    consumers: Consumers
} = require('app/models/models');
const { Op } = require('sequelize');

const kiosk = require('./index');
const loggerConnections = require('app/helpers/loggerConnections');
const log = require('app/helpers/logger');

const { interval } = require('./constants');
const { getTeltonikaHost } = require('app/services/teltonika');
const { checkTemperatureLog, checkSocketConnection } = require('app/helpers/kiosk/common');
const { sendNotification } = require('app/services/firebase');
const { PRE_ORDER_STATUS } = require('app/constants');
const fs = require('fs');
const path = require('path');

const ACTIVE_STATUS = 'active';
let monitoringWasStarted = false;

const getKioksStatus = async (teltonikaHost, kioskId) => {
    try {
        const { body: obj } = await kiosk.getTemperature(teltonikaHost);
        let temperature = null;
        try {
            temperature = Number(obj.fridgeTemperature).toFixed(1);
            await TemperatureLogs.create({ kioskId: kioskId, error: false, temperature });
        } catch (err) {
            await TemperatureLogs.create({
                kioskId: id,
                error: true,
                errorMessage: err?.response?.body?.fridgeTemperature || err.message
            });
        }
        await Kiosks.update({ temperature, connected: true}, { where: { id: kioskId } });
        return true;
    } catch (err) {
        let connected = false
        if (err?.response?.body?.fridgeTemperature) {
            connected = true;
        }
        await Kiosks.update({ temperature: null, connected}, { where: { id: kioskId } });
        await TemperatureLogs.create({
            kioskId: kioskId,
            error: true,
            errorMessage: err?.response?.body?.fridgeTemperature || err.message
        });
        loggerConnections.error(err, 'kiosk::worker::getKioksStatus');
        return false;
    }
}

const getStatusByCreatingNewAccess = async (kioskId, teltonikaRemoteAccessId) => {
    try {
        const res = await getTeltonikaHost(kioskId, teltonikaRemoteAccessId);
        if (!res.success) {
            return false;
        } else {
            const resStatus = await getKioksStatus(res.teltonikaHost, kioskId);
            if (!resStatus.success) {
                return false;
            }
        }
        return true;
    } catch (err) {
        loggerConnections.error(err, 'kiosk::worker::getStatusByCreatingNewAccess');
        return false;
    }
}

const checkConnectivity = async () => {
    const kiosks = await Kiosks.findAll({ where: { status: ACTIVE_STATUS } });
    if (kiosks && Array.isArray(kiosks)) {
        for (const kiosk of kiosks) {
            const { ip, id, teltonikaRemoteAccessId, teltonikaHost, useTeltonika, temperatureEmail, connectionEmail, displayName, serviceProviderId, useSocket, isCoffeeMachine } = kiosk;
            if (isCoffeeMachine) {
                continue;
            }
            if (useTeltonika) {
                if (teltonikaRemoteAccessId) {
                    try {
                        let success;
                        if (teltonikaHost) {
                            success = await getKioksStatus(teltonikaHost, id);
                            if (!success) {
                                success = await getStatusByCreatingNewAccess(id, teltonikaRemoteAccessId);
                            }
                        } else {
                            success = await getStatusByCreatingNewAccess(id, teltonikaRemoteAccessId);
                        }
                    } catch (err) {
                        loggerConnections.error(err, 'kiosk::worker::getStatus');
                    }
                }
            } else if (useSocket) {
                await checkSocketConnection(id, connectionEmail, displayName, serviceProviderId);
            } else if (ip) {
                await getKioksStatus(ip, id);
            }
            if ((useTeltonika && teltonikaRemoteAccessId) || ip || useSocket) {
                await checkTemperatureLog(id, temperatureEmail, displayName, serviceProviderId);
            }
        }
    }
};

const sendNotificationWithInterval = async () => {
    try {
        const condition = {
            notificationStatus: 'notSent',
            status: { [Op.in]: PRE_ORDER_STATUS.consumerScanPermission },
            deliveryDate: { [Op.lte]: new Date(Date.now() - (2 * 60 * 60 * 1000)) }
        };
        const preOrders = await PreOrders.findAll(
            {
                attributes: [ 'id', 'consumerId'],
                where: condition,
                include: [
                    { model: Consumers, attributes: ['firebaseRegistrationToken'] },
                ],
            }
        );
        if (!preOrders.length) {
            return;
        }
        const missingIds = [];
        const failedIds = [];
        const successIds = [];
        const firebaseRegistrationTokens = [];
        preOrders.forEach(preOrder => {
            if (preOrder.consumer.firebaseRegistrationToken) {
                if (!firebaseRegistrationTokens.includes(preOrder.consumer.firebaseRegistrationToken)) {
                    firebaseRegistrationTokens.push(preOrder.consumer.firebaseRegistrationToken);
                }
            } else {
                missingIds.push(preOrder.id);
            }
        });
        if (firebaseRegistrationTokens.length) {
            const template = fs.readFileSync(path.resolve('app/helpers/notifications/templates/preOrders/readyPreOrder.txt'), 'utf8').toString();
            const { failedTokens, successTokens } = await sendNotification(null, template, firebaseRegistrationTokens);
            preOrders.forEach(preOrder => {
                if (failedTokens.find(token => token === preOrder.consumer.firebaseRegistrationToken)) {
                    failedIds.push(preOrder.id);
                }
                if (successTokens.find(token => token === preOrder.consumer.firebaseRegistrationToken)) {
                    successIds.push(preOrder.id);
                }
            });
        }
        const allFailedIds = [...missingIds, ...failedIds];
        if (allFailedIds.length) {
            await PreOrders.update(
                { notificationStatus: 'fail' },
                { where: { id: { [Op.in]: allFailedIds } } }
            );
        }
        if (successIds.length) {
            await PreOrders.update(
                { notificationStatus: 'sent' },
                { where: { id: { [Op.in]: successIds } } }
            );
        }
    } catch (err) {
        log.error(err, 'worker::sendNotificationWithInterval');
    }
};

const start = async () => {
    if (monitoringWasStarted) {
        return false;
    }
    monitoringWasStarted = true;
    return setInterval(async () => {
        await checkConnectivity();
        await sendNotificationWithInterval();
    }, interval);
};

module.exports = {
    start,
};