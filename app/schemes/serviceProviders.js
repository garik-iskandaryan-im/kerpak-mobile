const CONSTANTS = require('app/constants');

module.exports = {
    get: {
        properties: {
            id: { type: 'number' }
        },
        required: ['id']
    },
    create: {
        properties: {
            legalName: {
                type: 'string',
                maxLength: 255,
            },
            brandName: {
                type: 'string',
                maxLength: 255,
            },
            description: {
                type: 'string',
                maxLength: 255,
            },
            address1: {
                type: 'string',
                maxLength: 255,
            },
            address2: {
                type: 'string',
                maxLength: 255,
            },
            city: {
                type: 'string',
                maxLength: 255,
            },
            state: {
                type: 'string',
                maxLength: 255,
            },
            country: {
                type: 'string',
                maxLength: 255,
            },
            zipCode: {
                type: 'string',
                maxLength: 255,
            },
            regionId: {
                type: 'number',
            },
            contactPhone: {
                type: 'string',
                maxLength: 255,
            },
            webSite: {
                type: 'string',
                maxLength: 255,
            },
            facebookAccount: {
                type: 'string',
                maxLength: 255,
            },
            yelpAccount: {
                type: 'string',
                maxLength: 255,
            },
            instagramAccount: {
                type: 'string',
                maxLength: 255,
            },
            logo: {
                type: 'string',
                maxLength: 255,
            },
            secondaryLogo: {
                type: 'string',
                maxLength: 255,
            },
            catalogueImage: {
                type: 'string',
                maxLength: 255,
            },
            termsConditions: {
                type: 'string',
                maxLength: 255,
            },
            splashLoader: {
                type: 'string',
                maxLength: 255,
            },
            privacyPolicy: {
                type: 'string',
                maxLength: 255,
            },
            bankAccountType: {
                enum: CONSTANTS.BANK_ACCOUNT_TYPES.map(marker => marker.id),
            },
            bankCountry: {
                type: 'string',
                maxLength: 255,
            },
            bankCurrency: {
                type: 'string',
                maxLength: 255,
            },
            bankName: {
                type: 'string',
                maxLength: 255,
            },
            bankAccountName: {
                type: 'string',
                maxLength: 255,
            },
            bankAccountNumber: {
                type: 'number',
            },
            swiftBic: {
                type: 'string',
                maxLength: 255,
            },
            bankRoutingNumber: {
                type: 'string',
                maxLength: 255,
            },
            bankRegistrationNumber: {
                type: 'string',
                maxLength: 255,
            },
            taxpayerIdentificationNumber: {
                type: 'string',
                maxLength: 255,
            },
            timezone: {
                type: 'string'
            },
            isTesting: {
                type: 'boolean',
            },
            isGg: {
                type: 'boolean',
            },
            multiTenantSupport: {
                type: 'boolean',
            },
            allowPaymentByCredit: {
                type: 'boolean'
            },
            creditAmount: {
                type: 'number'
            },
            isCoffeemania: {
                type: 'boolean',
            },
            isSpAllowDelivery: {
                type: 'boolean',
            },
            pinIcon: {
                type: 'string',
                maxLength: 255,
            },
            labelMonochrome: {
                type: 'string',
                maxLength: 255,
            },
            primaryLogo: {
                type: 'string',
                maxLength: 255,
            },
            primaryMonochrome: {
                type: 'string',
                maxLength: 255,
            },
        },
        required: [
            'legalName', 'brandName', 'address1',
            'city', 'state', 'country', 'zipCode',
            'regionId', 'contactPhone', 'bankCountry',
            'bankCurrency', 'bankName', 'bankAccountName',
            'bankAccountNumber', 'swiftBic', 'isTesting', 'isGg',
            'multiTenantSupport', 'isSpAllowDelivery'
        ]
    },
    update: {
        properties: {
            legalName: {
                type: 'string',
                maxLength: 255,
            },
            brandName: {
                type: 'string',
                maxLength: 255,
            },
            description: {
                type: 'string',
                maxLength: 255,
            },
            address1: {
                type: 'string',
                maxLength: 255,
            },
            address2: {
                type: 'string',
                maxLength: 255,
            },
            city: {
                type: 'string',
                maxLength: 255,
            },
            state: {
                type: 'string',
                maxLength: 255,
            },
            country: {
                type: 'string',
                maxLength: 255,
            },
            zipCode: {
                type: 'string',
                maxLength: 255,
            },
            regionId: {
                type: 'number',
            },
            contactPhone: {
                type: 'string',
                maxLength: 255,
            },
            webSite: {
                type: 'string',
                maxLength: 255,
            },
            facebookAccount: {
                type: 'string',
                maxLength: 255,
            },
            yelpAccount: {
                type: 'string',
                maxLength: 255,
            },
            instagramAccount: {
                type: 'string',
                maxLength: 255,
            },
            logo: {
                type: 'string',
                maxLength: 255,
            },
            secondaryLogo: {
                type: 'string',
                maxLength: 255,
            },
            catalogueImage: {
                type: 'string',
                maxLength: 255,
            },
            termsConditions: {
                type: 'string',
                maxLength: 255,
            },
            splashLoader: {
                type: 'string',
                maxLength: 255,
            },
            privacyPolicy: {
                type: 'string',
                maxLength: 255,
            },
            bankAccountType: {
                enum: CONSTANTS.BANK_ACCOUNT_TYPES.map(marker => marker.id),
            },
            bankCountry: {
                type: 'string',
                maxLength: 255,
            },
            bankCurrency: {
                type: 'string',
                maxLength: 255,
            },
            bankName: {
                type: 'string',
                maxLength: 255,
            },
            bankAccountName: {
                type: 'string',
                maxLength: 255,
            },
            bankAccountNumber: {
                type: 'number',
            },
            swiftBic: {
                type: 'string',
                maxLength: 255,
            },
            bankRoutingNumber: {
                type: 'string',
                maxLength: 255,
            },
            bankRegistrationNumber: {
                type: 'string',
                maxLength: 255,
            },
            taxpayerIdentificationNumber: {
                type: 'string',
                maxLength: 255,
            },
            timezone: {
                type: 'string'
            },
            isTesting: {
                type: 'boolean'
            },
            isGg: {
                type: 'boolean'
            },
            multiTenantSupport: {
                type: 'boolean'
            },
            allowPaymentByCredit: {
                type: 'boolean'
            },
            creditAmount: {
                type: 'number'
            },
            isCoffeemania: {
                type: 'boolean',
            },
            isSpAllowDelivery: {
                type: 'boolean',
            },
            pinIcon: {
                type: 'string',
                maxLength: 255,
            },
            labelMonochrome: {
                type: 'string',
                maxLength: 255,
            },
            primaryLogo: {
                type: 'string',
                maxLength: 255,
            },
            primaryMonochrome: {
                type: 'string',
                maxLength: 255,
            },
        },
        required: []
    },
};