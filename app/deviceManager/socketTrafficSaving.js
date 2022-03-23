const utils = require('./utils');
const { client: { secret, privateKeyPath }, TRAFFIC_SAVING: {INTERVAL, TIMEOUT} } = require('app/settings');

let ioSocketTrafficSaving;
module.exports = {
    init: function(server) {
        const isValid = (socket) => {
            const token = socket.handshake.auth.token;
            const secretFromPayload = utils.decryptStringWithRsaPrivateKey(token, privateKeyPath);
            if (secret === secretFromPayload) {
                return true;
            }
            return false;
        }

        // start socket.io server and cache io value
        ioSocketTrafficSaving = require('socket.io')(server, {
            path: '/socketTrafficSaving',
            pingTimeout: parseInt(TIMEOUT),
            pingInterval: parseInt(INTERVAL)
        });
        ioSocketTrafficSaving.use((socket, next) => {
            if (isValid(socket)) {
              next();
            } else {
              next(new Error('invalid credentials'));
            }
        });
        return ioSocketTrafficSaving;
    },
    getio: function() {
        // return previously cached value
        if (!ioSocketTrafficSaving) {
            throw new Error('must call .init(server) before you can call .getio()');
        }
        return ioSocketTrafficSaving;
    }
}
