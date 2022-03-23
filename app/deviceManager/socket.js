const utils = require('./utils');
const { client: { secret, privateKeyPath } } = require('app/settings');

let io;
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
        io = require('socket.io')(server, {
            path: '/mysocket',
            pingTimeout: 10000,
            pingInterval: 2500
        });
        io.use((socket, next) => {
            if (isValid(socket)) {
              next();
            } else {
              next(new Error('invalid credentials'));
            }
        });
        return io;
    },
    getio: function() {
        // return previously cached value
        if (!io) {
            throw new Error('must call .init(server) before you can call .getio()');
        }
        return io;
    }
}
