const {
    ORDER: {
        idBank: {
            BINDING: { BINDING_RETURN_URL },
            REQUEST_TO_BANK_WAITING_TIME
        },
    },
    payment: { PROVIDERS, TYPE },
} = require('app/settings');
const {
    stripeAccountCustomers: StripeAccountCustomers,
    orders: Orders
} = require('app/models/models');
const { calculatePrice } = require('app/controllers/common');
const { PAGE_VIEW, CARD_TYPES } = require('app/constants');
const { shouldAllowPayment } = require('app/services/payment');
const { addNotEnoughMoneyMsg } = require('app/helpers/utils');
const log = require('app/helpers/logger');

module.exports = {
    pay: {
        payload: async ({ transactionId, amount, serviceProvider, defaultCard, consumer, orderId, kioskName }) => {
            const getStripePayload = async () => {
                const payload = {
                    customer: consumer.stripeCustomerId,
                    amount: calculatePrice(amount),
                    currency: consumer.region.currencyName,
                    payment_method_types: ['card'],
                    off_session: true,
                    confirm: true,
                    payment_method: defaultCard.paymentMethodId,
                    stripeAccount: serviceProvider.stripeId,
                    description: `Order #${orderId} from ${kioskName}`
                };
                const connectedAccountCustomerData = await StripeAccountCustomers.findOne({ where: { consumerId: consumer.id, serviceProviderId: serviceProvider.id } });
                if (connectedAccountCustomerData?.customerId) {
                    payload.connectedAccountCustomer = connectedAccountCustomerData.customerId;
                }
                return payload;
            };
            switch (consumer.region.paymentMethod) {
                case PROVIDERS.ID_BANK:
                    return {
                        orderNumber: transactionId,
                        amount: calculatePrice(amount),
                        clientId: consumer.bankClientId,
                        returnUrl: BINDING_RETURN_URL,
                        description: `Kerpak - ${serviceProvider.legalName}`,
                        currency: consumer.region.currencyCode,
                        language: consumer.region.language,
                        pageView: PAGE_VIEW.DESKTOP,
                        bindingId: defaultCard.bindingId,
                        useBinding: true,
                    };
                case PROVIDERS.STRIPE:
                case PROVIDERS.STRIPE_TEST:
                    return await getStripePayload();
            }
        },
        checkError: ({ response, orderId, totalSum, serviceProvider, consumer }) => {
            const idBankError = async () => {
                if (response.register?.orderId) {
                    await Orders.update(
                        { bankOrderId: response.register.orderId },
                        { where: { id: orderId } }
                    );
                }
                if (response.err?.name === 'TimeoutError') {
                    if (await shouldAllowPayment(totalSum, serviceProvider, consumer.id)) {
                        await Orders.update({ isRegisterTimeout: true }, { where: { id: orderId } });
                        return { success: true, orderId };
                    }
                    log.error(response, 'order::controller::pay::payOrder::TimeoutError');
                    return { success: false, error: 'Order not processed', orderId, info: `timeout after ${REQUEST_TO_BANK_WAITING_TIME} seconds` };
                }
                log.error(response, 'order::controller::pay::payOrder::idBankError');
                addNotEnoughMoneyMsg(response);
                return { success: false, ...response, orderId };
            };
            const stripeError = async () => {
                // TODO: check enough money
                // addNotEnoughMoneyMsg(response);
                log.error(response, 'order::controller::pay::payOrder::stripeError');
                return { success: false, ...response, orderId };
            };

            switch (consumer.region.paymentMethod) {
                case PROVIDERS.ID_BANK:
                    return idBankError();
                case PROVIDERS.STRIPE:
                case PROVIDERS.STRIPE_TEST:
                    return stripeError();
            }
        },
        getBankOrderId: (paymentMethod, response) => {
            switch (paymentMethod) {
                case PROVIDERS.ID_BANK:
                    return response.register?.orderId;
                case PROVIDERS.STRIPE:
                case PROVIDERS.STRIPE_TEST:
                    return response.data?.id;
            }
        },
        transactionData: ({ transactionId, amount, orderId, description, serviceProviderId, bankOrderId, consumer }) => {
            const transactionData = {
                transactionId,
                paymentType: TYPE.BANK_CARD,
                paymentProvider: consumer.region.paymentMethod,
                amount,
                orderId,
                description,
                serviceProviderId,
                mdOrder: bankOrderId,
            };
            switch (consumer.region.paymentMethod) {
                case PROVIDERS.ID_BANK:
                    return {
                        ...transactionData,
                        clientId: consumer.bankClientId,
                    };
                case PROVIDERS.STRIPE:
                case PROVIDERS.STRIPE_TEST:
                    return {
                        ...transactionData,
                        clientId: consumer.stripeCustomerId,
                    };
            }
        },
    },
    checkStatus: {
        payload: (paymentMethod, { mdOrder, stripeAccount }) => {
            switch (paymentMethod) {
                case PROVIDERS.ID_BANK:
                    return {
                        orderId: mdOrder,
                        useBinding: true
                    };
                case PROVIDERS.STRIPE:
                case PROVIDERS.STRIPE_TEST:
                    return {
                        orderId: mdOrder,
                        stripeAccount
                    };
            }
        },
        checkError: (paymentMethod, response) => {
            switch (paymentMethod) {
                case PROVIDERS.ID_BANK:
                    return response.hasError || response.data?.orderStatus !== 2;
                case PROVIDERS.STRIPE:
                case PROVIDERS.STRIPE_TEST:
                    return response.hasError || response.data?.status !== 'succeeded';
            }
        },
    },
    register: {
        payload: async ({ amount, currency, consumer, orderId, kiosk }) => {
            const payload = {
                customer: consumer.stripeCustomerId,
                stripeAccount: kiosk.serviceProvider.stripeId,
                amount: calculatePrice(amount),
                currency,
                setup_future_usage: 'off_session',
                automatic_payment_methods: {
                    enabled: true
                },
                description: `Order #${orderId} from ${kiosk.displayName}`
            };
            const connectedAccountCustomerData = await StripeAccountCustomers.findOne({ where: { consumerId: consumer.id, serviceProviderId: kiosk.serviceProvider.id } });
            if (connectedAccountCustomerData?.customerId) {
                payload.connectedAccountCustomer = connectedAccountCustomerData.customerId;
            }
            return payload;
        },
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