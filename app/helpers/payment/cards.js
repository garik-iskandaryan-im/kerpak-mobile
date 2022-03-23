const {
    ORDER: {
        idBank: { BINDING: { BINDING_RETURN_URL, DEFAULT_BINDING_AMOUNT, DESCRIPTION } },
        stripe
    },
    payment: { TYPE, PROVIDERS },
} = require('app/settings');
const { calculatePrice } = require('app/controllers/common');
const { PAGE_VIEW, CARD_TYPES } = require('app/constants');

module.exports = {
    attach: {
        payload: ({ transactionId, consumer }) => {
            const getStripePayload = () => {
                const payload = {
                    payment_method_types: ['card'],
                };
                if (consumer.stripeCustomerId) {
                    payload.customer = consumer.stripeCustomerId;
                } else {
                    payload.customerData = {
                        name: consumer.id,
                    };
                }
                return payload;
            };
            switch (consumer.region.paymentMethod) {
                case PROVIDERS.ID_BANK:
                    return {
                        amount: calculatePrice(DEFAULT_BINDING_AMOUNT),
                        orderNumber: transactionId,
                        language: consumer.region.language,
                        pageView: PAGE_VIEW.DESKTOP,
                        returnUrl: BINDING_RETURN_URL,
                        description: DESCRIPTION,
                        clientId: consumer.bankClientId,
                    };
                case PROVIDERS.STRIPE:
                case PROVIDERS.STRIPE_TEST:
                    return getStripePayload();
            }
        },
        transactionData: ({ consumer, transactionId, registeredOrder }) => {
            const data = {
                transactionId,
                paymentType: TYPE.BANK_CARD,
                paymentProvider: consumer.region.paymentMethod,
            };
            switch (consumer.region.paymentMethod) {
                case PROVIDERS.ID_BANK:
                    return {
                        ...data,
                        amount: DEFAULT_BINDING_AMOUNT,
                        returnUrl: BINDING_RETURN_URL,
                        description: DESCRIPTION,
                        clientId: consumer.bankClientId,
                        mdOrder: registeredOrder.data?.orderId,
                    };
                case PROVIDERS.STRIPE:
                case PROVIDERS.STRIPE_TEST:
                    return {
                        ...data,
                        amount: 0,
                        description: stripe.BINDING.DESCRIPTION,
                        clientId: registeredOrder.data?.customer,
                        mdOrder: registeredOrder.data?.id,
                    };
            }
        },
        response: (paymentMethod, registeredOrder) => {
            switch (paymentMethod) {
                case PROVIDERS.ID_BANK:
                    return { bankUrl: registeredOrder.data.formUrl, orderId: registeredOrder.data.orderId, success: true };
                case PROVIDERS.STRIPE:
                case PROVIDERS.STRIPE_TEST:
                    return { clientSecret: registeredOrder.data.client_secret, customer: registeredOrder.data.customer, success: true };
            }
        }
    },
    delete: {
        payload: (paymentMethod, card) => {
            switch (paymentMethod) {
                case PROVIDERS.ID_BANK:
                    return card.bindingId;
                case PROVIDERS.STRIPE:
                case PROVIDERS.STRIPE_TEST:
                    return card.paymentMethodId;
            }
        }
    },
    addCardByType: {
        getPaymentTypeType: (paymentType) => {
            switch (paymentType) {
                case CARD_TYPES.apple:
                    return TYPE.APPLE_PAY;
                case CARD_TYPES.google:
                    return TYPE.GOOGLE_PAY;
            }
        }
    }
};