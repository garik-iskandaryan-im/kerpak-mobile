require('newrelic');
require('app-module-path').addPath(`${__dirname}/../`);

const http = require('http');

const settings = require('../app/settings');

const app = require('../app/app');
const models = require('../app/models/models');
const DBMigration = require('../app/migrations');
const io = require('../app/deviceManager/socket.js');
const socketTrafficSaving = require('../app/deviceManager/socketTrafficSaving.js');
const deviceManger = require('../app/deviceManager/deviceManager.js');

/**
 * Get port and store in express
 */

const port = normalizePort(settings.server.port || 3000);
app.set('port', port);

const server = http.createServer(app);
io.init(server);
socketTrafficSaving.init(server);
deviceManger.init();

models.sequelize.sync()
    .then(() => new DBMigration(models.sequelize, app.get('logger')).migrate())
    .then(() => {
        server.listen(port);
        server.on('error', onError);
        server.on('listening', onListening);
        return;
    })
    .catch((err) => {
        console.log('ERROR::', err);
    });

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
    let port = parseInt(val, 10);

    if(isNaN(port)) {
        // named pipe
        return val;
    }

    if(port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
    if(error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

    // handle specific listen errors with friendly messages
    switch (error.code) {
    case 'EACCES':
        console.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
    case 'EADDRINUSE':
        console.error(`${bind} is already in use`);
        process.exit(1);
        break;
    default:
        throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
    console.log(`Listening on ${bind}`);
}