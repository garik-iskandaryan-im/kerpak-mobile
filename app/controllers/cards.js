const { Op } = require('sequelize');
const moment = require('moment');

const {
    cards: Cards,
    stripeCards: StripeCards,
    consumers: Consumers,
    regions: Regions,
    sequelize
} = require('app/models/models');
const {
    ORDER: { stripe },
    payment: { TYPE, PROVIDERS },
} = require('app/settings');
const { getTransactionId, createTransaction } = require('app/services/order');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');
const cardHelper = require('app/helpers/payment/cards');
const { getBankClient } = require('app/helpers/payment/common');
const { isSchemeValid } = require('app/helpers/validate');
const { cards: cardsValidator } = require('app/schemes');

const getCardModel = paymentMethod => paymentMethod === PROVIDERS.ID_BANK ? Cards : StripeCards;

/**
 * @swagger
 * /mobile/consumer/{id}/cards:
 *   get:
 *     tags:
 *       - Private - Cards
 *     summary: Get cards
 *     description: ''
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for consumer
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.list = async (req, res) => {
    try {
        const consumerId = req.params.id;
        const consumer = await Consumers.findOne({
            where: { id: consumerId },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (!consumer) {
            log.error('Consumer not found', 'card::controller::getCards::consumerNotFound');
            return res.status(404).json({ message: 'Consumer not found' });
        }
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'card::controller::list::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        const cardModel = getCardModel(consumer.region.paymentMethod);
        const cards = await cardModel.findAll({ where: { consumerId: consumerId } });
        return res.json(cards);
    } catch (err) {
        log.error(err, 'card::controller::getCards');
        return res.status(500).json({ message: 'Error in get stripe card list' });
    }
};

/**
 * @swagger
 * /mobile/consumer/{id}/card/{cardId}:
 *   post:
 *     tags:
 *       - Private - Cards
 *     summary: Set default card
 *     description: ''
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for consumer
 *         required: true
 *         type: string
 *       - name: cardId
 *         in: path
 *         description: ID for card
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.setDefault = async (req, res) => {
    try {
        const id = req.params.id;
        const cardId = req.params.cardId;
        const consumer = await Consumers.findOne({
            where: { id: id },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (!consumer) {
            log.error('Consumer not found', 'card::controller::setDefault::consumerNotFound');
            return res.status(404).json({ message: 'Consumer not found' });
        }
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'card::controller::setDefault::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        const cardModel = getCardModel(consumer.region.paymentMethod);
        const card = await cardModel.findOne({ where: { consumerId: id, id: cardId } });
        if (!card) {
            log.error('Card not found', 'card::controller::setDefault::getCards');
            return res.status(404).json({ message: 'Card not found' });
        }
        try {
            await cardModel.update({ isDefault: true }, { where: { consumerId: id, id: cardId } });
            await cardModel.update({ isDefault: false }, { where: { consumerId: id, [Op.not]: [{ id: [cardId] }] } });
        } catch (err) {
            log.error(err, 'card::controller::setDefault::update');
            return res.status(500).json({ message: 'Error in update Cards' });
        }
        const payload = { where: { consumerId: id } };
        const cards = await cardModel.findAll(payload);
        return res.json(cards);
    } catch (err) {
        log.error(err, 'card::controller::setDefault');
        return res.status(500).json({ message: 'Error in setDefault card' });
    }
};

/**
 * @swagger
 * /mobile/consumer/{id}/addCard:
 *   post:
 *     tags:
 *       - Private - Cards
 *     summary: Add card
 *     description: ''
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for consumer
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.add = async (req, res) => {
    try {
        const consumer = await Consumers.findOne({
            where: { id: req.user.id },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (!consumer) {
            log.error('Consumer not found', 'card::controller::addCard::getConsumer');
            return res.status(404).json({ message: 'Consumer not found' });
        }
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'card::controller::addCard::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        const transactionId = await getTransactionId();
        const client = getBankClient(consumer.region.paymentMethod);
        const orderPayload = cardHelper.attach.payload({
            transactionId,
            consumer
        });
        let registeredOrder;
        try {
            registeredOrder = await client.attachCard(orderPayload);
        } catch (err) {
            log.error(err, 'card::controller::addCard::attachCard');
            return res.status(500).json({ data: { hasError: true, err: err } });
        }
        if ((consumer.region.paymentMethod === PROVIDERS.STRIPE || consumer.region.paymentMethod === PROVIDERS.STRIPE_TEST) && !consumer.stripeCustomerId && registeredOrder.data?.customer) {
            await Consumers.update(
                { stripeCustomerId: registeredOrder.data.customer },
                { where: { id: req.user.id } }
            );
        }
        const transactionData = cardHelper.attach.transactionData({ consumer, transactionId, registeredOrder });
        if (registeredOrder.hasError) {
            await createTransaction(transactionData, registeredOrder, consumer.region.paymentMethod, true);
            log.error(registeredOrder, 'card::controller::addCard::attachCard::hasError');
            return res.status(500).json({ registeredOrder });
        }
        await createTransaction(transactionData, registeredOrder, consumer.region.paymentMethod);
        return res.json(cardHelper.attach.response(consumer.region.paymentMethod, registeredOrder));
    } catch (err) {
        log.error(err, 'card::controller::addCard');
        return res.status(500).json({ message: 'Error in card add' });
    }
};

/**
 * @swagger
 * /mobile/consumer/{id}/card/{cardId}:
 *   delete:
 *     tags:
 *       - Private - Cards
 *     summary: Delate card
 *     description: ''
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for consumer
 *         required: true
 *         type: string
 *       - name: cardId
 *         in: path
 *         description: ID for card
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        const cardId = req.params.cardId;
        const consumer = await Consumers.findOne({
            where: { id },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (!consumer) {
            log.error('Consumer not found', 'card::controller::delete::getConsumer');
            return res.status(404).json({ message: 'Consumer not found' });
        }
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'card::controller::delete::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        const cardModel = getCardModel(consumer.region.paymentMethod);
        const card = await cardModel.findOne({ where: { id: cardId, consumerId: consumer.id, paymentType: TYPE.BANK_CARD } });
        if (!card) {
            log.error({ message: 'no card found' }, 'card::controller::delete::getCard');
            return res.status(404).json({ message: 'no card found' });
        }
        const client = getBankClient(consumer.region.paymentMethod);
        let result;
        try {
            result = await client.removeCard(cardHelper.delete.payload(consumer.region.paymentMethod, card));
        } catch (err) {
            log.error(err, 'order::controller::delate::removeCard');
            return res.status(500).json({ data: { hasError: true, err: err } });
        }
        if (result.hasError) {
            log.error(result, 'card::controller::delate::removeCard::hasError');
            return res.status(500).json({ result });
        }
        const isDefault = card.isDefault;
        await cardModel.destroy({
            where: {
                id: cardId,
                paymentType: TYPE.BANK_CARD
            }
        });
        const isCardExist = await cardModel.findOne({ where: { consumerId: consumer.id } });
        if (!isCardExist) {
            await Consumers.update(
                { hasCardAttached: false },
                { where: { id: consumer.id } }
            );
        } else {
            if (isDefault) {
                await cardModel.update({ isDefault: true }, { where: { id: isCardExist.id } });
            }
        }

        return res.json({ message: 'card has been deleted' });
    } catch (err) {
        log.error(err, 'card::controller::delete');
        return res.status(400).json({ message: 'card delate error' });
    }
};

/**
 * @swagger
 * /mobile/stripe/customer/{id}/confirm/paymentIntent/{setupIntentId}:
 *   post:
 *     tags:
 *       - Private - Cards
 *     summary: Confirm payment
 *     description: ''
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for stripe customer
 *         required: true
 *         type: string
 *       - name: setupIntentId
 *         in: path
 *         description: ID for setup intent
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.stripePaymentResult = async (req, res) => {
    try {
        const { id: customerId, setupIntentId } = req.params;
        const consumer = await Consumers.findOne({
            where: { id: req.user.id },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (!consumer) {
            log.error('Consumer not found', 'card::controller::stripePaymentResult::getConsumer');
            return res.status(404).json({ message: 'Consumer not found' });
        }
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'card::controller::stripePaymentResult::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        if (!consumer.stripeCustomerId || consumer.stripeCustomerId !== customerId || !(consumer.region.paymentMethod === PROVIDERS.STRIPE || consumer.region.paymentMethod === PROVIDERS.STRIPE_TEST)) {
            log.error('Forbidden', 'card::controller::stripePaymentResult::stripeCustomerId');
            return res.status(403).json({ message: 'Forbidden' });
        }
        const transactionId = await getTransactionId();
        const transactionData = {
            transactionId,
            amount: 0,
            description: stripe.BINDING.DESCRIPTION,
            clientId: consumer.stripeCustomerId,
            paymentType: TYPE.BANK_CARD,
            paymentProvider: consumer.region.paymentMethod,
            mdOrder: setupIntentId,
        };
        let setupIntent;
        const client = getBankClient(consumer.region.paymentMethod);
        try {
            setupIntent = await client.getSetupIntent(setupIntentId);
        } catch (err) {
            log.error(err, 'card::controller::addCard::stripePaymentResult::getOrderStatus');
            return res.status(500).json({ data: { hasError: true, err: err } });
        }
        if (setupIntent.hasError || setupIntent.data?.status !== 'succeeded') {
            await createTransaction(transactionData, setupIntent, consumer.region.paymentMethod, true);
            log.error(setupIntent, 'card::controller::addCard::paymentResult::getOrderStatus::hasError');
            return res.status(500).json({ setupIntent });
        }
        const paymentMethodId = setupIntent.data.payment_method;
        if (await StripeCards.findOne({ where: { paymentMethodId, consumerId: req.user.id } })) {
            log.error('card exist', 'card::controller::addCard::stripePaymentResult::cardExist');
            return res.status(409).json({ message: 'Card exist' });
        }
        let stripePaymentMethod;
        try {
            stripePaymentMethod = await client.getPaymentMethod(paymentMethodId);
        } catch (err) {
            log.error(err, 'card::controller::addCard::stripePaymentResult::getPaymentMethod');
            return res.status(500).json({ data: { hasError: true, err: err } });
        }
        if (stripePaymentMethod.hasError) {
            log.error(stripePaymentMethod, 'card::controller::addCard::stripePaymentResult::getPaymentMethod::hasError');
            return res.status(500).json({ stripePaymentMethod });
        }
        if (consumer.stripeCustomerId !== stripePaymentMethod.data.customer) {
            log.error('Forbidden', 'card::controller::stripePaymentResult::customer');
            return res.status(403).json({ message: 'Forbidden' });
        }
        const isDefault = !await StripeCards.findOne({ where: { consumerId: consumer.id } });

        const cardData = {
            consumerId: consumer.id,
            isDefault,
            expirationDate: new Date(moment(`${stripePaymentMethod.data.card.exp_year}/${stripePaymentMethod.data.card.exp_month}`, 'YYYYMM').endOf('month')),
            paymentMethodId,
            maskedPan: `********${stripePaymentMethod.data.card.last4}`,
            paymentType: TYPE.BANK_CARD
        };
        const newCard = await StripeCards.create(cardData);
        if (!consumer.hasCardAttached) {
            await Consumers.update(
                { hasCardAttached: true },
                { where: { id: consumer.id } }
            );
        }
        await createTransaction(transactionData, setupIntent, consumer.region.paymentMethod);
        return res.json({ success: true, cardId: newCard.id });
    } catch (err) {
        log.error(err, 'card::controller::addCard::stripePaymentResult');
        return res.status(500).json({ err });
    }
};

/**
 * @swagger
 * /mobile/consumer/{id}/card/type/{type}:
 *   post:
 *     tags:
 *       - Private - Cards
 *     summary: Add card by type
 *     description: ''
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID for consumer
 *         required: true
 *         type: string
 *       - name: type
 *         in: path
 *         description: type for card
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.addCardByType = async (req, res) => {
    let transaction;
    try {
        let payload;
        try {
            payload = await isSchemeValid(cardsValidator.addCardByType, {
                consumerId: req.params.id,
                cardType: req.params.type
            });
        } catch (err) {
            loggerValidations.error(err, 'card::controller::addCardByType::validation');
            return res.status(400).json({ err, message: 'validation error' });
        }
        const { consumerId, cardType } = payload;
        const consumer = await Consumers.findOne({
            where: { id: consumerId },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (!consumer) {
            log.error('Consumer not found', 'card::controller::addCardByType::consumerNotFound');
            return res.status(404).json({ message: 'Consumer not found' });
        }
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'card::controller::addCardByType::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        if (!(consumer.region.paymentMethod === PROVIDERS.STRIPE || consumer.region.paymentMethod === PROVIDERS.STRIPE_TEST)) {
            log.error('FORBIDDEN', 'card::controller::addCardByType::paymentMethod');
            return res.status(403).json({ error: 'FORBIDDEN' });
        }
        const paymentType = cardHelper.addCardByType.getPaymentTypeType(cardType);
        const isExistCard = await StripeCards.findOne({
            where: {
                consumerId: consumer.id,
                paymentType
            }
        });
        if (isExistCard) {
            log.error(`${cardType} already exists`, 'card::controller::addCardByType::isExistCard');
            return res.status(409).json({ card: isExistCard, message: `${cardType} already exists` });
        }
        transaction = await sequelize.transaction();
        await StripeCards.update(
            { isDefault: false },
            { where: { consumerId: consumer.id }, transaction }
        );
        const cardPayload = {
            expirationDate: new Date(),
            isDefault: true,
            maskedPan: cardType.padStart(12, '*'),
            consumerId,
            paymentType,
            paymentMethodId: `${cardType} pay`,
        };
        const card = await StripeCards.create(cardPayload, { transaction });
        if (!consumer.hasCardAttached) {
            await Consumers.update(
                { hasCardAttached: true },
                { where: { id: consumer.id }, transaction }
            );
        }
        await transaction.commit();
        return res.json(card);
    } catch (err) {
        log.error(err, 'card::controller::addCardByType');
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (errRollback) {
                log.error(errRollback, 'card::controller::addCardByType::rollback');
            }
        }
        return res.status(500).json({ err });
    }
};