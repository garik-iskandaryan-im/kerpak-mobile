//import { SES } from 'aws-sdk';
const SES = require('aws-sdk').SES;
//import collections from '/imports/api/collections';
//import { Roles } from 'meteor/alanning:roles';
//import Logger from '/imports/api/common/services/Logger';

const s3Conf = {ses: ''};

const ses = new SES({
    secretAccessKey: s3Conf.secret,
    accessKeyId: s3Conf.key,
    region: s3Conf.ses.region
});

const sendAWSSESverifyEmail = async (email) => {
    const params = { EmailAddress: email };
    return new Promise((resolve, reject) => {
        ses.verifyEmailIdentity(params, function(err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};

const sendEmail = async (emails, bccEmails, subject, body_text) => {
    try {
        const charset = 'UTF-8';
        const source = s3Conf.ses.source; // TODO change
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
                    Text: {
                        Data: body_text,
                        Charset: charset
                    }
                }
            }
        };
        ses.sendEmail(params, function(err, data) {
            if(err) {
                Logger.error(err);
            } else {
                Logger.info('email was sent', data);
            }
        });
        return true;
    } catch (err) {
        Logger.error(err);
        return false;
    }
};

const getEmailBody = (isIssue, kioskName, temperatureLogs) => {
    /*
        // Dear operator,
        //
        // Your ${kiosk.displayName} has experienced the following issues recently:
        // dateTime - /high temperature registered - 11 C  /  error message /
        // dateTime - /high temperature registered - 25 C  /  error message /
        // dateTime - /high temperature registered - 13 C  /  error message /
        //
        // Sincerely,
        // The Kerpak team
    */
    let body = '';
    if (isIssue) {
        const row1 = temperatureLogs[0].error ? temperatureLogs[0].errorMessage : `high temperature registered - ${temperatureLogs[0].temperature} °C`;
        const row2 = temperatureLogs[1].error ? temperatureLogs[1].errorMessage : `high temperature registered - ${temperatureLogs[1].temperature} °C`;
        const row3 = temperatureLogs[2].error ? temperatureLogs[2].errorMessage : `high temperature registered - ${temperatureLogs[2].temperature} °C`;
        body = `Dear operator,
Your ${kioskName} has experienced the following issues recently:

${temperatureLogs[0].createdAt} - ${row1}
${temperatureLogs[1].createdAt} - ${row2}
${temperatureLogs[2].createdAt} - ${row3}

Sincerely,
The Kerpak team`;
    } else {
        /*TODO: The bad periud was from ${dateTime} to ${dateTime}
            // Dear operator,

            // Your ${kiosk.displayName} has recovered recently and the recent status messages are:
            // dateTime - temperature registered - 8 C
            // dateTime - temperature registered - 8 C
            // dateTime - temperature registered - 8 C
            //
            // The bad periud was from ${dateTime} to ${dateTime}
            //
            // Sincerely,
             // The Kerpak team
        */
        body = `Dear operator,
Your ${kioskName} has recovered recently and the recent status messages are:

${temperatureLogs[0].createdAt} - temperature registered - ${temperatureLogs[0].temperature} °C 
${temperatureLogs[1].createdAt} - temperature registered - ${temperatureLogs[0].temperature} °C
${temperatureLogs[2].createdAt} - temperature registered - ${temperatureLogs[0].temperature} °C

Sincerely,
The Kerpak team`;
    }
    return body;
};

const getSPUsersEmails = (id) => {
    if (!id) {
        return [];
    }
    const users = collections.Users.find({
        'profile.serviceProvider': id,
        archived: { $ne: true }
    }).fetch();
    const emails = users.map(item => {
        return item.emails[0].address;
    });
    return emails;
};

const getKerpakOperatorsEmails = () => {
    const users = Roles.getUsersInRole(['Kerpak Operator']).fetch();
    const emails = users.filter(item => {
        if (item.archived) {
            return false;
        }
        return true;
    }).map(item => {
        return item.emails[0].address;
    });
    return emails;
};

const pad = (num, size) => {
    num = num.toString();
    while (num.length < size) num = '0' + num;
    return num;
};

module.exports.pad = pad;

module.exports.sendAWSSESverifyEmail = sendAWSSESverifyEmail;
/*
export {
    sendAWSSESverifyEmail,
    sendEmail,
    getEmailBody,
    getSPUsersEmails,
    getKerpakOperatorsEmails
}*/