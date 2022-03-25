module.exports = {
    protocol: 'https',
    // port: '443',
    // interval: 300000,
    requestOptions: {
        responseType: 'json',
        https: {
            rejectUnauthorized: false,
        },
        timeout: 10000
    },
    api: {
        // TEMPERATURE: '/api/fridgeTemperature',
        // STATUS: '/api/kioskStatus',
        // TERMINAL_ID: '/api/terminalId',
        // DOOR_LOCK_STATUS: '/api/kioskDoorLockStatus',
        DOOR_LOCK: '/api/kioskDoorLock',
        // LOCK: '/api/kioskLock'
    }
};