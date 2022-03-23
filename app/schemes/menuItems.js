const allergens = require('./allergens');
const dietaryMarkers = require('./dietaryMarkers');
const nutritionFacts = require('./nutritionFacts');
const CONSTANTS = require('app/constants');

module.exports = {
    get: {
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    },
    importCSV: {
        type: 'array',
        items: {
            properties: {
                name: {
                    type: 'string',
                    maxLength: 255,
                    minLength: 1,
                },
                description: {
                    type: 'string',
                    maxLength: 1024
                },
                ingredients: {
                    type: 'string',
                    maxLength: 2000
                },
                sku: {
                    type: 'string',
                    maxLength: 255,
                    minLength: 1,
                },
                barcode: {
                    type: 'string',
                    pattern: '^[0-9]{8}$|^[0-9]{13}$'
                },
                caloriesCount: {
                    type: ['number', 'null'],
                },
                category: {
                    type: 'string',
                    maxLength: 255
                },
                price: {
                    type: 'number'
                },
                weight: {
                    type: ['number', 'null'],
                },
                duration: {
                    type: 'number'
                },
                durationType: {
                    enum: CONSTANTS.DURATION_TYPES.map(durationTypeValue => durationTypeValue),
                },
                isGenerateUniqueEAN5: {
                    type: 'boolean'
                },
            },
            required: ['name', 'sku', 'barcode', 'category', 'price', 'serviceProviderId', 'duration', 'durationType', 'isGenerateUniqueEAN5']
        }
    },
    create: {
        properties: {
            sku: {
                type: 'string',
                maxLength: 255,
                minLength: 1,
            },
            barcode: {
                type: 'string',
                pattern: '^[0-9]{8}$|^[0-9]{13}$'
            },
            name: {
                type: 'string',
                maxLength: 255,
                minLength: 1,
            },
            description: {
                type: 'string',
                maxLength: 1024
            },
            image: {
                type: 'string',
                maxLength: 255
            },
            caloriesCount: {
                type: ['number', 'null'],
            },
            price: {
                type: 'number'
            },
            weight: {
                type: ['number', 'null'],
            },
            duration: {
                type: 'number'
            },
            ingredients: {
                type: 'string',
                maxLength: 2000
            },
            category: {
                type: 'string',
                maxLength: 255
            },
            category1: {
                type: 'string',
                maxLength: 255
            },
            category2: {
                type: 'string',
                maxLength: 255
            },
            allergens: {
                type: ['array', 'null'],
                items: allergens.create
            },
            dietaryMarkers: {
                type: ['array', 'null'],
                items: dietaryMarkers.create
            },
            nutritionFacts: {
                type: ['array', 'null'],
                items: nutritionFacts.create
            },
            durationType: {
                enum: CONSTANTS.DURATION_TYPES.map(durationTypeValue => durationTypeValue),
            },
            isGenerateUniqueEAN5: {
                type: 'boolean'
            }
        },
        required: ['sku', 'barcode', 'name', 'price', 'category', 'serviceProviderId', 'duration', 'durationType', 'isGenerateUniqueEAN5']
    },
    delete: {
        properties: {
            ids: {
                type: 'array',
                items: [{type: 'number'}]
            }
        },
        required: ['id']
    },
    restore: {
        properties: {
            ids: {
                type: 'array',
                items: [{type: 'number'}]
            }
        },
        required: ['id']
    },
    archive: {
        properties: {
            ids: {
                type: 'array',
                items: [{type: 'number'}]
            }
        },
        required: ['id']
    },
};
