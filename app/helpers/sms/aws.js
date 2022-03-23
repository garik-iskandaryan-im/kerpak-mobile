const { SNS } = require('app/settings');
const AWS = require('aws-sdk');
const log = require('app/helpers/logger');

const smsInstance = new AWS.SNS({
    apiVersion: '2010-03-31',
    secretAccessKey: SNS.SECRET,
    accessKeyId: SNS.KEY,
    region: SNS.REGION
}); 

const send = (phone, message) => {
    const params = {
        Message: message,
        PhoneNumber: phone
    };
    const publishTextPromise = smsInstance.publish(params).promise();
    publishTextPromise.then(function(data) {
        log.info("MessageID is " + data.MessageId, 'AWS::SNS::SMS');
    }).catch(function(err) {
        log.error(err, 'AWS::SNS::SMS');
    });
}
  
module.exports = {
    send
};
