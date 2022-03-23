const Gateways = require('easy-payment');
const IDBANK = require('@easy-payment/idbank').gateway;
const STRIPE = require('@easy-payment/stripe').gateway;
const { payment: { PROVIDERS } } = require('app/settings');
const { getAuthSettings, getSPAuthSettings, getStripeAuthSettings, getStripeTestAuthSettings } = require('app/services/payment');

const getBankClient = (paymentMethod, serviceProviderId) => {
    switch (paymentMethod) {
        case PROVIDERS.ID_BANK:
            return Gateways.create(IDBANK, serviceProviderId ? getSPAuthSettings(serviceProviderId) : getAuthSettings());
        case PROVIDERS.STRIPE:
            return Gateways.create(STRIPE, getStripeAuthSettings());
        case PROVIDERS.STRIPE_TEST:
            return Gateways.create(STRIPE, getStripeTestAuthSettings());
    }
};

module.exports = {
    getBankClient
};