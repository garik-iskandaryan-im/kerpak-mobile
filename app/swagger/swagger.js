module.exports.options = {
    swaggerDefinition: {
        openapi: '3.0.3',
        info: {
            title: 'Kerpak APP APIs',
            version: '1.0.0',
            description: 'Kerpak APP APIs Documentation',
        },
        tags: [
            {
                name: 'Authentication',
                // TO DO description: 'AUTH APIs',
            },
        ],
        schemes: ['https', 'http'],
        host: 'localhost:4000',
        basePath: '/api',
        servers: [{
            url: 'http://localhost:4000/api'
        }, {
            url: 'https://staging.kerpaktech.com/api'
        },{
            url: 'https://integration.kerpaktech.com/api'
        }],
        securityDefinitions: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            },
            cookieAuth: {
                type: 'apiKey',
                in: 'cookie',
                name: 'jwt'
            },
            petstore_auth: {
              type: "oauth2",
              authorizationUrl: "http://petstore.swagger.io/oauth/dialog",
              flow: "implicit",
              scopes: {
                'write:pets': "modify pets in your account",
                'read:pets': "read your pets"
              }
            },
            api_key: {
              type: "apiKey",
              name: "api_key",
              in: "header"
            }
        },
        components: {
            securitySchemes:{
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                },
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'jwt',
                }
            }
        }
    },
    apis: [
        './app/controllers/auth.js',
        './app/controllers/consumer/kiosks.js',
        './app/controllers/consumer/menus.js',
        './app/controllers/consumer/productItems.js',
        './app/controllers/consumer/serviceProviders.js',
        './app/controllers/consumer/consumers.js',
        './app/controllers/consumer/device.js',
        './app/controllers/consumer/orders.js',
        './app/controllers/consumer/cards.js',
        './app/controllers/consumer/review.js',
        './app/controllers/consumer/regionLogs.js',
        './app/controllers/consumer/auth.js',
        './app/controllers/consumer/regions.js',
        './app/controllers/users.js',
        './app/controllers/categories.js',
        './app/controllers/defaultCategories.js',
        './app/controllers/menuItems.js',
        './app/controllers/menus.js',
        './app/controllers/menuTags.js',
        './app/controllers/reviews.js',
        //'./app/controllers/writeOffReasons.js',
        './app/controllers/notifications.js',
        './app/controllers/cards.js',
        './app/controllers/orders.js',
        './app/controllers/serviceProviders.js',
        './app/controllers/kiosks.js',
        './app/controllers/preOrders.js',
        './app/controllers/foodProviders.js',
        './app/controllers/organizations.js',
        './app/controllers/consumers.js',
        './app/controllers/auth.js',
        './app/controllers/consumer/preOrders.js',
        './app/controllers/users.js',
        './app/controllers/preOrders.js',
        './app/controllers/consumer/consumers.js',
        './app/controllers/consumer/iso2.js',
        /*
        './app/controllers/integrations/gg/checkToken.js',
        './app/controllers/integrations/gg/serviceProviders.js',
        './app/controllers/integrations/gg/kiosks.js',
        './app/controllers/integrations/gg/device.js',
        './app/controllers/integrations/gg/orders.js',
        './app/controllers/integrations/coffeemania/checkToken.js',
        './app/controllers/integrations/coffeemania/serviceProviders.js',
        './app/controllers/integrations/coffeemania/kiosks.js',
        './app/controllers/integrations/coffeemania/device.js',
        './app/controllers/integrations/coffeemania/orders.js',
        */
        './app/controllers/productItems.js',
        './app/controllers/warehouses.js',
    ],
};