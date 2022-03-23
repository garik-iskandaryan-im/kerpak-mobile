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
require('./users')(router);
require('./serviceProviders')(router);
require('./kiosks')(router);
require('./consumers')(router);
require('./itemTransfers')(router);
require('./kioskSessions')(router);
require('./menuItems')(router);
require('./menus')(router);
require('./orders')(router);
require('./productItems')(router);
require('./cards')(router);
require('./transactions')(router);
require('./device')(router);
require('./integrations')(router);
require('./itemsWriteOffs')(router);
require('./files')(router);
require('./dashboard')(router);
require('./warehouses')(router);
require('./categories')(router);
require('./defaultCategories')(router);
require('./menuTags')(router);
require('./reviews')(router);
require('./writeOffReasons')(router);
require('./notifications')(router);
require('./foodProviders')(router);
require('./organizations')(router);
require('./preOrders')(router);
require('./regions')(router);
require('./consumer/serviceProvider')(router);
require('./consumer/kiosks')(router);
require('./consumer/device')(router);
require('./consumer/menus')(router);
require('./consumer/consumers')(router);
require('./consumer/productItems')(router);
require('./consumer/orders')(router);
require('./consumer/cards')(router);
require('./consumer/review')(router);
require('./consumer/regionLogs')(router);
require('./consumer/iso2')(router);
require('./consumer/auth')(router);
require('./consumer/regions')(router);
require('./preOrders')(router);
require('./consumer/preOrders')(router);
require('./integrations/gg/serviceProvider')(router);
require('./integrations/gg/kiosks')(router);
require('./integrations/gg/checkToken')(router);
require('./integrations/gg/device')(router);
require('./integrations/gg/orders')(router);
require('./integrations/coffeemania/serviceProvider')(router);
require('./integrations/coffeemania/kiosks')(router);
require('./integrations/coffeemania/checkToken')(router);
require('./integrations/coffeemania/device')(router);
require('./integrations/coffeemania/orders')(router);
router.use('/ping', ping);

module.exports = router;