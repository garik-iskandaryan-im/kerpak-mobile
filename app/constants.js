'use strict';

module.exports = {
    JSON_TOKEN_TYPES: {
        // CONTROLER: 'controler',
        // USER_AUTH: 'auth',
        CONSUMER_AUTH: 'consumer-auth',
        // USER_SET_PASSWORD: 'setPass',
        // USER_REGISTER: 'register',
        GG: 'GG-token',
        COFFEE_MANIA: 'Coffeemania-token'
    },
    KIOSK_STATUSES: ['active', 'blocked', 'disabled', 'archived', 'pending'],
    DURATION_TYPES: ['hour', 'day', 'month'],
    BALANCE_TYPE: ['spent', 'refund', 'top-up', 'returned'],
    WEEK_DAYS: [
        {
            id: 'monday',
            name: 'Monday'
        },
        {
            id: 'tuesday',
            name: 'Tuesday'
        },
        {
            id: 'wednesday',
            name: 'Wednesday'
        },
        {
            id: 'thursday',
            name: 'Thursday'
        },
        {
            id: 'friday',
            name: 'Friday'
        },
        {
            id: 'saturday',
            name: 'Saturday'
        },
        {
            id: 'sunday',
            name: 'Sunday'
        }
    ],
    BANK_ACCOUNT_TYPES: [
        {
            id: 'personal',
            name: 'Personal'
        },
        {
            id: 'business',
            name: 'Business'
        }
    ],
    DIETARY_MARKERS: [
        {
            id: 'VG',
            name: 'VG (Vegan)'
        },
        {
            id: 'V',
            name: 'V (Vegetarian)'
        },
        {
            id: 'GF',
            name: 'GF (Gluten Free)'
        },
        {
            id: 'DF',
            name: 'DF (Dairy Free)'
        },
        {
            id: 'SF',
            name: 'SF (Sugar Free)'
        },
        {
            id: 'N',
            name: 'N (Contains Nuts)'
        },
        {
            id: 'K',
            name: 'K (Keto)'
        },
        {
            id: 'LF',
            name: 'LF (Low Fat)'
        },
        {
            id: 'LC',
            name: 'LC (Low Calories)'
        },
        {
            id: 'KSH',
            name: 'KSH (Kosher)'
        },
        {
            id: 'HL',
            name: 'HL (Halal)'
        }
    ],
    ALLERGENS: [
        {
            id: 'celery',
            name: 'Celery'
        },
        {
            id: 'gluten',
            name: 'Gluten'
        },
        {
            id: 'crustacean',
            name: 'Crustacean'
        },
        {
            id: 'eggs',
            name: 'Eggs'
        },
        {
            id: 'fish',
            name: 'Fish'
        },
        {
            id: 'lupins',
            name: 'Lupins'
        },
        {
            id: 'milk',
            name: 'Milk'
        },
        {
            id: 'sulphite',
            name: 'Sulphite'
        },
        {
            id: 'mustard',
            name: 'Mustard'
        },
        {
            id: 'peanuts',
            name: 'Peanuts'
        },
        {
            id: 'sesame',
            name: 'Sesame'
        },
        {
            id: 'soya',
            name: 'Soya'
        },
        {
            id: 'shelfish',
            name: 'Shelfish'
        },
        {
            id: 'nuts',
            name: 'Nuts'
        },
        {
            id: 'mushrooms',
            name: 'Mushrooms'
        },
        {
            id: 'n/a',
            name: 'n/a'
        }
    ],
    PURCHASE_STATUS: [
        {
            id: 'completed',
            name: 'Completed'
        },
        {
            id: 'cancelled',
            name: 'Cancelled'
        },
        {
            id: 'pending',
            name: 'Pending'
        }
    ],
    ORDER_STATUS: [
        {
            id: 'successful',
            name: 'Successful'
        },
        {
            id: 'errorCode',
            name: 'Error Code'
        },
        {
            id: 'pending',
            name: 'Pending'
        },
        {
            id: 'fail',
            name: 'Fail'
        }
    ],
    PRODUCT_ITEM_STATUS_ALLOWED: [
        {
            id: 'available',
            name: 'Available'
        },
        {
            id: 'written-off',
            name: 'Written-off'
        },
        {
            id: 'sold',
            name: 'Sold'
        }
    ],
    TRANSFER_STATUS_ALLOWED: [
        {
            id: 'pending',
            name: 'Pending'
        },
        {
            id: 'completed',
            name: 'Completed'
        }
    ],
    PRE_ORDER_STATUS: {
        options: ['awaitingConfirmation', 'fulfilled', 'inTransfer', 'delivered', 'scanned', 'cancelled', 'rejected', 'cancelledDelivery'],
        default: 'awaitingConfirmation',
        allowedNextStatuses: {
            awaitingConfirmation: {
                consumerCancelStatus: 'cancelled',
            },
            fulfilled: {
                consumerCancelStatus: 'cancelled',
            },
            delivered: {
                consumerScanStatus: 'scanned',
                scannedStatus: 'scanned'
            }
        },
    },
    NOTIFICATION_SENT_TYPES: {
        options: ['sent', 'fail', 'notSent'],
        default: 'notSent',
    },
    INTEGRATION_TYPES: [
        {
            id: 'gg',
            name: 'GG'
        },
        {
            id: 'coffeemania',
            name: 'Coffeemania'
        },
    ],
    ITEM_AVAILABILITY: {
        options: ['availableAtKioskAndViaDelivery', 'deliveryExclusive', 'availableOnlyAtKiosk'],
        defaultValue: 'availableOnlyAtKiosk',
        deliveryPermission: ['deliveryExclusive', 'availableAtKioskAndViaDelivery'],
    },
    SMS_TYPES: ['twillo', 'AWS'],
    PAGE_VIEW: {
        DESKTOP: 'DESKTOP',
    },
    CARD_TYPES: {
        apple: 'apple',
        google: 'google'
    },
};