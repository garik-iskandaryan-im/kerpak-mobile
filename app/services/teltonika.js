const {
    integrations: Integrations,
    kiosks: Kiosks,
} = require('app/models/models');
// eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJhODUzZDA0YjczMmEyMDg5ZTFiYTI2MmQwNjgxOGZlMGMyM2I3NTVmODRlZjMyMzRhY2Q4MzZjMGQ5ZTRkNTc0NmUxODdmZmNhNzgyYjE3YyIsImlzcyI6Imh0dHBzOlwvXC9ybXMudGVsdG9uaWthLW5ldHdvcmtzLmNvbVwvYWNjb3VudCIsImlhdCI6MTYxODU1ODAyNywibmJmIjoxNjE4NTU4MDI3LCJleHAiOjE2NTAwOTQwMjcsInN1YiI6IjM1MTA0IiwiY2xpZW50X2lkIjoiOTEyM2VhNjYtMmYxZC00MzljLWIxYzItMzExYWMwMTBhYWFkIiwiZmlyc3RfcGFydHkiOmZhbHNlfQ.RPPm_5-Gtd9Th7yn5j3Zx6KPQ2vtFjH7DxEuahIE_YB2R3CoJmjCf34xHwiFXu57aV33rQ12gpE-MGgeM4_XibdOZnlOvdSYzNMkz1J-X1on2USXrLbAeFi4moqhi45MO2OF5EiVk6RWbqQD0ncaenhclTbShYAEx2zEgLwxIye9MTGWuHLM8glOaMoV_ueXXytHYTBOgf7BXQkw2WJ5nNcux5gnc7j-srxKjLBvWmJet57fIb6GUcLWkRE6ZczwLKlcQbn2HjBExXs8RZseTSTbip1enQBEXKQt8yBEgAP-7WNVTzs4nhcYX3t2iuH5l3-Oe2MWv-ZwU-zpgVmvGQ
const log = require('app/helpers/logger');
const Got = require('got');

const teltonikaAPI = 'https://rms.teltonika-networks.com/api/';
const divicesConnect = 'devices/connect/';

const getTeltoninkaPAT = async () => {
    const teltonika = await Integrations.findOne({ where: {name: 'Teltonika' }});
    if (!teltonika) {
        return false;
    }
    return teltonika.accessToken;
};

const getRemoteURL = async (PAT, remoteAccessId) => {
    const url = `${teltonikaAPI}${divicesConnect}${remoteAccessId}/sessions?active=true`;
    const requestOptions = {
        responseType: 'json',
        timeout: 10000,
        headers: {
            'Authorization': `Bearer ${PAT}`
        }
    };
    try {
        const { body } = await Got.get(url, requestOptions);
        return {success: true, data: body.data};
    } catch (err) {
        log.error(err, 'teltonika::getRemoteURL');
        return {success: false, data: err};;
    }
};

const createNewRemoteAccess = async (PAT, remoteAccessId) => {
    const url = `${teltonikaAPI}${divicesConnect}${remoteAccessId}`;

    const requestOptions = {
        responseType: 'json',
        timeout: 10000,
        headers: {
            'Authorization': `Bearer ${PAT}`
        },
        json: {
            'duration': 366*24*60*60  // one year
        }
    };
    try {
        const { body } = await Got.post(url, requestOptions);
        return {success: true};
    } catch (err) {
        log.error(err, 'teltonika::createNewRemoteAccess');
        return {success: false, data: err};;
    }
};

const timeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const getAfterTimeOut = async (PAT, remoteAccessId, oldAccessID) => {
    let i = 0;
    let teltonikaHost;
    while (i < 10) {
        i++;
        await timeout(1000);
        const resAfterTimeout = await getRemoteURL(PAT, remoteAccessId);
        if (oldAccessID) {
            if (resAfterTimeout.data[0].id !== oldAccessID) {
                teltonikaHost = resAfterTimeout.data[0].url;
                break;
            }
        } else if (resAfterTimeout.data.length !== 0) {
            teltonikaHost = resAfterTimeout.data[0].url;
            break;
        }
    }
    return teltonikaHost;
}

const getTeltonikaHost = async (kioskId, remoteAccessId) => {
    const PAT = await getTeltoninkaPAT();
    const err = {success: false, criticalIssue: true};
    if (!PAT) {
        err.code = 1;
        err.message = 'No PAT found for Teltonika. Check Integration.';
        return err;
    }
    const res = await getRemoteURL(PAT, remoteAccessId);

    if (!res.success) {
        err.code = 2;
        err.message = 'No connection';
        return err;
    }
    let teltonikaHost;

    const resCreate = await createNewRemoteAccess(PAT, remoteAccessId);

    if (!resCreate.success) {
        err.code = 2;
        err.message = 'No connection';
        return err;
    }
    let oldAccessID;
    if (res.data && res.data[0] && res.data[0].id) {
        oldAccessID = res.data[0].id;
    }
    teltonikaHost = await getAfterTimeOut(PAT, remoteAccessId, oldAccessID);
    if (!teltonikaHost) {
        err.code = 2;
        err.message = 'No connection';
        return err;
    }

    await Kiosks.update({ teltonikaHost: teltonikaHost }, { where: { id: kioskId } });
    return {success: true, teltonikaHost};
};

module.exports = {
    getTeltonikaHost,
};