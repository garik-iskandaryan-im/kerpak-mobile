'use strict';

/**
 * Return an object of all scheme objects
 */
module.exports = {
    auth: require('./auth'),
    cards: require('./cards'),
    consumers: require('./consumers'),
    device: require('./device'),
    kiosks: require('./kiosks'),
    review: require('./review'),
    productItems: require('./productItems'),
    orders: require('./orders'),
    preOrders: require('./preOrders'),
};
