module.exports = {
    get: {
        properties: {
            ip: { type: 'string' }
        },
        required: ['ip']
    },
    setStatus: {
        properties: {
            ip: { type: 'string' },
            lock: { type: 'boolean' }
        },
        required: ['ip', 'lock']
    },
    openDoor:{
        properties: {
            id: { type: 'number' }
        },
        required: ['id']
    },
    getVideo:{
        properties: {
            videoId: { type: 'string' },
            sessionId: { type: 'string' }
        },
        required: ['videoId', 'sessionId']
    }
};
