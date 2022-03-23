const twilio = require('twilio');
const pupa = require('pupa');

const { twilio: { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHON_NUMBER, TWILIO_MESSAGE_TEMPLATE } } = require('app/settings');

const client = new twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const compileMessage = (template, params) => pupa(template || TWILIO_MESSAGE_TEMPLATE, params);

const send = async (to, body) => {
    return await client.messages.create({
        body, to, from: TWILIO_PHON_NUMBER
    });
};

module.exports = {
    send,
    compileMessage,
    client
};