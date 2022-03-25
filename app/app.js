const express = require('express');

const path = require('path');
const bodyParser = require('body-parser');
const bunyan = require('bunyan');

const routes = require('./routes');
const settings = require('./settings');
const passport = require('app/middlewares/passport');
const logger = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');
const loggerMobileAuth = require('app/helpers/loggerMobileAuth');

let loggingStreams = [];
if (settings.env === 'production') {
    loggingStreams.push({
        type: 'rotating-file',
        path: path.resolve(__dirname, '../log', 'production.log')
    });
} else {
    loggingStreams.push({ level: 'info', stream: process.stdout });
    loggingStreams.push({ path: path.resolve(__dirname, '../log', 'development.log') });
}

const log = bunyan.createLogger({
    name: 'kerpak-app-server',
    streams: loggingStreams,
    serializers: bunyan.stdSerializers
});

const logValidations = bunyan.createLogger({
    name: 'kerpak-app-server:API-validations-log',
    streams: [{
        type: 'rotating-file',
        path: path.resolve(__dirname, '../log', 'apiValidations.log')
    }],
    serializers: bunyan.stdSerializers
});

const logMobileAuth = bunyan.createLogger({
    name: 'kerpak-app-server:Mobile-Auth-log',
    streams: [{
        type: 'rotating-file',
        path: path.resolve(__dirname, '../log', 'mobileAuth.log')
    }],
    serializers: bunyan.stdSerializers
});

const app = express();
app.disable('x-powered-by');

app.set('logger', log);
app.set('loggerValidations', logValidations);
app.set('loggerMobileAuth', logMobileAuth);

app.use(bodyParser.json({ limit: '50mb' }));

//init logs
logger.use(log);
loggerValidations.use(logValidations);
loggerMobileAuth.use(logMobileAuth);

log.info('Initializing');
loggerValidations.info('Initializing');

passport.use(settings.jwt, settings.jwt.secrets, log);
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

app.use('/api', routes);

// error handler
app.use(function (error, req, res, next) {
    logger.error({ error }, 'Error');
    res.status(error.status || 500).json({ error });
});

module.exports = app;