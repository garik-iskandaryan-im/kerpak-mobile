'use strict';

module.exports = {
    getAccounts: {
        properties: {
            stateScope: {
                type: 'string',
                default: 'active',
                enum: ['active', 'inactive']
            },
            orderByField: {
                type: 'string',
                default: 'updatedAt',
                enum: ['createdDate', 'updatedAt', 'name', 'isActive']
            },
            orderBySort: {
                type: 'string',
                default: 'desc',
                enum: ['asc', 'desc']
            }
        }
    },
    getAccount: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            }
        },
        required: ['account']
    },
    putAccount: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'},
                    name: {type: 'string'},
                    contractedValue: {type: 'integer'},
                    isActive: {type: 'boolean'},
                    optimizeAccountId: {type: 'integer'}
                },
                required: ['guid']
            },
            products: {
                type: 'array',
                items: [{type: 'string'}]
            }
        },
        required: ['account']
    },
    postAccount: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    name: {type: 'string'},
                    isActive: {type: 'boolean', default: true},
                    contractedValue: {type: 'integer'}
                },
                required: ['name']
            },
            products: {
                type: 'array',
                items: [{type: 'string'}]
            }
        },
        required: ['account', 'products']
    },
    getUserCan: {
        properties: {
            authorized: {type: 'boolean'}
        },
        required: ['authorized']
    },
    getUsers: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            }
        },
        required: ['account']
    },
    getUserRights: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            }
        },
        required: ['account']
    },
    postUsers: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            },
            user: {
                type: 'object',
                properties: {
                    fistName: {type: 'string'},
                    lastName: {type: 'string'},
                    email: {type: 'string', format: 'email'}
                },
                required: ['firstName', 'lastName', 'email']
            },
            roles: {
                type: 'array',
                items: [{type: 'string', format: 'uuid'}]
            }
        },
        required: ['account', 'user', 'roles']
    },
    getUser: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            },
            user: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            }
        },
        required: ['account', 'user']
    },
    putUser: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            },
            user: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'},
                    isPowerUser: {type: 'boolean', default: false},
                    isHelpContentManager: {type: 'boolean', default: false},
                    isBetaTesterUser: {type: 'boolean', default: false}
                },
                required: ['guid']
            },
            roles: {
                type: 'object',
                properties: {
                    roles: {
                        type: 'array',
                        items: [{type: 'string', format: 'uuid'}]
                    },
                    microsoftSSOSettings: {
                        type: 'object',
                        properties: {
                            microsoftSSOEnabled: {type: 'boolean'},
                            domain: {type: 'string'}
                        }
                    }
                },
                required: ['roles', 'microsoftSSOSettings']
            }
        },
        required: ['account', 'user', 'roles']
    },
    getRoles: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            }
        },
        required: ['account']
    },
    putFlag: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            },
            flags: {
                type: 'array',
                items: [{type: 'object'}]
            }
        },
        required: ['account', 'flags']
    },
    putReporting: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            },
            reportings: {
                type: 'array',
                items: [{type: 'object'}]
            }
        },
        required: ['account', 'reportings']
    },
    postRole: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            },
            product: {
                type: 'object',
                properties: {
                    guid: {type: 'string'}
                },
                required: ['guid']
            },
            role: {
                type: 'object',
                properties: {
                    name: {type: 'string'},
                    description: {type: 'string'},
                    isDefault: {type: 'boolean'}
                },
                required: ['name', 'description', 'isDefault']
            },
            rights: {
                type: 'array',
                items: [{type: 'string'}]
            }
        },
        required: ['account', 'product', 'role', 'rights']
    },
    getRole: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            },
            role: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            }
        },
        required: ['account', 'role']
    },
    putRole: {
        properties: {
            account: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'}
                },
                required: ['guid']
            },
            product: {
                type: 'object',
                properties: {
                    guid: {type: 'string'}
                },
                required: ['guid']
            },
            role: {
                type: 'object',
                properties: {
                    guid: {type: 'string', format: 'uuid'},
                    name: {type: 'string'},
                    description: {type: 'string'}
                },
                required: ['guid', 'name', 'description']
            },
            rights: {
                type: 'array',
                items: [{type: 'string'}]
            }
        },
        required: ['account', 'product', 'role', 'rights']
    },
};