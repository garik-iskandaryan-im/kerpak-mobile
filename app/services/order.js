const {
    orders: Orders,
    kioskSessions: KioskSessions,
    transactions: Transactions,
    consumers: Consumers,
    menuItems: MenuItems,
    productItems: ProductItems,
    categories: Categories,
    defaultCategories: DefaultCategories,
    balanceHistary: BalanceHistary,
    foodProviders: FoodProviders,
    preOrders: PreOrders,
    sequelize
} = require('app/models/models');
const { makeId, getKioskOffset, capitalize } = require('app/helpers/utils');
const { payment: { TRANSACTION, STATUS, PROVIDERS, TYPE } } = require('app/settings');
const log = require('app/helpers/logger');
const CONSTANTS = require('app/constants');

// [a, b, a, b, c] => [{barcode: a, count: 2},{barcode: b, count: 2},{barcode: c, count: 1}]
const normalizeProductItems = (productItems) => {
    let uniqItems = [];
    let items = [];
    for (let i in productItems) {
        let item = productItems[i];
        if (uniqItems.indexOf(item) === -1) {
            items.push({ 'barcode': item, 'count': 1 });
            uniqItems.push(item);
        } else {
            for (let j in items) {
                if (items[j].barcode === item) {
                    items[j].count++;
                }
            }
        }
    }
    return items;
};

const getProductItemsArray = async (items, kiosk, discount) => {
    let sum = 0;
    let productItemsArray = [];
    for (let i in items) {
        const menuItem = await MenuItems.findOne({
            where: {
                barcode: items[i].barcode,
                serviceProviderId: kiosk.serviceProviderId,
                archived: false,
            },
            include: [
                {
                    model: Categories,
                    attributes: ['name'],
                    as: 'categories',
                    include: [
                        { model: DefaultCategories, required: false },
                    ],
                },
                {
                    model: FoodProviders,
                    attributes: ['name'],
                    required: false,
                },
            ],
            raw: true
        });
        if (!menuItem) {
            return { error: 'menuItem not fount', success: false };
        }

        const productItems = await ProductItems.findAll({
            where: {
                menuItemId: menuItem.id,
                status: 'available',
                kioskId: kiosk.id,
            }
        });
        for (let t = 0; t < items[i].count; t++) {
            if (productItems[t]) {
                const { name, price, barcode, sku, weight, image } = menuItem;
                const actualSum = Number(price) * ((100 - Number(discount)) / 100);
                const totalPrice = Math.round(actualSum * 100) / 100;
                let temp = {
                    name,
                    price,
                    barcode,
                    sku,
                    weight,
                    image,
                    totalPrice,
                    discount,
                    storedID: productItems[t].id,
                    dubleSold: false,
                    category: menuItem['categories.name'] || menuItem['categories.defaultCategory.name'],
                    foodProvider: menuItem['foodProvider.name']
                };
                productItemsArray.push(temp);
            } else {
                return { error: 'productItem not found', success: false };
            }
        }

        sum = sum + menuItem.price * items[i].count;
    }
    return { productItemsArray: productItemsArray, sum: sum };
};

const isItFirstPurchase = async (kiosk, consumerId) => {
    const order = await Orders.findOne({ where: { consumerId: consumerId, kioskId: kiosk.id, orderStatus: 'successful' } });
    return !order;
};

const calculateDateTime = (offset) => {
    // get current local time in milliseconds
    const date = new Date();
    const localTime = date.getTime();

    // get local timezone offset and convert to milliseconds
    const localOffset = date.getTimezoneOffset() * 60000;

    // obtain the UTC time in milliseconds
    const utc = localTime + localOffset;

    const newDateTime = utc + (3600000 * offset);

    const convertedDateTime = new Date(newDateTime);
    return convertedDateTime;
};

const isDiscountHour = (currentDate, dayDiscount, kiosk) => {
    const fromKey = `${dayDiscount}From`;
    const toKey = `${dayDiscount}To`;
    const kioskOffset = getKioskOffset(kiosk);
    let startDiscountHour = calculateDateTime(kioskOffset);
    startDiscountHour.setHours(parseInt(kiosk[fromKey].split(':')[0]), parseInt(kiosk[fromKey].split(':')[1]));
    let endDiscountHour = calculateDateTime(kioskOffset);
    endDiscountHour.setHours(parseInt(kiosk[toKey].split(':')[0]), parseInt(kiosk[toKey].split(':')[1]));
    if (startDiscountHour > endDiscountHour) {
        endDiscountHour.setDate(endDiscountHour.getDate() + 1);
    }
    return (currentDate >= startDiscountHour && currentDate < endDiscountHour);
};

const getDiscount = async (kiosk, consumerId) => {
    let firstPurchaseDiscount = 0;
    let timeDiscountAmount = 0;
    let discount = 0;
    if (!kiosk.firstPurchaseDiscount && !kiosk.timeBasedDiscount) {
        return { firstPurchaseDiscount, timeDiscountAmount, discount };
    }
    const firstPurchase = await isItFirstPurchase(kiosk, consumerId);
    if (kiosk.firstPurchaseDiscount && firstPurchase) {
        firstPurchaseDiscount = kiosk.firstPurchaseDiscountAmount;
    }
    if (kiosk.timeBasedDiscount) {
        if (kiosk.discountSchedulesFull) {
            timeDiscountAmount = kiosk.timeDiscountAmount;
        } else {
            let currentDate = calculateDateTime(getKioskOffset(kiosk));
            let weekDay = currentDate.getDay();
            const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

            const dayName = capitalize(daysMap[weekDay]);
            const discountDay = `discountSchedules${dayName}`;


            if (kiosk[discountDay] && isDiscountHour(currentDate, discountDay, kiosk)) {
                timeDiscountAmount = kiosk.timeDiscountAmount;
            }
        }
    }
    discount = Math.max(firstPurchaseDiscount, timeDiscountAmount);
    // multiplied by 100 to avoid float number sum issue.
    return { firstPurchaseDiscount, timeDiscountAmount, discount };
};

const createOrder = async (serviceProvider, totalSumObj, consumerId, kiosk, card, productItemsArray, sessionId, fullBalance = false, integration = null, isCompleted = false, paymentMethod) => {
    try {
        const { totalSum, discountSum, firstPurchaseDiscount, timeDiscountAmount, discount, hasDoubleSold, usedBalance } = totalSumObj;
        let storedOrderData = {};
        if (kiosk) {
            storedOrderData.kioskName = kiosk.displayName;
            const { address1, address2, city, state } = kiosk;
            storedOrderData.kioskAddress = (`${address1}, ` + (address2 ? `${address2}, ` : '') + `${city}, ` + `${state}`);
        }
        if (card) {
            storedOrderData.paymentType = card.paymentType;
            storedOrderData.SPName = serviceProvider.legalName;
            storedOrderData.maskedPan = card.paymentType === TYPE.BANK_CARD ? card.maskedPan.replace(card.maskedPan.substring(2, 8), '******') : card.maskedPan;
            storedOrderData.cardHolderName = card.cardHolderName || 'initial value';
        }

        const orderPayload = {
            orderDate: Date.now(),
            purchaseStatus: isCompleted ? 'completed' : 'pending',
            orderStatus: isCompleted ? 'successful' : 'pending',
            price: totalSum,
            serviceProviderId: serviceProvider.id,
            storedSPId: serviceProvider.id,
            consumerId: consumerId,
            storedConsumerId: consumerId,
            kioskId: kiosk.id,
            storedKioskId: kiosk.id,
            firstPurchaseDiscount: firstPurchaseDiscount,
            timeDiscountAmount: timeDiscountAmount,
            discount: discount,
            discountSum: discountSum,
            ordersProductItems: productItemsArray,
            productsCount: productItemsArray.length,
            kioskName: storedOrderData.kioskName,
            kioskAddress: storedOrderData.kioskAddress,
            SPName: storedOrderData.SPName,
            maskedPan: storedOrderData.maskedPan,
            cardHolderName: storedOrderData.cardHolderName,
            sessionId: sessionId,
            hasDoubleSold: hasDoubleSold,
            usedBalance: usedBalance,
            integration,
            paymentMethod,
            paymentType: storedOrderData.paymentType,
        };

        if (fullBalance) {
            orderPayload.purchaseStatus = 'completed';
            orderPayload.orderStatus = 'successful';
            orderPayload.usedBalance = totalSum;
        }

        const { id: orderId, orderDate, kioskId } = await Orders.create(orderPayload, {
            include: [
                { association: Orders.associations.ordersProductItems },
            ]
        });
        return { success: true, orderId: orderId, orderDate, kioskId };
    } catch (error) {
        return { success: false, error: error };
    }
};

const calculateTotalPrice = async (userId, productItems, kiosk, useDiscount = true) => {
    const productWithoutEAN5 = [];
    const productWithEAN5 = [];
    let itemsArray = [];
    let totalSum = 0;
    let hasDoubleSold = false;
    const { id: consumerId } = await Consumers.findOne({ where: { id: userId } });
    let discount = 0, firstPurchaseDiscount = 0, timeDiscountAmount = 0;
    if (useDiscount) {
        const discountObject = await getDiscount(kiosk, consumerId);
        discount = discountObject.discount;
        firstPurchaseDiscount = discountObject.firstPurchaseDiscount;
        timeDiscountAmount = discountObject.timeDiscountAmount;
    }

    for (let i = 0, len = productItems.length; i < len; i++) {
        const cataloge = await MenuItems.findOne({
            where: {
                barcode: productItems[i].barcode,
                serviceProviderId: kiosk.serviceProviderId,
                archived: false,
            },
            include: [
                {
                    model: Categories,
                    attributes: ['name'],
                    as: 'categories',
                    include: [
                        { model: DefaultCategories, required: false },
                    ],
                },
                {
                    model: FoodProviders,
                    attributes: ['name'],
                    required: false,
                },
            ],
            raw: true
        });
        if (!cataloge) {
            return { success: false, message: 'cataloge not found' };
        }
        const { name, price, barcode, sku, weight, image } = cataloge;
        const actualSum = Number(price) * ((100 - Number(discount)) / 100);
        const totalPrice = Math.round(actualSum * 100) / 100;
        let temp = {
            name,
            price,
            barcode,
            sku,
            weight,
            image,
            totalPrice,
            discount,
            category: cataloge['categories.name'] || cataloge['categories.defaultCategory.name'],
            foodProvider: cataloge['foodProvider.name']
        };

        if (productItems[i].EAN5) {
            if (!cataloge.isGenerateUniqueEAN5) {
                return { success: false, message: 'cataloge should not conatain EAN5' };
            }
            let product = await ProductItems.findAll({
                where: {
                    menuItemId: cataloge.id,
                    EAN5: productItems[i].EAN5,
                    kioskId: kiosk.id,
                    archived: false
                },
                order: [['createdAt', 'DESC']],
                limit: 1
            });
            if (!product[0]) {
                return { success: false, message: 'productIem not found' };
            }
            if (product[0].expirationDate < new Date()) {
                return { success: false, message: 'productIem is expaired' };
            }
            if (product[0].status === 'written-off') {
                return { success: false, message: 'productIem is written-off' };
            }
            totalSum += cataloge.price;
            if (product[0].status === 'sold') {
                temp.doubleSold = true;
                hasDoubleSold = true;
            }
            temp.storedID = product[0].id;
            temp.expirationDate = product[0].expirationDate;
            temp.productionDate = product[0].productionDate;
            temp.EAN5 = product[0].EAN5;
            productWithEAN5.push(temp);
            itemsArray.push(temp);
        } else {
            if (cataloge.isGenerateUniqueEAN5) {
                return { success: false, message: 'cataloge should conatain EAN5' };
            }
            productWithoutEAN5.push(productItems[i].barcode);
        }
    }

    if (productWithoutEAN5.length) {
        const items = normalizeProductItems(productWithoutEAN5);
        const res = await getProductItemsArray(items, kiosk, discount);
        if (res.success === false) {
            return res;
        }
        const { productItemsArray, sum } = res;
        totalSum += sum;
        itemsArray = itemsArray.concat(productItemsArray);
    }
    const actualSum = Math.round((totalSum * ((100 - discount) / 100)) * 100) / 100;
    // multiplied by 100 to avoid float number sum issue.
    const discountSum = (totalSum * 100 - actualSum * 100) / 100;

    return {
        totalSum: actualSum,
        sumWithoutDiscount: totalSum,
        discountSum: discountSum,
        discount: discount,
        firstPurchaseDiscount: firstPurchaseDiscount,
        timeDiscountAmount: timeDiscountAmount,
        productItemsArray: itemsArray,
        consumerId,
        hasDoubleSold,
    };
};

const updateOrder = async (id, purchaseStatus, orderStatus, resetBalance = false, bankOrderId) => {
    try {
        const payload = {
            bankOrderId,
            orderStatus,
            purchaseStatus
        };
        if (resetBalance) {
            payload.usedBalance = 0;
        }
        await Orders.update(payload, { where: { id } });
        const order = await Orders.findOne({ where: { id } });
        return { success: true, orderId: order.id, orderDate: order.orderDate, kioskId: order.kioskId };
    } catch (error) {
        return { success: false, error: error };
    }
};

const updateSession = async (orderId, sessionId) => {
    try {
        await KioskSessions.update({ orderId }, { where: { id: sessionId } });
        return { success: true };
    } catch (error) {
        return { success: false, error: error };
    }
};

const getTransactionId = async () => {
    const transactionId = makeId(TRANSACTION.ID_LENGTH);
    const transaction = await Transactions.findOne({ where: { transactionId } });
    if (transaction) {
        return await getTransactionId();
    }
    return transactionId;
};

const addBalanceHistory = async (orderDate, consumerId, phone, balance, totalSum, orderId, userId, userEmail) => {
    try {
        const consumerPayload = {};
        const balanceHistoryPayload = {
            userId: userId,
            orderId: orderId,
            userEmail: userEmail,
            consumerId: consumerId,
            consumerPhone: phone,
            type: 'spent',
            date: orderDate,
        };
        if (balance >= totalSum) {
            consumerPayload.balance = sequelize.literal(`balance - ${totalSum}`);
            balanceHistoryPayload.balance = totalSum;
        } else {
            consumerPayload.balance = 0;
            balanceHistoryPayload.balance = balance;
        }
        await BalanceHistary.create(balanceHistoryPayload);
        await Consumers.update(
            consumerPayload,
            {
                where: { id: consumerId }
            }
        );
        return { success: true };
    } catch (error) {
        log.error(error, 'order::controller::addBalanceHistory');
        return { success: false, error: error };
    }
};

const handleSuccessOrder = async (orderDate, kioskId, orderId, consumerId, productItemsArray) => {
    try {
        const consumerPayload = {
            lastOrderDate: orderDate,
            kioskIdOfLastOrder: kioskId,
        };
        await Consumers.update(
            consumerPayload,
            {
                where: { id: consumerId }
            }
        );
        await ProductItems.update({ status: 'sold', orderId: orderId }, { where: { id: productItemsArray.map(i => i.storedID) } });
        return { success: true };
    } catch (error) {
        log.error(error, 'order::controller::handleSuccessOrder');
        return { success: false, error: error };
    }
};

const handleSuccessPreOrder = async (orderInfo, preOrder, consumer, sessionId) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        // create order
        orderInfo.orderDate = Date.now();
        orderInfo.purchaseStatus = 'completed';
        orderInfo.orderStatus = 'successful';
        const { id: orderId, orderDate, kioskId, usedBalance } = await Orders.create(orderInfo, { include: [{ association: Orders.associations.ordersProductItems }], transaction });

        // update session
        if (sessionId) {
            await KioskSessions.update({ orderId }, { where: { id: sessionId }, transaction });
        }

        // update balance history
        if (usedBalance) {
            await BalanceHistary.update({ orderId }, { where: { preOrderId: preOrder.id }, transaction });
        }

        // update consumer last order info
        const { id: preOrderId, status } = preOrder;
        await Consumers.update(
            {
                lastOrderDate: orderDate,
                kioskIdOfLastOrder: kioskId,
            },
            { where: { id: consumer.id }, transaction }
        );

        // update preOrder status from delivered to scanned
        await PreOrders.update(
            { status: CONSTANTS.PRE_ORDER_STATUS.allowedNextStatuses[status].scannedStatus },
            { where: { id: preOrderId }, transaction }
        );
        transaction.commit();
        return { success: true, orderId };
    } catch (err) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (errRollback) {
                log.error(errRollback, 'pre order::controller::depositOrder::createOrder::rollback');
            }
        }
        return { success: false, err };
    }
};

const calculateTotalPriceForPreOrder = async (payload, kiosk) => {
    let productItemsArray = [];
    let totalSum = 0;
    let itemsWithCount = '';
    const itemsArray = [];
    let discount = 0;
    if (kiosk.deliveryDiscount) {
        discount = kiosk.deliveryDiscountAmount;
    }
    for (let i = 0, len = payload.productItems.length; i < len; i++) {
        const productItem = payload.productItems[i];
        if (productItem.count <= 0) {
            return { success: false, message: 'Entered invalid product items count.' };
        }
        const cataloge = await MenuItems.findOne({
            where: {
                barcode: productItem.barcode,
                serviceProviderId: kiosk.serviceProviderId,
                itemAvailability: CONSTANTS.ITEM_AVAILABILITY.deliveryPermission,
                archived: false,
            },
            include: [
                {
                    model: Categories,
                    attributes: ['name'],
                    as: 'categories',
                    include: [
                        { model: DefaultCategories, required: false },
                    ],
                },
                {
                    model: FoodProviders,
                    attributes: ['name'],
                    required: false,
                },
            ],
            raw: true
        });
        if (!cataloge) {
            return { success: false, message: 'cataloge not found' };
        }
        const { name, price, barcode, sku, weight, image } = cataloge;
        let totalPrice = price;
        if (discount) {
            const actualSum = Number(price) * ((100 - Number(discount)) / 100);
            totalPrice = Math.round(actualSum * 100) / 100;
        }
        for (let j = 0; j < productItem.count; j++) {
            productItemsArray.push({
                name,
                price,
                barcode,
                sku,
                weight,
                image,
                totalPrice,
                discount,
                doubleSold: false,
                category: cataloge['categories.name'] || cataloge['categories.defaultCategory.name'],
                isPreOrder: true,
                foodProvider: cataloge['foodProvider.name']
            });
            totalSum += price;
        }
        itemsWithCount += `${itemsWithCount.length ? ', ' : ''}${name} x${productItem.count}`;
        itemsArray.push({
            name,
            price,
            count: productItem.count,
            image,
        });
    }
    const actualSum = Math.round((totalSum * ((100 - discount) / 100)) * 100) / 100;
    // multiplied by 100 to avoid float number sum issue.
    const discountSum = (totalSum * 100 - actualSum * 100) / 100;
    return {
        itemsWithCount,
        itemsArray,
        totalSum: actualSum,
        productItemsArray,
        discount,
        discountSum
    };
};

const createTransaction = async (data, response, provider, isError) => {
    if (isError) {
        if (provider === PROVIDERS.ID_BANK) {
            data.errorCode = response.data?.errorCode || response.data?.ErrorCode;
            data.error = response.data?.errorMessage || response.data?.ErrorMessage || response.err?.name || response.data?.error;
        } else {
            data.error = response?.err?.raw?.code;
        }
        data.status = STATUS.ERROR;
    } else {
        if (provider === PROVIDERS.ID_BANK) {
            data.errorCode = response.data.errorCode || response.data.ErrorCode;
            data.approvalCode = response.data.approvalCode;
            data.authCode = response.data.authCode;
        }
        data.status = STATUS.SUCCESS;
    }
    await Transactions.create(data);
};

const handleSuccessFullBalanceOrder = async (consumer, totalSumObj, sessionId, kiosk, card, productItemsArray, userId, userEmail) => {
    const order = await createOrder(kiosk.serviceProvider, totalSumObj, consumer.id, kiosk, card, productItemsArray, sessionId, true, null, null, PROVIDERS.FULL_BALANCE);
    if (sessionId) {
        await updateSession(order.orderId, sessionId);
    }
    await addBalanceHistory(order.orderDate, consumer.id, consumer.phone, consumer.balance, totalSumObj.totalSum, order.orderId, userId, userEmail);
    await handleSuccessOrder(order.orderDate, order.kioskId, order.orderId, consumer.id, productItemsArray);
    return { orderId: order.orderId };
};

module.exports.getTransactionId = getTransactionId;
module.exports.createTransaction = createTransaction;
module.exports.calculateTotalPrice = calculateTotalPrice;
module.exports.updateOrder = updateOrder;
module.exports.createOrder = createOrder;
module.exports.updateSession = updateSession;
module.exports.handleSuccessOrder = handleSuccessOrder;
module.exports.addBalanceHistory = addBalanceHistory;
module.exports.calculateTotalPriceForPreOrder = calculateTotalPriceForPreOrder;
module.exports.handleSuccessPreOrder = handleSuccessPreOrder;
module.exports.handleSuccessFullBalanceOrder = handleSuccessFullBalanceOrder;