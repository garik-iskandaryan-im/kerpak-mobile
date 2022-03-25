module.exports.options = {
    swaggerDefinition: {
        openapi: '3.0.3',
        info: {
            title: 'Kerpak APP mobile APIs',
            version: '1.0.0',
            description: 'Kerpak APP mobile APIs Documentation',
        },
        tags: [],
        schemes: ['https', 'http'],
        host: 'localhost:4001',
        basePath: '/api',
        servers: [{
            url: 'http://localhost:4001/api'
        }, {
            url: 'https://staging.kerpaktech.com/api'
        }, {
            url: 'https://integration.kerpaktech.com/api'
        }],
        securityDefinitions: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
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
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: [
        './app/controllers/auth.js',
        './app/controllers/cards.js',
        './app/controllers/consumers.js',
        './app/controllers/device.js',
        './app/controllers/iso2.js',
        './app/controllers/kiosks.js',
        './app/controllers/menus.js',
        './app/controllers/orders.js',
        './app/controllers/preOrders.js',
        './app/controllers/productItems.js',
        './app/controllers/regionLogs.js',
        './app/controllers/regions.js',
        './app/controllers/review.js',
        './app/controllers/serviceProviders.js',
        /*
        './app/controllers/integrations/gg/checkToken.js',
        './app/controllers/integrations/gg/kiosks.js',
            './app/controllers/integrations/gg/serviceProviders.js',
            './app/controllers/integrations/gg/device.js',
            './app/controllers/integrations/gg/orders.js',
            './app/controllers/integrations/coffeemania/checkToken.js',
            './app/controllers/integrations/coffeemania/serviceProviders.js',
            './app/controllers/integrations/coffeemania/kiosks.js',
            './app/controllers/integrations/coffeemania/device.js',
            './app/controllers/integrations/coffeemania/orders.js',
        */
    ],
};