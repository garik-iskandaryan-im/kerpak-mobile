const Got = require('got');
const { integrations: Integrations, kioskSessions: KioskSessions } = require('app/models/models');
const { ivideon: { URL: ivideonUrl, USERNAME, PASSWORD, IVIDEON_OAUTH_URL } } = require('app/settings');
const log = require('app/helpers/logger');
const { sendEmail, getIvideonEmailBody } = require('app/helpers/email/adapters/aws');
const { getOperatorsEmails } = require('app/helpers/email/service')
const formatCreateEventData = (accessToken, cameraId, kioskId) => ({
    'access_token': accessToken,
    'type': 'motion/start',
    'time': (new Date().getTime() / 1000),
    'source_type': 'camera',
    'source_id': cameraId,
    'clip_settings': {
        'duration': 120
    },
    'chain_id': kioskId

})

class Ivideon {
    constructor() {
        if (typeof Ivideon.instance === 'object') {
            return Ivideon.instance;
        }
        this.stack = [];
        this.accessTokenUpdating = false;
        Ivideon.instance = this;
        return this;
    }

    initializeTokens = async () => {
        const ivideon = await Integrations.findOne({ name: 'ivideon' });
        if (!ivideon) {
            return false;
        }
        this.accessToken = ivideon.accessToken;
        this.refreshToken = ivideon.refreshToken;
        this.ivideonId = ivideon.id;
        this.criticalError = ivideon.criticalError;
        return true;
    }

    updateSession = async (kioskSessionsId, videoId) => {
        return await KioskSessions.update({ videoId: videoId, }, { where: { id: kioskSessionsId } });
    }

    createEvent = async (cameraId, kioskId, kioskSessionsId) => {
        const accessToken = this.accessToken;
        const url = `${ivideonUrl}?op=CREATE&access_token=${accessToken}`;
        const requestOptions = {
            json: formatCreateEventData(accessToken, cameraId, kioskId),
            rejectUnauthorized: false,
            responseType: 'json'
        };
        try {
            const { body } = await Got.post(url, requestOptions);
            const videoId = body.result.id;
            await this.updateSession(kioskSessionsId, videoId);
            return true;
        } catch (err) {
            if (err.response && err.response.body && (err.response.body.code === 'TOKEN_EXPIRED' || err.response.body.code === 'TOKEN_NOT_FOUND')) {
                this.stack.push({ url: url, requestOptions: requestOptions, updateSession: true, kioskSessionsId: kioskSessionsId });
                return this.getNewAccessToken();
            } else {
                log.error(err, 'ivideon::adapter:createEvent')
                return err;
            }
        }
    }

    changeAccessToken = (url, accessToken) => {
        let newUrl = new URL(url);
        let search_params = newUrl.searchParams;

        search_params.set('access_token', accessToken);
        newUrl.search = search_params.toString();
        newUrl = newUrl.toString();
        return newUrl;
    }

    getNewAccessToken = async () => {
        if (this.accessTokenUpdating || this.criticalError) {
            return { status: 'getting new token' }
        }
        this.accessTokenUpdating = true;

        const data = {
            refresh_token: this.refreshToken,
            grant_type: 'refresh_token'
        };
        const requestOptions = {
            body: new URLSearchParams(data).toString(),
            rejectUnauthorized: false,
            timeout: 10000,
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`
            }
        };
        try {
            const { body: { access_token: accessToken, refresh_token: refreshToken } } = await Got.post(IVIDEON_OAUTH_URL, requestOptions);
            await Integrations.update({ accessToken, refreshToken, }, { where: { id: this.ivideonId } });
            this.initializeTokens();

            for (let i = 0, j = this.stack.length - 1; j >= i; j--) {
                let { body } = await Got.post(this.changeAccessToken(this.stack[j].url, this.accessToken), this.stack[j].requestOptions);
                if (this.stack[j].updateSession) {
                    const videoId = body.result.id;
                    await this.updateSession(this.stack[j].kioskSessionsId, videoId);
                }
                this.stack.splice(j, 1);
            }
        } catch (err) {
            if (err.response && err.response.data && (err.response.data.error_description === 'Refresh token expired' || err.response.data.error_description === 'Refresh token not found')) {
                if (!this.criticalError) {
                    const emails = await getOperatorsEmails();
                    const bccEmails = [];
                    const title = `Issue with Ividion integration`;
                    const body = getIvideonEmailBody();
                    await sendEmail(emails, bccEmails, title, body);
                    await Integrations.update({ criticalError: true }, { where: { id: this.ivideonId } });
                    this.criticalError = true;
                }
            }
        } finally {
            this.accessTokenUpdating = false;
        }
    }
}
module.exports = new Ivideon();