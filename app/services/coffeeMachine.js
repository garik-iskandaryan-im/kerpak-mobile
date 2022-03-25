const { COFFEEMACHINE: { ID, SECRET, USERNAME, PASSWORD } } = require('app/settings');
const log = require('app/helpers/logger');
const Got = require('got');

const pushCredit = async (coffemashinId, sumWithoutDiscount) => {
    try {
        let uri = 'https://api.telemetron.net/auth';
        let restOptions = {
            method: 'POST',
            json: {
                'grant_type': 'password',
                'client_id': ID,
                'client_secret': SECRET,
                'scope': 'teleport',
                'username': USERNAME,
                'password': PASSWORD
            }
        };
        let response = await Got(uri, restOptions);
        uri = `https://api.telemetron.net/v2/modems/${coffemashinId}/set`;
        restOptions = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${JSON.parse(response.body).access_token}`
            },
            json: {
                'cashless_mode': 1,
                'cashless_address': 1,
                'cashless_credit': sumWithoutDiscount
            }
        };
        response = await Got(uri, restOptions);
        return response.body;
    } catch (error) {
        log.error(error, 'coffeemachine::services::pushCredit');
        return { success: false, error: error };
    }
};

module.exports.pushCredit = pushCredit;