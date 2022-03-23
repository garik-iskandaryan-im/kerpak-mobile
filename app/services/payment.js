const { orders: Orders } = require('app/models/models');
const { ORDER: { idBank, stripe } } = require('app/settings');
const { ERROR_CODES } = require('app/constants');

const shouldAllowPayment = async (sum, serviceProvider, consumerId) => {
    if (serviceProvider.allowPaymentByCredit && sum <= serviceProvider.creditAmount) {
        const order = await Orders.findOne({
            where: {
                orderStatus: 'successful',
                consumerId: consumerId
            }
        });
        if (order) {
            return true;
        }
    }
    return false;
};

const getAuthSettings = () => {
    const { KERPAK_ID_BANK_BANK_BINDING_USER_NAME, KERPAK_ID_BANK_BANK_BINDING_PASSWORD, KERPAK_ID_BANK_BANK_USER_NAME, KERPAK_ID_BANK_BANK_PASSWORD, REQUEST_TO_BANK_WAITING_TIME } = idBank;
    return {
        USER_NAME_API: KERPAK_ID_BANK_BANK_USER_NAME,
        PASSWORD_API: KERPAK_ID_BANK_BANK_PASSWORD,
        USER_NAME_API_BINDING: KERPAK_ID_BANK_BANK_BINDING_USER_NAME,
        PASSWORD_API_BINDING: KERPAK_ID_BANK_BANK_BINDING_PASSWORD,
        TIMEOUT: REQUEST_TO_BANK_WAITING_TIME
    };
};

const getSPAuthSettings = (serviceProviderId) => {
    const { credentials, REQUEST_TO_BANK_WAITING_TIME } = idBank;
    return {
        USER_NAME_API: credentials[serviceProviderId].USER_NAME,
        PASSWORD_API: credentials[serviceProviderId].PASSWORD,
        USER_NAME_API_BINDING: credentials[serviceProviderId].BINDING_USER_NAME,
        PASSWORD_API_BINDING: credentials[serviceProviderId].BINDING_PASSWORD,
        TIMEOUT: REQUEST_TO_BANK_WAITING_TIME
    };
};

const isValidExtendedStatus = (statusResponse = {}) => {
    const { cardAuthInfo: {
        pan, cardholderName, expiration, approvalCode
    } = {}, paymentAmountInfo: {
        depositedAmount, approvedAmount
    } = {}, errorCode, actionCode, currency, orderNumber, amount } = statusResponse;
    return !!(actionCode === ERROR_CODES.SUCCESS &&
        Number(errorCode) === ERROR_CODES.SUCCESS &&
        currency && amount && pan &&
        cardholderName && approvalCode && expiration &&
        depositedAmount === amount && approvedAmount === amount && orderNumber);
};

const getStripeAuthSettings = () => {
    const { SECRET_KEY } = stripe;
    return {
        SECRET_KEY
    };
};

const getStripeTestAuthSettings = () => {
    const { TEST_SECRET_KEY } = stripe;
    return {
        SECRET_KEY: TEST_SECRET_KEY
    };
};

module.exports = {
    shouldAllowPayment,
    getAuthSettings,
    getSPAuthSettings,
    isValidExtendedStatus,
    getStripeAuthSettings,
    getStripeTestAuthSettings
};