const fs = require('fs');
const path = require('path');
const pupa = require('pupa');
const { SES } = require('aws-sdk');
const log = require('app/helpers/logger');
const { s3: { KEY, SECRET, SES: { REGION, SOURCE } } } = require('app/settings');
const {collectDateString} = require('app/helpers/utils');

const ses = new SES({
    secretAccessKey: SECRET,
    accessKeyId: KEY,
    region: REGION
});

const sendAWSSESverifyEmail = async (email) => {
    const params = { EmailAddress: email };
    return new Promise((resolve, reject) => {
        ses.verifyEmailIdentity(params, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};

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

const compileTemperatureBodyError = (dateTime, error, errorMessage, temperature, isIssue, template, timezone) => {
    const dateString = collectDateString(dateTime, 'ddd, MMM DD YYYY, HH:mm', timezone);
    const params = {
        dateTime: dateString
    };
    if (!isIssue) {
        params.temperature = temperature;
    } else {
        params.errorMessage = error? errorMessage : temperature;
    }
    return pupa(template, {...params});
};

const getEmailBody = (isIssue, kioskName, temperatureLogs, timezone) => {
    const temperatureBodyTemplate = fs.readFileSync(path.resolve('app/helpers/email/templates/temperatureBody/temperatureBody.txt'), 'utf8').toString();
    const temperatureBodyError = fs.readFileSync(path.resolve('app/helpers/email/templates/temperatureBody/temperatureBodyError.txt'), 'utf8').toString();
    const temperatureBody = temperatureLogs.reduce((currentValue, { createdAt: dateTime, error, errorMessage, temperature },) => {
        return `
        ${currentValue}${compileTemperatureBodyError(dateTime, error, errorMessage, temperature, isIssue, isIssue ? temperatureBodyError : temperatureBodyTemplate, timezone)}
        `;
    }, '');
    let template = '';
    if (isIssue) {
        template = fs.readFileSync(path.resolve('app/helpers/email/templates/kioskStatus/kioskStatusError.txt'), 'utf8').toString();
    } else {
        template = fs.readFileSync(path.resolve('app/helpers/email/templates/kioskStatus/kioskStatus.txt'), 'utf8').toString();
    }
    const start = collectDateString(temperatureLogs[temperatureLogs.length - 1].createdAt, 'DD/MM/YYYY HH:mm', timezone);
    const end = collectDateString(temperatureLogs[0].createdAt, 'DD/MM/YYYY HH:mm', timezone);
    return pupa(template, { kioskName, temperatureBody, start, end });
};

const getConnectionEmailBody = (isIssue, displayName, disconnectedAt, connectedAt, timezone) => {
    const params = {
        displayName
    };
    if (isIssue) {
        template = fs.readFileSync(path.resolve('app/helpers/email/templates/socket/connectionIssue.txt'), 'utf8').toString();
        params.disconnectedAt = collectDateString(disconnectedAt, 'HH:mm', timezone);
        params.date = collectDateString(disconnectedAt, 'DD.MM.YYYY', timezone);
    } else {
        template = fs.readFileSync(path.resolve('app/helpers/email/templates/socket/connectionRecover.txt'), 'utf8').toString();
        params.connectedAt = collectDateString(connectedAt, 'HH:mm', timezone);
        params.disconnectedAt = collectDateString(disconnectedAt, 'HH:mm', timezone);
        params.now = collectDateString(new Date(), 'HH:mm', timezone);
        params.disconnectedDate = collectDateString(disconnectedAt, 'DD.MM.YYYY', timezone);
        params.connectedDate = collectDateString(connectedAt, 'DD.MM.YYYY', timezone);
    }
    return pupa(template, params);
};

const getResetPasswordEmailBody = (emailResetLink) => {
    template = fs.readFileSync(path.resolve('app/helpers/email/templates/user/resetPasswordBody.txt'), 'utf8').toString();
    return pupa(template, { emailResetLink });
};

const getInvitationEmailBody = (emailResetLink, invitedBy, invitedUser) => {
    template = fs.readFileSync(path.resolve('app/helpers/email/templates/user/inviteUserBody.txt'), 'utf8').toString();
    return pupa(template, { emailResetLink, invitedBy, invitedUser });
};

const getIvideonEmailBody = () => {
    return fs.readFileSync(path.resolve('app/helpers/email/templates/ivideon/error.txt'), 'utf8').toString();
};

const getCriticalEmailBody = (kioskName, date, time, rows) => {
    template = fs.readFileSync(path.resolve('app/helpers/email/templates/criticalIssues/higthTemperature.txt'), 'utf8').toString();
    return pupa(template, { kioskName, date, time, rows });
};

const getConnectionUnstableIssueEmailBody = (kioskName) => {
    template = fs.readFileSync(path.resolve('app/helpers/email/templates/unstableConnection/unstableConnectionIssue.txt'), 'utf8').toString();
    return pupa(template, { kioskName });
};

const getConnectionUnstableRecoverEmailBody = (kioskName) => {
    template = fs.readFileSync(path.resolve('app/helpers/email/templates/unstableConnection/unstableConnectionRecover.txt'), 'utf8').toString();
    return pupa(template, { kioskName });
};

const getConnectionUnstableCriticalIssueEmailBody = (kioskName) => {
    template = fs.readFileSync(path.resolve('app/helpers/email/templates/unstableConnection/unstableConnectionCriticalIssue.txt'), 'utf8').toString();
    return pupa(template, { kioskName });
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

const getRegisterVerificationCodeEmailBody = (from, code) => {
    const template = fs.readFileSync(path.resolve('app/helpers/email/templates/user/registerVerificationCode.html'), 'utf8').toString();
    return pupa(template, { from, code });
};

module.exports = {
    sendAWSSESverifyEmail,
    getIvideonEmailBody,
    sendEmail,
    getEmailBody,
    getResetPasswordEmailBody,
    getInvitationEmailBody,
    getConnectionEmailBody,
    getCriticalEmailBody,
    getConnectionUnstableIssueEmailBody,
    getConnectionUnstableRecoverEmailBody,
    getConnectionUnstableCriticalIssueEmailBody,
    getPreOrderEmailBody,
    getPreOrderDeclineEmailBody,
    getRegisterVerificationCodeEmailBody
};