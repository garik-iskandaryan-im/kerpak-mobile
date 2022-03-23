const {
    kiosks: Kiosks,
    kiosksTemperatureStatus: KiosksTemperatureStatus,
    kiosksUnstableConnectionStatus: KiosksUnstableConnectionStatus,
    temperatureLogs: TemperatureLogs,
    connectionLogs: ConnectionLogs,
    serviceProviders: ServiceProviders,
} = require('app/models/models');
const {
    getEmailBody,
    sendEmail,
    getConnectionEmailBody,
    getCriticalEmailBody,
    getConnectionUnstableIssueEmailBody,
    getConnectionUnstableRecoverEmailBody,
    getConnectionUnstableCriticalIssueEmailBody,
} = require('app/helpers/email/adapters/aws');
const { getSPUsersEmails, getOperatorsEmails } = require('app/helpers/email/service');
const { Op } = require('sequelize');
const {collectDateString} = require('app/helpers/utils');
const moment = require('moment');

const checkForCriticalIssue = async (id, displayName, temperatureLogs, SPOwnerEmail, kerpakOperatorEmails, timezone) => {
    const currentDate = new Date();
    let lastActionDate = new Date(currentDate.getTime() - 45 * 60 * 1000);
    let isCriticalAlert = await KiosksTemperatureStatus.findOne({
        where: {
            kioskId: id,
            isTemperatureAlert: true,
            isTemperatureCriticalAlert: false,
            lastActionDate: {
                [Op.lte]: lastActionDate
            }
        }
    });

    if (isCriticalAlert) {
        let momentDate = moment(isCriticalAlert.lastActionDate).utcOffset(timezone);
        let date = momentDate.format('ddd, MMM DD YYYY');
        let time = momentDate.format('HH:mm');
        let rows = [];
        temperatureLogs.forEach((log) => {
            if (log.error) {
                rows.push(`${collectDateString(log.createdAt, 'ddd, MMM DD YYYY, HH:mm', timezone)}  –  ${log.errorMessage}`);
            } else {
                rows.push(`${collectDateString(log.createdAt, 'ddd, MMM DD YYYY, HH:mm', timezone)}  –  +${log.temperature} ℃`);
            }
        });
        const body = getCriticalEmailBody(displayName, date, time, {row1: rows[0], row2: rows[1], row3: rows[2]});
        await sendEmail(SPOwnerEmail, kerpakOperatorEmails, `[CRITICAL] Kerpak | ${displayName} | Temperature Alert`, body);

        const payload = {
            isTemperatureCriticalAlert: true,
            lastActionDate: new Date(),
            kioskId: id
        }
        await KiosksTemperatureStatus.upsert(payload);
    }
};

const checkTemperatureLog = async (id, temperatureEmail, displayName, serviceProviderId) => {
    const temperatureLogs = await TemperatureLogs.findAll({ where: { kioskId: id }, order: [['createdAt', 'DESC']], limit: 3 });
    let issueState = 0;
    let hightTempState = 0;
    let correctState = 0;
    const highTemperatureLimit = serviceProviderId === 4 ? 15 : 10;
    temperatureLogs.forEach((log) => {
        if (log.error) {
            issueState++;
        } else if (log.temperature > highTemperatureLimit) {
            issueState++;
            hightTempState++;
        } else {
            correctState++;
        }
    });

    const currentSP = await ServiceProviders.findOne({ where: {id: serviceProviderId}, attributes: ['timezone'] });

    const SPOwnerEmail = await getSPUsersEmails(serviceProviderId);
    const kerpakOperatorEmails = await getOperatorsEmails();
    // TO do create envSettings
    if (issueState === 3 && temperatureEmail !== 'issue email was been sent') {
        const title = `Kerpak | ${displayName} | Temperature Alert`;
        const body = getEmailBody(true, displayName, temperatureLogs, currentSP?.timezone);
        await sendEmail(kerpakOperatorEmails, [], title, body);
        await Kiosks.update({ temperatureEmail: 'issue email was been sent' }, { where: { id } });
        const payload = {
            isTemperatureAlert: true,
            isTemperatureRecovered: false,
            lastActionDate: new Date(),
            kioskId: id
        }
        await KiosksTemperatureStatus.upsert(payload);
    } else if (correctState === 3 && temperatureEmail === 'issue email was been sent') {
        const title = `Kerpak | ${displayName} | Temperature Alert`;
        const body = getEmailBody(false, displayName, temperatureLogs, currentSP?.timezone);
        await sendEmail(kerpakOperatorEmails, [], title, body);
        await Kiosks.update({ temperatureEmail: 'recovering email was been sent' }, { where: { id } });
        const payload = {
            isTemperatureAlert: false,
            isTemperatureRecovered: true,
            isTemperatureCriticalAlert: false,
            lastActionDate: new Date(),
            kioskId: id
        }
        await KiosksTemperatureStatus.upsert(payload);
    }
    await checkForCriticalIssue(id, displayName, temperatureLogs, SPOwnerEmail, kerpakOperatorEmails, currentSP?.timezone);
}

const checkForUnstableConnection = async (id, displayName, SPOwnerEmail, kerpakOperatorEmails) => {
    const currentStatus = await KiosksUnstableConnectionStatus.findOne({where: {kioskId: id}});
    let state;
    let lastActionDate;
    if (currentStatus && currentStatus.isConnectionUnstableCriticalAlert) {
        state = 'critical';
    } else if (currentStatus && currentStatus.isConnectionUnstableAlert) {
       state = 'issue';
       lastActionDate = currentStatus.lastActionDate;
    } else {
        state = 'recovered';
    }
    const currentDate = new Date();
    let date = new Date(currentDate.getTime() - 15 * 60 * 1000);
    const count = await ConnectionLogs.count({
        where: {
            kioskId: id,
            disconnectedAt: {
                [Op.and]: {
                    [Op.ne]: null,
                    [Op.gte]: date
                }
            }
        }
    });

    if (count > 2 && state === 'recovered') {
        const title = `Kerpak | ${displayName} | Unstable Connection`;
        const body = getConnectionUnstableIssueEmailBody(displayName);
        await sendEmail(kerpakOperatorEmails, [], title, body);
        const payload = {
            isConnectionUnstableAlert: true,
            isConnectionRecovered: false,
            lastActionDate: new Date(),
            kioskId: id
        }
        await KiosksUnstableConnectionStatus.upsert(payload);
    } else if (count === 0 && (state === 'issue' || state === 'critical')) {
        const title = `Kerpak | ${displayName} | Unstable Connection`;
        const body = getConnectionUnstableRecoverEmailBody(displayName);
        await sendEmail(kerpakOperatorEmails, [], title, body);
        const payload = {
            isConnectionUnstableAlert: false,
            isConnectionUnstableCriticalAlert: false,
            isConnectionRecovered: true,
            lastActionDate: new Date(),
            kioskId: id
        }
        await KiosksUnstableConnectionStatus.upsert(payload);
    }

    if (state === 'issue' && lastActionDate < new Date(currentDate.getTime() - 30 * 60 * 1000)) {
        const title = `[CRITICAL] Kerpak | ${displayName} | Unstable Connection`;
        const body = getConnectionUnstableCriticalIssueEmailBody(displayName);
        await sendEmail(SPOwnerEmail, kerpakOperatorEmails, title, body);
        const payload = {
            isConnectionUnstableCriticalAlert: true,
            lastActionDate: new Date(),
            kioskId: id
        }
        await KiosksUnstableConnectionStatus.upsert(payload);
    }
};

const checkSocketConnection = async (kioskId, connectionEmail, displayName, serviceProviderId) => {
    const connectionLogs = await ConnectionLogs.findAll({ where: { kioskId }, order: [['id', 'DESC']], limit: 1 });
    if (connectionLogs.length === 0) {
        return;
    }
    const emails = await getSPUsersEmails(serviceProviderId);
    const SPOwnerEmail = await getSPUsersEmails(serviceProviderId);
    const kerpakOperatorEmails = await getOperatorsEmails();
    const { connectedAt, disconnectedAt } = connectionLogs[0];
    const currentSP = await ServiceProviders.findOne({ where: {id: serviceProviderId}, attributes: ['timezone'] });
    if (disconnectedAt && connectionEmail !== 'issue email was been sent' && new Date().getTime() - new Date(disconnectedAt).getTime() > 15 * 1000 * 60) {
        const title = `Kerpak | ${displayName} | Lost Connection`;
        const body = getConnectionEmailBody(true, displayName, disconnectedAt, null, currentSP?.timezone);
        await sendEmail(kerpakOperatorEmails, [], title, body);
        await Kiosks.update({ connectionEmail: 'issue email was been sent' }, { where: { id: kioskId } });
    } else if (connectedAt && connectionEmail === 'issue email was been sent' && new Date().getTime() - new Date(connectedAt).getTime() > 15 * 1000 * 60) {
        const title = `Kerpak | ${displayName} | Lost Connection`;
        let disconnected = await ConnectionLogs.findAll({
            where: {
                kioskId,
                disconnectedAt: {
                    [Op.ne]: null
                }
            }, order: [['id', 'DESC']], limit: 1 });
        const body = getConnectionEmailBody(false, displayName, disconnected[0].disconnectedAt, connectedAt, currentSP?.timezone);
        await sendEmail(kerpakOperatorEmails, [], title, body);
        await Kiosks.update({ connectionEmail: 'recovering email was been sent' }, { where: { id: kioskId } });
    }
    await checkForUnstableConnection(kioskId, displayName, SPOwnerEmail, kerpakOperatorEmails);
};

module.exports = {
    checkTemperatureLog,
    checkSocketConnection
};
