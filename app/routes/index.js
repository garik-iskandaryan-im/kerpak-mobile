const ping = require('./ping');

const express = require('express');
const router = express.Router();

/* configure swagger */
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerDocument = require('app/swagger/swagger.js');

const swaggerSpec = swaggerJSDoc(swaggerDocument.options);

router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
router.get('/docs', swaggerUi.setup(swaggerSpec));
/* configure swagger end */

require('./auth')(router);
require('./cards')(router);
require('./consumers')(router);
require('./device')(router);
require('./iso2')(router);
require('./kiosks')(router);
require('./menus')(router);
require('./productItems')(router);
require('./serviceProvider')(router);
require('./orders')(router);
require('./review')(router);
require('./regionLogs')(router);
require('./regions')(router);
require('./preOrders')(router);
// require('./integrations/gg/checkToken')(router);
// require('./integrations/gg/device')(router);
// require('./integrations/gg/kiosks')(router);
// require('./integrations/gg/serviceProvider')(router);
// require('./integrations/gg/orders')(router);
router.use('/ping', ping);

module.exports = router;