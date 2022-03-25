
const {
    ORDER: {
        stripe: {
            TEST_PUBLISHABLE_KEY,
            PUBLISHABLE_KEY
        }
    },
    payment: { PROVIDERS },
    auth: { verificationCodeLength }
} = require('app/settings');
const moment = require('moment');

const YEREVAN_TIME_ZONE = '+04:00';
const YEREVAN_OFFSET = 4;

const makeId = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let index = 0; index < length; ++index) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};
const createVerificationCode = () => {
    return Math.floor(verificationCodeLength / 10 + Math.random() * verificationCodeLength * 0.9);
};

const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);  // deg2rad below
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
};

const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
};

const capitalize = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

const getKioskOffset = (kiosk) => +kiosk?.serviceProvider?.timezone?.split(':')[0] || YEREVAN_OFFSET;

const addNotEnoughMoneyMsg = (response) => {
    const notEnoughMoneyMsg = 'Please check the data and available balance of the card';
    if (response?.paymentOrderBinding?.info.includes(notEnoughMoneyMsg)) {
        response.data.info = response.paymentOrderBinding.info;
    }
};
// TODO: need to delete
const getRegionConfigForMobile = (region) => {
    const allowedPaymentMethods = [];
    if (region.paymentMethod === PROVIDERS.ID_BANK) {
        allowedPaymentMethods.push({
            name: 'IDRAM'
        });
    } else if (region.paymentMethod === PROVIDERS.STRIPE) {
        allowedPaymentMethods.push({
            name: 'STRIPE',
            publishableKey: PUBLISHABLE_KEY
        });
    } else if (region.paymentMethod === PROVIDERS.STRIPE_TEST) {
        allowedPaymentMethods.push({
            name: 'STRIPE_TEST',
            publishableKey: TEST_PUBLISHABLE_KEY
        });
    }
    return {
        countryISO: region.isoCode,
        regionalSettings: region.isoCode.toUpperCase(),
        default: region.isDefault,
        initialPosition: {
            latitude: region.initialPositionLatitude,
            longitude: region.initialPositionLongitude,
            latitudeDelta: region.initialPositionLatitudeDelta,
            longitudeDelta: region.initialPositionLongitudeDelta
        },
        allowedPaymentMethods
    };
};

const collectDateString = (dateTime, format, timezone = YEREVAN_TIME_ZONE) => moment(dateTime).utcOffset(timezone).format(format).toString();

module.exports = { makeId, createVerificationCode, getDistanceFromLatLonInKm, getRegionConfigForMobile, getKioskOffset, capitalize, addNotEnoughMoneyMsg, collectDateString };