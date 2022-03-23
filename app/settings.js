require('dotenv').config();

module.exports = {
    env: process.env.NODE_ENV,
    server: {
        port: 4000
    },
    auth: {
        verificationCodeLength: 10000,
        verificationCodeExpirationDate: process.env.VERIFICATION_CODE_EXPIRATION_DATE
    },
    sequelize: {
        host: process.env.DATABASE_HOST || 'localhost',
        dialect: 'mysql',
        database: process.env.DATABASE_NAME || 'kerpak',
        username: process.env.DATABASE_USERNAME || 'root',
        password: process.env.DATABASE_PASSWORD || 'root'
    },
    cookies: {
        guid: {
            name: 'ld_guid',
            maxAge: 63072000000, // 2 years
            httpOnly: false
        },
        sessionID: {
            name: 'ld_session_id',
            maxAge: 50400000, // 14 hours
        }
    },
    jwt: {
        jwt: {
            options: {
                issuer: 'KERPAKAPI',
                jwtSession: {
                    session: false
                },
                algorithm: 'HS256'
            },
            tokens: {
                auth: {
                    expiration: 172800,
                    /*2 days (in seconds)*/
                    refreshExpiration: 63072000000,
                    /* 2 years */
                },
                setPassword: {
                    expiration: 172800 /*2 days (in seconds)*/
                },
                register: {
                    expiration: 604800 /*7 days (in seconds)*/
                },
                mcAuth: {
                    expiration: 172800 /*2 days (in seconds)*/
                }
            }
        },
        secrets: {
            secretKeyBase: '536F6394F82850A6F34712B048586F74E060CF6F202D9E7ACB9F73823113B194',
            jwtRefreshSecret: 'ABC76394F82850A6F34712B048586F74E060CF6F202D9E7ACB9F73823113B194',
            GGSecretKeyBase: 'FD73FF6BCB8A59CB308F0555006C16CC451D58F906DEAD1FD99D5941EE233903',
            coffeemaniaSecretKeyBase: '4B6150645367566B58703273357638792F423F4528482B4D6251655468576D5A'
        }
    },
    ORDER: {
        idBank: {
            BINDING: {
                BINDING_RETURN_URL: process.env.BINDING_RETURN_URL || '/default',
                DEFAULT_BINDING_AMOUNT: parseInt(process.env.DEFAULT_BINDING_AMOUNT) || 10,
                DESCRIPTION: process.env.BINDING_DESCRIPTION || 'binding action for kerpak'
            },
            credentials: {
                1: {
                    USER_NAME: process.env.SARYAN_ID_BANK_BANK_USER_NAME,
                    PASSWORD: process.env.SARYAN_ID_BANK_BANK_PASSWORD,
                    BINDING_USER_NAME: process.env.SARYAN_ID_BANK_BANK_BINDING_USER_NAME,
                    BINDING_PASSWORD: process.env.SARYAN_ID_BANK_BANK_BINDING_PASSWORD,
                },
                3: {
                    USER_NAME: process.env.SARYAN_ID_BANK_BANK_USER_NAME,
                    PASSWORD: process.env.SARYAN_ID_BANK_BANK_PASSWORD,
                    BINDING_USER_NAME: process.env.SARYAN_ID_BANK_BANK_BINDING_USER_NAME,
                    BINDING_PASSWORD: process.env.SARYAN_ID_BANK_BANK_BINDING_PASSWORD,
                },
                4: {
                    USER_NAME: process.env.ARIES_ID_BANK_BANK_USER_NAME,
                    PASSWORD: process.env.ARIES_ID_BANK_BANK_PASSWORD,
                    BINDING_USER_NAME: process.env.ARIES_ID_BANK_BANK_BINDING_USER_NAME,
                    BINDING_PASSWORD: process.env.ARIES_ID_BANK_BANK_BINDING_PASSWORD,
                },
                7: {
                    USER_NAME: process.env.GARUN_ID_BANK_BANK_BINDING_USER_NAME,
                    PASSWORD: process.env.GARUN_ID_BANK_BANK_BINDING_PASSWORD,
                    BINDING_USER_NAME: process.env.GARUN_ID_BANK_BANK_BINDING_USER_NAME,
                    BINDING_PASSWORD: process.env.GARUN_ID_BANK_BANK_BINDING_PASSWORD,
                },
                9: {
                    USER_NAME: process.env.FOODY_ID_BANK_BANK_USER_NAME,
                    PASSWORD: process.env.FOODY_ID_BANK_BANK_PASSWORD,
                    BINDING_USER_NAME: process.env.FOODY_ID_BANK_BANK_BINDING_USER_NAME,
                    BINDING_PASSWORD: process.env.FOODY_ID_BANK_BANK_BINDING_PASSWORD,
                }
            },
            KERPAK_ID_BANK_BANK_USER_NAME: process.env.KERPAK_ID_BANK_BANK_USER_NAME,
            KERPAK_ID_BANK_BANK_PASSWORD: process.env.KERPAK_ID_BANK_BANK_PASSWORD,
            KERPAK_ID_BANK_BANK_BINDING_USER_NAME: process.env.KERPAK_ID_BANK_BANK_BINDING_USER_NAME,
            KERPAK_ID_BANK_BANK_BINDING_PASSWORD: process.env.KERPAK_ID_BANK_BANK_BINDING_PASSWORD,
            SARYAN_ID_BANK_BANK_BINDING_USER_NAME: process.env.SARYAN_ID_BANK_BANK_BINDING_USER_NAME,
            SARYAN_ID_BANK_BANK_BINDING_PASSWORD: process.env.SARYAN_ID_BANK_BANK_BINDING_PASSWORD,
            REQUEST_TO_BANK_WAITING_TIME: Number(process.env.REQUEST_TO_BANK_WAITING_TIME)
        },
        stripe: {
            BINDING: {
                DESCRIPTION: process.env.STRIPE_CARD_BINDING_DESCRIPTION || 'stripe binding action for kerpak'
            },
            SECRET_KEY: process.env.STRIPE_SECRET_KEY,
            PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
            TEST_SECRET_KEY: process.env.STRIPE_TEST_SECRET_KEY,
            TEST_PUBLISHABLE_KEY: process.env.STRIPE_TEST_PUBLISHABLE_KEY,
        }
    },
    payment: {
        TYPE: {
            BANK_CARD: 1,
            APPLE_PAY: 2,
            GOOGLE_PAY: 3
        },
        PROVIDERS: {
            ID_BANK: 1,
            STRIPE: 2,
            STRIPE_TEST: 3,
            FULL_BALANCE: 4
        },
        STATUS: {
            SUCCESS: 0,
            ERROR: 1,
        },
        TRANSACTION: {
            ID_LENGTH: 10
        }
    },
    twilio: {
        TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
        TWILIO_PHON_NUMBER: process.env.TWILIO_PHON_NUMBER,
        TWILIO_MESSAGE_TEMPLATE: process.env.TWILIO_MESSAGE_TEMPLATE,
    },
    s3: {
        KEY: process.env.S3_KEY,
        SECRET: process.env.S3_SECRET,
        REGION: process.env.S3_REGION,
        BUKET: process.env.S3_BUKET,
        LOCATION: process.env.S3_LOCATION,
        SES: {
            REGION: process.env.S3_SES_REGION,
            SOURCE: process.env.S3_SES_SOURCE,
            NOREPLY: process.env.EMAIL_NOREPLY
        }
    },
    ivideon: {
        URL: process.env.IVIDEON_URL,
        IVIDEON_OAUTH_URL: process.env.IVIDEON_OAUTH_URL,
        USERNAME: process.env.IVIDEON_USERNAME,
        PASSWORD: process.env.IVIDEON_PASSWORD,
    },
    domains: {
        sendEmailDomain: process.env.EMAIL_DOMAIN,
    },
    client: {
        privateKeyPath: process.env.CLIENT_PRIVATE_KEY_PATH,
        secret: process.env.CLIENT_SECRET,
    },
    firebase: {
        key: process.env.FIREBASE_KEY
    },
    paths: {
        preOrderDetails: process.env.PRE_ORDER_LINK
    },
    SNS: {
        KEY: process.env.SNS_ACESS_KEY,
        SECRET: process.env.SNS_SECRET,
        REGION: process.env.SNS_REGION
    },
    SMS: {
        SINGLE_USER_lIMIT: process.env.SMS_SINGLE_USER_lIMIT,
        DAY_LIMIT: process.env.SMS_DAY_LIMIT
    },
    imageConfigs: {
        ALLOWED_MAX_IMAGE_SIZE: process.env.ALLOWED_MAX_IMAGE_SIZE
    },
    IPINFO: {
        TOKEN: process.env.IPINFO_TOKEN
    },
    TRAFFIC_SAVING: {
        INTERVAL: process.env.TRAFFIC_SAVING_INTERVAL,
        TIMEOUT: process.env.TRAFFIC_SAVING_TIMEOUT,
        INTERVAL_TEMPERATURE: process.env.TRAFFIC_SAVING_INTERVAL_TEMPERATURE,
        INTERVAL_DOOR: process.env.TRAFFIC_SAVING_INTERVAL_DOOR,
    },
    COFFEEMACHINE: {
        ID: process.env.COFFEEMACHINE_ID,
        SECRET: process.env.COFFEEMACHINE_SECRET,
        USERNAME: process.env.COFFEEMACHINE_USERNAME,
        PASSWORD: process.env.COFFEEMACHINE_PASSWORD
    }
};
