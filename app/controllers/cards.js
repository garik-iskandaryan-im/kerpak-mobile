const fs = require('fs');
const moment = require('moment');
const {
    cards: Cards,
    transactions: Transactions,
    stripeCards: StripeCards,
    consumers: Consumers,
    regions: Regions
} = require('app/models/models');
const { payment: { STATUS, PROVIDERS, TYPE } } = require('../settings');
const log = require('app/helpers/logger');
const { isValidExtendedStatus } = require('app/services/payment');
const { getBankClient } = require('app/helpers/payment/common');

const getCardModel = paymentMethod => paymentMethod === PROVIDERS.ID_BANK ? Cards : StripeCards;

module.exports.paymentResult = async (req, res) => {
    try {
        const { orderId } = req.query;
        let statusResponse;
        let statusRes;
        try {
            const client = getBankClient(PROVIDERS.ID_BANK);
            statusResponse = await client.getOrderStatus({ orderId: orderId, extended: true });
            statusRes = await client.getOrderStatus({ orderId: orderId });
        } catch (err) {
            log.error(err, 'card::controller::addCard::paymentResult::getOrderStatus');
            return res.status(500).json({ data: { hasError: true, err: err } });
        }
        if (statusResponse.hasError || statusResponse.data?.orderStatus !== 2) {
            log.error(statusResponse, 'card::controller::addCard::paymentResult::hasError');
            return await fs.readFile('app/assets/responses/addCardErrorPage.html', 'utf-8', function (error, data) {
                if (error) {
                    log.error(error, 'card::paymentResult::addCardErrorPage::Step-1');
                    return res.end();
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(data);
                return res.end();
            });
        }
        const { bindingInfo: { clientId, bindingId } = {} } = statusResponse.data;
        const transactionId = statusResponse.data?.orderNumber;
        const transactionData = {
            approvalCode: statusRes.data?.approvalCode,
            authRefNum: statusResponse.data?.authRefNum,
            authCode: statusRes.data?.authCode,
            providerStatus: statusResponse.data?.actionCode,
            providerOrderId: orderId,
        };
        if (isValidExtendedStatus(statusResponse.data) && bindingId && clientId) {
            // If card was already bind
            if (!await Cards.findOne({ where: { bindingId } })) {
                // TODO: change to the corresponding method call (get list with clientId filter) and soft delete!!!
                const consumer = JSON.parse(JSON.stringify(await Consumers.findOne({ where: { bankClientId: clientId } })));
                const isDefault = !await Cards.findOne({ where: { consumerId: consumer.id } });
                transactionData.status = STATUS.SUCCESS;
                let maskedPan = statusResponse.data.cardAuthInfo.pan;

                const cardData = {
                    bindingId,
                    consumerId: consumer.id,
                    active: true,
                    isDefault,
                    expirationDate: new Date(moment(statusResponse.data.cardAuthInfo.expiration, 'YYYYMM').endOf('month')),
                    maskedPan: maskedPan.replace(maskedPan.substring(2, 8), '******'),
                    paymentType: TYPE.BANK_CARD
                };
                await Cards.create(cardData);
                await Transactions.update(transactionData, { where: { transactionId } });
                if (!consumer.hasCardAttached) {
                    await Consumers.update(
                        { hasCardAttached: true },
                        { where: { id: consumer.id } }
                    );
                }
            }
            return await fs.readFile('app/assets/responses/addCardSuccessPage.html', 'utf-8', function (error, data) {
                if (error) {
                    log.error(error, 'card::paymentResult::addCardSuccessPage');
                    return res.end();
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(data);
                return res.end();
            });
        }
        transactionData.status = STATUS.ERROR;
        await Transactions.update(transactionData, { where: { transactionId } });
        return await fs.readFile('app/assets/responses/addCardErrorPage.html', 'utf-8', function (error, data) {
            if (error) {
                log.error(error, 'card::paymentResult::addCardErrorPage::Step-2');
                return res.end();
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(data);
            return res.end();
        });
    } catch (err) {
        log.error(err, 'card::addCard::paymentResult');
        return await fs.readFile('app/assets/responses/addCardErrorPage.html', 'utf-8', function (error, data) {
            if (error) {
                log.error(error, 'card::paymentResult::addCardErrorPage::Step-3');
                return res.end();
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(data);
            return res.end();
        });
    }
};

/**
 * @swagger
 * /card/consumer/{id}:
 *   get:
 *     tags:
 *       - Consumers
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
            log.error('Consumer not found', 'card::getCards::consumerNotFound');
            return res.status(404).json({ message: 'Consumer not found' });
        }
        if (!consumer.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'card::controller::paymentMethod');
            return res.status(404).json({ message: 'There are no supported payment methods in the region.' });
        }
        const cardModel = getCardModel(consumer.region.paymentMethod);
        const cards = await cardModel.findAll({ where: { consumerId: consumerId, paymentType: TYPE.BANK_CARD } });
        return res.json(cards);
    } catch (err) {
        log.error(err, 'card::getCards::server error');
        return res.status(500).json({ message: 'Error in get cards list' });
    }
};