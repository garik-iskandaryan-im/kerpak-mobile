const admin = require("firebase-admin");
const { firebase: { key } } = require('app/settings');
const serviceAccount = require(key);
const loggerNotifications = require('app/helpers/loggerNotifications');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

module.exports.sendNotification = async (title, body, registrationTokens) => {
    return new Promise((resolve, reject) => {
        const message = {
            notification: {
                title: title,
                body: body
            },
            tokens: registrationTokens,
        };
        admin.messaging().sendMulticast(message).then((response) => {
            const failedTokens = [];
            const successTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(registrationTokens[idx]);
                } else {
                    successTokens.push(registrationTokens[idx]);
                }
            });
            resolve({ successCount: response.successCount, failureCount: response.failureCount, failedTokens, successTokens });
            if (response.failureCount > 0) {
                loggerNotifications.error(response);
            }
        });
    });
}