const fs = require('fs');
const path = require('path');
const pupa = require('pupa');
const { SES } = require('aws-sdk');
const log = require('app/helpers/logger');
const { s3: { KEY, SECRET, SES: { REGION, SOURCE } } } = require('app/settings');
const { collectDateString } = require('app/helpers/utils');

const ses = new SES({
    secretAccessKey: SECRET,
    accessKeyId: KEY,
    region: REGION
});

const sendEmail = async (emails, bccEmails, subject, body_text, sender, isTemplateHtml = false) => {
    try {
        const charset = 'UTF-8';
        let source = SOURCE;
        if (sender) {
            source = sender;
        }
        let params = {
            Source: source,
            Destination: {
                ToAddresses: emails,
                BccAddresses: bccEmails,
            },
            Message: {
                Subject: {
                    Data: subject,
                    Charset: charset
                },
                Body: {
                    [isTemplateHtml ? 'Html' : 'Text']: {
                        Data: body_text,
                        Charset: charset
                    }
                }
            }
        };
        ses.sendEmail(params, function (err, data) {
            if (err) {
                log.error(err, 'aws::email::sendEmail::err');
            } else {
                log.info(data, 'aws::email::sendEmail');
            }
        });
        return true;
    } catch (err) {
        log.error(err, 'aws::email::sendEmail');
        return false;
    }
};

const getRegisterVerificationCodeEmailBody = (from, code) => {
    const template = fs.readFileSync(path.resolve('app/helpers/email/templates/user/registerVerificationCode.html'), 'utf8').toString();
    return pupa(template, { from, code });
};

const getPreOrderEmailBody = (kioskName, link, expectedDeliveryDate, transferTimeFrom, transferTimeTo, timezone) => {
    const template = fs.readFileSync(path.resolve('app/helpers/email/templates/preOrder/preOrder.txt'), 'utf8').toString();
    return pupa(template, {
        kioskName,
        link,
        expectedDeliveryDate: collectDateString(expectedDeliveryDate, 'DD.MM.YY', timezone),
        transferTimeFrom: collectDateString(transferTimeFrom, 'HH:mm', timezone),
        transferTimeTo: collectDateString(transferTimeTo, 'HH:mm', timezone),
    });
};

const getPreOrderDeclineEmailBody = (kioskName, link) => {
    const template = fs.readFileSync(path.resolve('app/helpers/email/templates/preOrder/decline.txt'), 'utf8').toString();
    return pupa(template, {
        kioskName,
        link,
    });
};

const getIvideonEmailBody = () => {
    return fs.readFileSync(path.resolve('app/helpers/email/templates/ivideon/error.txt'), 'utf8').toString();
};

module.exports = {
    sendEmail,
    getRegisterVerificationCodeEmailBody,
    getPreOrderEmailBody,
    getPreOrderDeclineEmailBody,
    getIvideonEmailBody
};