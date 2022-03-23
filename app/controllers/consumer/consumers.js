const {
    consumers: Consumers,
    stripeCards: StripeCards,
    cards: Cards,
    balanceHistary: BalanceHistary,
    preOrders: PreOrders,
    regions: Regions,
    sequelize
} = require('app/models/models');
const { consumers: consumersValidator } = require('app/schemes');
const { isSchemeValid } = require('app/helpers/validate');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');
const { payment: { PROVIDERS } } = require('app/settings');

const getCardModel = paymentMethod => paymentMethod === PROVIDERS.ID_BANK ? Cards : StripeCards;

/**
 * @swagger
 * '/mobile/consumer/{id}':
 *   get:
 *     tags:
 *       - Mobile APIs
 *     summary: Get consumer by id
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
module.exports.get = async (req, res) => {
    try {
        const id = req.params.id;
        const consumer = await Consumers.findOne({
            where: { id },
            include: [
                { model: Regions, attributes: ['paymentMethod'], required: true }
            ]
        });
        if (!consumer) {
            log.error('Consumer not found.', 'consumer::controller::getConsumer::getConsumer');
            return res.status(404).json({ error: 'Consumer not found.' });
        }
        consumer.dataValues.cards = [];
        if (consumer.region.paymentMethod) {
            const cardModel = getCardModel(consumer.region.paymentMethod);
            const cards = await cardModel.findAll({ where: { consumerId: id } });
            if (cards?.length) {
                consumer.dataValues.cards = cards;
            }
        }
        return res.json(consumer);
    } catch(err) {
        log.error(err, 'consumer::controller::getConsumer');
        return res.status(500).json({ message: 'Error in get consumer' });
    }
};

/**
 * @swagger
 * '/mobile/consumer/{id}/balance/history':
 *   get:
 *     tags:
 *       - Mobile APIs
 *     summary: Get consumer balance history
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
 module.exports.getBalanceHistory = async (req, res) => {
    const id = req.params.id;
    let payload = {
        where: {
            consumerId: id
        },
        attributes: ['id', 'balance', 'type', 'date']
    };
    return BalanceHistary.findAndCountAll(payload)
        .then(({ count, rows }) => {
            return res.json({ count, data: rows });
        })
        .catch((err) => {
            log.error(err, 'consumer::controller::getBalanceHistory');
            return res.status(500).json({ message: 'Error in get consumer balance history'});
        });
};

/**
 * @swagger
 * '/mobile/consumer/{id}/balance':
 *   get:
 *     tags:
 *       - Mobile APIs
 *     summary: Get consumer balance history
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
 module.exports.getBalance = async (req, res) => {
    const id = req.params.id;
    let payload = {
        where: {
            id
        },
        attributes: ['balance']
    };
    return Consumers.findOne(payload)
        .then((data) => {
            return res.json({'balance': data.balance});
        })
        .catch((err) => {
            log.error(err, 'consumer::controller::getBalance');
            return res.status(500).json({ message: 'Error in get consumer balance'});
        });
};

/**
 * @swagger
 * '/mobile/consumer/{id}':
 *   put:
 *     tags:
 *       - Mobile APIs
 *     summary: Update consumer
 *     description: ''
 *     parameters:
 *      - in: path
 *        name: id
 *        description: ID for consumer
 *        required: true
 *        type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               country:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               firebaseRegistrationToken:
 *                 type: string
 *               OS:
 *                 type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.update = async (req, res) => {
    let transaction;
    try {
        const id = req.params.id;
        const payload = { ...req.body };
        try {
            await isSchemeValid(consumersValidator.create, payload);
        } catch (err) {
            loggerValidations.error(err, 'consumer::update::validation');
            return res.status(409).json({ message: 'validation error' });
        }
        delete payload.id;
        delete payload.phone;
        delete payload.registerCompleted;
        delete payload.archived;
        transaction = await sequelize.transaction();
        const consumer =  await Consumers.update(payload, { where: { id }, transaction });
        const currConsumer =  await Consumers.findOne({ where: { id } });
        if (payload.firstName || payload.lastName) {
            const allPreOrders = await PreOrders.findAll({where: {consumerId: id, status: 'awaitingConfirmation'}});
            for (let i = 0; i < allPreOrders.length; ++i) {
                const preOrder = allPreOrders[i];
                const storedConsumerName = `${payload.firstName || currConsumer.firstName} ${payload.lastName || currConsumer.lastName}`;
                await PreOrders.update({ storedConsumerName }, {
                    where: { id: preOrder.id },
                    transaction
                });
            }
        }
        await transaction.commit();
        return res.json({ consumer, message: 'consumer has been updated' });
    } catch (err) {
        log.error(err, 'consumer::update::server error');
        try {
            await transaction.rollback();
        } catch (errRollback) {
            log.error(errRollback, 'consumer::controller::update::rollback');
        }
        return res.status(500).json({ message: 'Error in update consumer' });
    }
};
