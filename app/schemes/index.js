'use strict';

/**
 * Return an object of all scheme objects
 */
module.exports = {
    auth: require('./auth'),
    users: require('./users'),
    accounts: require('./accounts'),
    kiosks: require('./kiosks'),
    serviceProviders: require('./serviceProviders'),
    consumers: require('./consumers'),
    itemTransfers: require('./itemTransfers'),
    kioskSessions: require('./kioskSessions'),
    menuItems: require('./menuItems'),
    menus: require('./menus'),
    orders: require('./orders'),
    productItems: require('./productItems'),
    cards: require('./cards'),
    transactions: require('./transactions'),
    device: require('./device'),
    integrations: require('./integrations'),
    itemsWriteOffs: require('./itemsWriteOffs'),
    warehouses: require('./warehouses'),
    review: require('./review'),
    notification: require('./notification'),
    organizations: require('./organizations'),
    preOrders: require('./preOrders')
};
