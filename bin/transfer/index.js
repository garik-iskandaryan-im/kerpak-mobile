const amazonHost = 'stagingkerpakstatic';
//const amazonHost = 'kerpakstatic';

const crypto = require('crypto');
const fs = require('fs');
const Got = require('got');

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'meteor';

const SPIDMap = {};
const MenuItemsIDMAP = {};
const MenusIDMAP = {};
const KiosksIDMAP = {};
const ConsumerIDMAP = {};
const OrdersIDMAP = {};
const UsersIDMAP = {};
const UsersFirstNames = {};
const UsersLastNames = {};


const getSPID = function (id) {
    return SPIDMap[id];
};

const getMenuItemsID = function (id) {
    return MenuItemsIDMAP[id];
};

const getMenusID = function (id) {
    return MenusIDMAP[id];
};

const getKiosksID = function (id) {
    return KiosksIDMAP[id];
};

const getConsumersID = function (id) {
    return ConsumerIDMAP[id];
};

const getConsumersIDForCards = async function(id, db) {
    const consumer = await findDocuments(db, 'consumers', {userId: id});
    return ConsumerIDMAP[consumer[0]._id];
};

const getOrdersID = function (id) {
    return OrdersIDMAP[id];
};

const getUsersID = function (id) {
    return UsersIDMAP[id];
};

const getUserFirstName = function (id) {
    return UsersFirstNames[id];
};

const getUserLastName = function (id) {
    return UsersLastNames[id];
};
const {
    serviceProviders: ServiceProviders,
    kiosks: Kiosks,
    users: Users,
    menuItems: MenuItems,
    menus: Menus,
    sequelize,
    consumers: Consumers,
    cards: Cards,
    discountSchedules: DiscountSchedules,
    hoursOfOperations: HoursOfOperations,
    productItems: ProductItems,
    itemTransfers: ItemTransfers,
    orders: Orders,
    ordersProductItems: OrdersProductItems,
    itemsWriteOffs: ItemsWriteOffs,
    storedWriteOffs: StoredWriteOffs,
    kioskSessions: KioskSessions,
    transactions: Transactions,
    itemTransfersMenuItems: ItemTransfersMenuItems,
} = require('app/models/models');

const getUserEmail = function(email) {
    if (email === 'admin01@kerpaktech.com') {
        return 'staging.kerpak01@gmail.com';
    } else if (email === 'vv@gourooclub.com') {
        return 'vv@testkerpak.com';
    } else if (email === 'dir@gourooclub.com') {
        return 'dir@testkerpak.com';
    } else if (email === 'nata.antonyan@gmail.com') {
        return 'nata.antonyan@testkerpak.com';
    } else if (email === 'test@vkusnolubov.ru') {
        return 'test@testkerpak.com';
    } else if (email === 'test1@vkusnolubov.ru') {
        return 'test1@testkerpak.com';
    } else if (email === 'ab@kerpaktech.com') {
        return 'ab@testkerpak.com';
    } else if (email === 'mm@kerpaktech.com') {
        return 'mm@testkerpak.com';
    } else if (email === 'mariamtitanyan1998@gmail.com') {
        return 'mariamtitanyan1998@testkerpak.com';
    } else {
        return email;
    }
};

const findDocuments = async function(db, collectionName, filter = {}) {
    // Get the documents collection
    const collection = db.collection(collectionName);
    // Find some documents 
    let data = await collection.find(filter).toArray();
    return data;
};

const createKerpakUser = async function(kerpakUsers) {
    try {
        for (let i in kerpakUsers) {
            try {
                kerpakUsers[i].isKerpakOperator = true;
                //kerpakUsers[i].email = kerpakUsers[i].emails[0].address;
                kerpakUsers[i].email = getUserEmail(kerpakUsers[i].emails[0].address);
                kerpakUsers[i].firstName = kerpakUsers[i].profile.name;
                kerpakUsers[i].lastName = kerpakUsers[i].profile.lastName;
                kerpakUsers[i].phone = kerpakUsers[i].profile.phoneNumber;
                const res = await Users.create(kerpakUsers[i]);
                UsersIDMAP[kerpakUsers[i]._id] = res.id;
                UsersFirstNames[kerpakUsers[i]._id] = kerpakUsers[i].profile.name;
                UsersLastNames[kerpakUsers[i]._id] = kerpakUsers[i].profile.lastName;
            } catch(err) {
                console.log('error createKerpakUser err', err);
            }
        }
    } catch(err) {
        console.log('error createKerpakUser err', err);
    }
};

// Use connect method to connect to the server
module.exports.init = () => {
    MongoClient.connect(url, async function(err, client) {
        assert.equal(null, err);
        console.log("Connected successfully to server");

        const db = client.db(dbName);

        let kerpakUsers = await findDocuments(db, 'users', {roleLabel: 'Kerpak Operator'});
        if (kerpakUsers.length !== 1) {
            console.log('unexpected issue for Kerpak Operators');
        }
        await createKerpakUser(kerpakUsers);
        // return client.close();
        const consumersDocs = await findDocuments(db, 'consumers');
        for (let conIndex in consumersDocs) {
            const resConsumer = await createConsumer(consumersDocs[conIndex]);
            console.log('res- resConsumer', resConsumer);
        }

        const cardsDocs = await findDocuments(db, 'cards');
        for (let cardIndex in cardsDocs) {
            const resCard = await createCard(cardsDocs[cardIndex], db);
            if (resCard === undefined) {
                console.log('res resCard', resCard, cardsDocs[cardIndex]);
            }
        }

        //client.close();
        //return;*/
        docs = await findDocuments(db, 'serviceProviders');
        for (let i in docs) {
            if (docs[i].legalName === 'ООО Пряничный Домик') {
                continue;
            }

            const res = await createSP(docs[i]);

            const SPusers = await findDocuments(db, 'users', {roleLabel: 'SP Operator', serviceProvider: res._id});

            await createSPUsers(SPusers, res.id);

            const SPMenuItems = await findDocuments(db, 'menuItems', {serviceProviderId: res._id});
            //console.log('SPMenuItems', SPMenuItems);
            await createSPMenuItems(SPMenuItems, res.id);

            const SPMenus = await findDocuments(db, 'menus', {serviceProviderId: res._id});
            await createSPMenus(SPMenus, res.id);

            const SPKiosks = await findDocuments(db, 'kiosks', {serviceProviderId: res._id});
            //console.log('SPKiosks', SPKiosks);
            await createSPKiosks(SPKiosks, res.id);

            const SPOrders = await findDocuments(db, 'orders', {serviceProviderId: res._id});
            await createSPOrders(SPOrders, res.id);

            const SPProductItems = await findDocuments(db, 'productItems', {serviceProviderId: res._id});
            await createSPProductItems(SPProductItems, res.id);

            const SPItemTransfers = await findDocuments(db, 'itemTransfers', {serviceProviderId: res._id});
            await createSPItemTransfers(SPItemTransfers, res.id);

            const SPItemsWriteOff = await findDocuments(db, 'itemsWriteOff', {serviceProviderId: res._id});
            await createSPItemsWriteOff(SPItemsWriteOff, res.id);

            const kioskSessions = await findDocuments(db, 'kioskSessions', {serviceProviderId: res._id});
            await createKioskSessions(kioskSessions, res.id);

            const transactions = await findDocuments(db, 'transactions', {serviceProviderId: res._id});
            await createTransactions(transactions, res.id);
        }
        //docs = await findDocuments(db, 'users', {roleLabel: 'SP Operator'});
        await hundleFiles();
        client.close();
    });

    const hundleFiles = async function() {
        try {
            const kiosksData = JSON.parse(JSON.stringify(await Kiosks.findAll()));
            for (let i in kiosksData) {
                if (kiosksData[i].image) {
                    const nameArr = kiosksData[i].image.split('/');
                    const name = nameArr[[nameArr.length - 1]];
                    const response = await Got.stream(kiosksData[i].image).pipe(await fs.createWriteStream(`./bin/transfer/files/${name}`));;
                    console.log('end');
                    await Kiosks.update({ image: kiosksData[i].image.replace('ap-southeast-1.amazonaws.com', 'amazonaws.com').replace('kerpakassets', amazonHost) }, { where: { id: kiosksData[i].id } });
                }
            }
            const menuItemsData = JSON.parse(JSON.stringify(await MenuItems.findAll({ where: { archived: false } })));
            for (let i in menuItemsData) {
                if (menuItemsData[i].image) {
                    const nameArr = menuItemsData[i].image.split('/');
                    const name = nameArr[[nameArr.length - 1]];
                    const response = await Got.stream(menuItemsData[i].image).pipe(await fs.createWriteStream(`./bin/transfer/files/${name}`));;
                    console.log('end');
                    await MenuItems.update(
                        { image: menuItemsData[i].image.replace('ap-southeast-1.amazonaws.com', 'amazonaws.com').replace('kerpakassets', amazonHost) },
                        { where: { id: menuItemsData[i].id, archived: false } }
                    );
                }
            }

            const spData = JSON.parse(JSON.stringify(await ServiceProviders.findAll()));
            for (let i in spData) {
                console.log(spData[i])
                if (spData[i].logo) {
                    const nameArr = spData[i].logo.split('/');
                    const name = nameArr[[nameArr.length - 1]];
                    const response = await Got.stream(spData[i].logo).pipe(await fs.createWriteStream(`./bin/transfer/files/${name}`));;
                    console.log('end');
                    await ServiceProviders.update({ logo: spData[i].logo.replace('ap-southeast-1.amazonaws.com', 'amazonaws.com').replace('kerpakassets', amazonHost) }, { where: { id: spData[i].id } });
                }
                if (spData[i].catalogueImage) {
                    const nameArr = spData[i].catalogueImage.split('/');
                    const name = nameArr[[nameArr.length - 1]];
                    const response = await Got.stream(spData[i].catalogueImage).pipe(await fs.createWriteStream(`./bin/transfer/files/${name}`));;
                    console.log('end');
                    await ServiceProviders.update({ catalogueImage: spData[i].catalogueImage.replace('ap-southeast-1.amazonaws.com', 'amazonaws.com').replace('kerpakassets', amazonHost) }, { where: { id: spData[i].id } });
                }
            }
        } catch (err) {
            console.log('err', err);
        }
    };

    const createKioskSessions = async function(kioskSessions, id) {
        let j = 0;
        for (let i in kioskSessions) {
            try {
                kioskSessions[i].serviceProviderId = id;
                kioskSessions[i].kioskId = getKiosksID(kioskSessions[i].kioskId);
                if (!kioskSessions[i].consumerId) {
                    j++;
                    continue;
                }
                if (getUsersID(kioskSessions[i].consumerId)) {
                    kioskSessions[i].userId = getUsersID(kioskSessions[i].consumerId);
                    delete kioskSessions[i].consumerId;
                } else if (getConsumersID(kioskSessions[i].consumerId)) {
                    kioskSessions[i].consumerId = getConsumersID(kioskSessions[i].consumerId);
                } else {
                    console.log('unexpecting case');
                }

                kioskSessions[i].orderId = getOrdersID(kioskSessions[i].orderId);
                kioskSessions[i].kioskName = kioskSessions[i].kioskCache.displayName;
                const newItemTransfer = await KioskSessions.create(kioskSessions[i]);
            } catch(err) {
                console.log('error createKioskSessions err', err);
            }
        }
    };

    const createTransactions = async function(transactions, id) {
        for (let i in transactions) {
            try {
                if (getUsersID(transactions[i].clientId)) {
                    transactions[i].consumerId = getUsersID(transactions[i].clientId);
                    delete transactions[i].clientId;
                }
                transactions[i].serviceProviderId = id;
                transactions[i].orderId = getOrdersID(transactions[i].orderId);
                const newTransaction = await Transactions.create(transactions[i]);
            } catch(err) {
                console.log('error createTransactions err', err);
            }
        }
    };
    const createSPItemsWriteOff = async function(SPItemsWriteOff, id) {
        for (let i in SPItemsWriteOff) {
            try {
                SPItemsWriteOff[i].serviceProviderId = id;
                SPItemsWriteOff[i].kioskId = getKiosksID(SPItemsWriteOff[i].kioskId);

                SPItemsWriteOff[i].userFirstName = getUserFirstName(SPItemsWriteOff[i].userId);
                SPItemsWriteOff[i].userLastName = getUserLastName(SPItemsWriteOff[i].userId);
                //console.log(getUserFirstName(SPItemsWriteOff[i].userId), SPItemsWriteOff[i].userId);
                SPItemsWriteOff[i].userId = getUsersID(SPItemsWriteOff[i].userId);

                SPItemsWriteOff[i].SPName = SPItemsWriteOff[i].storedWrittenOffData.SPName;
                SPItemsWriteOff[i].kioskName = SPItemsWriteOff[i].storedWrittenOffData.kioskName;
                SPItemsWriteOff[i].userEmail = SPItemsWriteOff[i].storedWrittenOffData.userEmail;            

                SPItemsWriteOff[i].MISku = SPItemsWriteOff[i].storedWrittenOffData.menuItem.sku;
                SPItemsWriteOff[i].MIName = SPItemsWriteOff[i].storedWrittenOffData.menuItem.name;
                SPItemsWriteOff[i].MICategory = SPItemsWriteOff[i].storedWrittenOffData.menuItem.category;

                SPItemsWriteOff[i].itemsWriteOffsProducts = SPItemsWriteOff[i].storedWrittenOffData.menuItem.productItems.map((item) => {
                    return {
                        productID: item.displayId,
                        productionDate: item.productionDate,
                        expirationDate: item.expirationDate
                    };
                });
                //console.log('ItemsWriteOffs.associations', ItemsWriteOffs.associations)
                const res = await ItemsWriteOffs.create(SPItemsWriteOff[i], {
                    include: [{
                        association: ItemsWriteOffs.associations.itemsWriteOffsProducts,
                    }]
                });
                //association: ItemTransfers.associations.itemTransfersMenuItems
            } catch(err) {
                console.log('error createSPItemsWriteOff err', err);
            }
        }
    };
    /*
        $2b$10$FD7ZgWjqcX5fwTeNAWsJGOpbi0skJqaXBT9wr83TX7ztQD7wj8l.6
        DROP DATABASE `kerpak`;CREATE SCHEMA `kerpak` DEFAULT CHARACTER SET utf8;
        $2b$10$aNJ9pj8plau4N1VMxVD.euHKeRs4M19CDCSt9z08clCjQuEDfBi42
        mysqldump -u 'username' -p'password' DBNAME > /home/eric/db_backup/liveDB_`date +\%Y\%m\%d_\%H\%M`.sql
    */
    /*
    DELETE FROM `kerpak`.`serviceProviders` WHERE `id`>'0';
    DELETE FROM `kerpak`.`kiosks` WHERE `id`>'0';
    DELETE FROM `kerpak`.`allergens` WHERE `id`>'0';
    DELETE FROM `kerpak`.`consumers` WHERE `id`>'0';
    DELETE FROM `kerpak`.`cards` WHERE `id`>'0';
    DELETE FROM `kerpak`.`orders` WHERE `id`>'0';
    DELETE FROM `kerpak`.`productItems` WHERE `id`>'0';

    */
    const createSPOrders = async function(SPOrders, id) {
        for (let i in SPOrders) {
            try {
                SPOrders[i].serviceProviderId = id;
                SPOrders[i].kioskId = getKiosksID(SPOrders[i].kioskId);
                SPOrders[i].consumerId = getConsumersID(SPOrders[i].consumerId);

                SPOrders[i].kioskName = SPOrders[i].storedOrderData.kioskName;
                SPOrders[i].kioskAddress = SPOrders[i].storedOrderData.kioskName;
                SPOrders[i].SPName = SPOrders[i].storedOrderData.kioskName;
                SPOrders[i].maskedPan = SPOrders[i].storedOrderData.maskedPan;
                SPOrders[i].cardHolderName = SPOrders[i].storedOrderData.cardHolderName;
                SPOrders[i].productsCount = SPOrders[i].menuItems.length;
                SPOrders[i].discountSum = SPOrders[i].discountedSum;
                SPOrders[i].ordersProductItems = SPOrders[i].menuItems;

                for (let j in SPOrders[i].ordersProductItems) {
                    SPOrders[i].ordersProductItems[j].discount = SPOrders[i].discount;
                    const actualSum = Number(SPOrders[i].ordersProductItems[j].price) * ((100 - Number(SPOrders[i].discount)) / 100);
                    const totalSum = Math.round(actualSum * 100) / 100;
                    SPOrders[i].ordersProductItems[j].totalPrice = totalSum;
                    const sku = SPOrders[i].ordersProductItems[j].sku;
                    const res = await MenuItems.findAll({where: {sku: sku, archived: false}});
                    if (res.length !== 1) {
                        console.log('please take a look', sku, res)
                    } else {
                        SPOrders[i].ordersProductItems[j].image =  res[0].image;
                    }
                }

                const res = await Orders.create(SPOrders[i], {
                    include: [
                        { association: Orders.associations.ordersProductItems },
                    ]
                });
                OrdersIDMAP[SPOrders[i]._id] = res.id;
                //console.log('newSPOrders', newSPOrders);
            } catch(err) {
                console.log('error createSPOrders err', err);
            }
        }
    }

    const createSPItemTransfers = async function(SPItemTransfers, id) {
        for (let i in SPItemTransfers) {
            try {
                SPItemTransfers[i].serviceProviderId = id;
                SPItemTransfers[i].fromKiosk = getKiosksID(SPItemTransfers[i].fromKiosk);
                SPItemTransfers[i].toKiosk = getKiosksID(SPItemTransfers[i].toKiosk);

                //console.log('getUserFirstName(SPItemTransfers[i].userId)', getUserFirstName(SPItemTransfers[i].userId), SPItemTransfers[i].userId, UsersFirstNames)
                SPItemTransfers[i].userFirstName = getUserFirstName(SPItemTransfers[i].userId);
                SPItemTransfers[i].userLastName = getUserLastName(SPItemTransfers[i].userId);
                
                SPItemTransfers[i].userId = getUsersID(SPItemTransfers[i].userId);

                SPItemTransfers[i].fromKioskName = SPItemTransfers[i].storedTransferData.fromKioskName;
                SPItemTransfers[i].toKioskName = SPItemTransfers[i].storedTransferData.toKioskName;
                SPItemTransfers[i].SPName = SPItemTransfers[i].storedTransferData.SPName;
                SPItemTransfers[i].userEmail = SPItemTransfers[i].storedTransferData.userEmail;
 


                //SPItemTransfers[i].storedTransfer = SPItemTransfers[i].storedTransferData;
                
                SPItemTransfers[i].itemTransfersMenuItems = SPItemTransfers[i].menuItemInfo;
                
                const newItemTransfer = await ItemTransfers.create(SPItemTransfers[i], {
                    include: [{
                        association: ItemTransfers.associations.itemTransfersMenuItems
                    }]
                });
            } catch(err) {
                console.log('error createSPItemTransfers err', err);
            }
        }
    };

    const createCard = async function(card, db) {
        try {
            card.consumerId = await getConsumersIDForCards(card.clientId, db);
            const newCard = await Cards.create(card);
            //console.log('newCard', newCard);
            return {_id: card._id, id: newCard.id};
        } catch(err) {
            console.log('error createCard err', card.clientId, err);
        }
    };

    const createConsumer = async function(consumer) {
        try {
            consumer.phone = consumer.phoneNumber;
            consumer.bankClientId = consumer.userId;
            const newConsumer = await Consumers.create(consumer);
            ConsumerIDMAP[consumer._id] = newConsumer.id;
            return {_id: consumer._id, id: newConsumer.id};
        } catch(err) {
            console.log('error createConsumer err', err);
        }
    };

    const createSPProductItems = async function(SPProductItems, id) {
        for (let i in SPProductItems) {
            try {
                SPProductItems[i].serviceProviderId = id;
                SPProductItems[i].menuItemId = getMenuItemsID(SPProductItems[i].menuItemId);
                SPProductItems[i].kioskId = getKiosksID(SPProductItems[i].kioskId);
                if (SPProductItems[i].orderId) {
                    SPProductItems[i].orderId = getOrdersID(SPProductItems[i].orderId);
                }

                const res = await ProductItems.create(SPProductItems[i]);
                //console.log('res', res);
                /*console.log('res-SPMenus', res.id, SPMenus[i]._id);
                MenusIDMAP[SPMenus[i]._id] = res.id;
                let menuItems = [];
                for (let j in SPMenus[i].menuItemIds) {
                    menuItems.push(getMenuItemsID(SPMenus[i].menuItemIds[j]));
                }
                await sequelize.models.menus_menuItems.bulkCreate(menuItems.map(menuItemId => ({
                    menuItemId,
                    menuId: res.id
                })));*/
            } catch(err) {
                console.log('error createSPProductItems err', err);
            }
        }
    };

    const createSPMenus = async function(SPMenus, id) {
        for (let i in SPMenus) {
            try {
                SPMenus[i].serviceProviderId = id;
                const res = await Menus.create(SPMenus[i]);

                MenusIDMAP[SPMenus[i]._id] = res.id;
                let menuItems = [];
                for (let j in SPMenus[i].menuItemIds) {
		    if (getMenuItemsID(SPMenus[i].menuItemIds[j]) === undefined) {console.log('undefined-undefined-undefined', SPMenus[i].menuItemIds[j])}
                    menuItems.push(getMenuItemsID(SPMenus[i].menuItemIds[j]));
                }
                await sequelize.models.menus_menuItems.bulkCreate(menuItems.map(menuItemId => ({
                    menuItemId,
                    menuId: res.id
                })));
            } catch(err) {
                console.log('createSPMenus', err);
            }
        }
    };

    const createSPMenuItems = async function(SPMenuItems, id) {
        for (let i in SPMenuItems) {
            try {
                //console.log(SPMenuItems[i], id);
                SPMenuItems[i].serviceProviderId = id;
                if (SPMenuItems[i].dietaryMarkers) {
                    SPMenuItems[i].dietaryMarkers = SPMenuItems[i].dietaryMarkers.map(item => ({name: item}));
                }
                if (SPMenuItems[i].allergens) {
                    SPMenuItems[i].allergens = SPMenuItems[i].allergens.map(item => ({name: item}));
                }
                if (SPMenuItems[i].duration) {
                    SPMenuItems[i].durationType = SPMenuItems[i].duration.unit;
                    SPMenuItems[i].duration = SPMenuItems[i].duration.period;
                }
                const res = await MenuItems.create(SPMenuItems[i], {
                    include: [
                        { association: MenuItems.associations.dietaryMarkers },
                        { association: MenuItems.associations.allergens },
                        { association: MenuItems.associations.nutritionFacts }
                    ]
                });

                //console.log('res-createSPMenuItems', res.id, SPMenuItems[i]._id);
                MenuItemsIDMAP[SPMenuItems[i]._id] = res.id;
            } catch(err) {
                console.log('error createSPMenuItemscreateSPMenuItems err', err);
            }
        }
    };

    const createSPKiosks = async function(SPKiosks, id) {
        for (let i in SPKiosks) {
            try {
                if (SPKiosks[i].displayName === 'EasyEat@Moscow Test') {
                    continue;
                }
                //console.log(SPKiosks[i], id);
                /*let payload = {
                    email: SPusers[i].emails[0].address,
                    isKerpakOperator: false,
                    firstName: SPusers[i].profile.name,
                    lastName: SPusers[i].profile.lastName,
                    phone: SPusers[i].profile.phoneNumber,
                    serviceProvider: id,
                    archived: SPusers[i].archived
                }*/
                SPKiosks[i].serviceProviderId = id;
                //console.log('SPKiosks[i].menuId', SPKiosks[i].menuId);
                SPKiosks[i].menuId = getMenusID(SPKiosks[i].menuId);
                const res = await Kiosks.create(SPKiosks[i], {
                    // TODO need to remove
                    include: [{
                        association: Kiosks.associations.hoursOfOperations,
                    }, {
                        association: Kiosks.associations.discountSchedules,
                    }]
                });
                KiosksIDMAP[SPKiosks[i]._id] = res.id;
                //let payload = Kiosks.
                //await DiscountSchedules.create(
                //console.log('res', res);
            } catch(err) {
                console.log('createSPKiosks', err);
            }
        }
    };

    const createSPUsers = async function(SPusers, id) {
        for (let i in SPusers) {
            try {
                //console.log(SPusers[i], id);
                let payload = {
                    //email: SPusers[i].emails[0].address,
                    email: getUserEmail(SPusers[i].emails[0].address),
                    isKerpakOperator: false,
                    firstName: SPusers[i].profile.name,
                    lastName: SPusers[i].profile.lastName,
                    phone: SPusers[i].profile.phoneNumber,
                    serviceProviderId: id,
                    archived: SPusers[i].archived
                };
                const res = await Users.create(payload);
                UsersIDMAP[SPusers[i]._id] = res.id;
                UsersFirstNames[SPusers[i]._id] = SPusers[i].profile.name;
                UsersLastNames[SPusers[i]._id] = SPusers[i].profile.lastName;
                //console.log('res', res)
            } catch(err) {
                console.log('createSPUsers', err);
            }
        }
    };

    const createSP = async function(serviceProvider) {
        try {
            const newServiceProvider = await ServiceProviders.create(serviceProvider);
            SPIDMap[serviceProvider._id] = newServiceProvider.id;
            return {_id: serviceProvider._id, id: newServiceProvider.id};
        } catch(err) {
            console.log('createSP', err);
        }
    };

    const createSPOld = async function(serviceProvider) {
        await ServiceProviders.create(serviceProvider).then(newServiceProvider => {
            if (newServiceProvider) {
                //console.log('successed', serviceProvider._id, newServiceProvider.id);
            } else {
                //console.log('error SP');
            }
        }).catch(err => {
            console.log('createSPOld', err);
        });
    };

    const _hashLoginToken = function (loginToken) {
        const hash = crypto.createHash('sha256');
        hash.update(loginToken);
        return hash.digest('base64');
    };
};
//console.log(_hashLoginToken('R-7LSKUKmEWECWZ4d2xugXkR4aE145bBh-w_jP3-FqJ'));
//yjkUjwUZQvMpWcbVpCe7J5pzH7IejzCaZ4fwBbevraQ=