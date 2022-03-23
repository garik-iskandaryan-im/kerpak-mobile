const {
    notifications: Notifications,
    consumers: Consumers
} = require('app/models/models');
const { Op } = require('sequelize');
const { getListPayload, getPayloadForNotificationFilter, addOrderById } = require('app/controllers/common');
const { isSchemeValid } = require('app/helpers/validate');
const { notification } = require('app/schemes');
const { PLATFORM } = require('app/constants');
const log = require('app/helpers/logger');
const { sendNotification } = require('app/services/firebase');

/**
 * @swagger
 * '/notifications':
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get notifications list
 *     description: ''
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.list = async (req, res) => {
    let payload = {
        ...getListPayload(req),
    };
    payload = addOrderById(payload);

    Notifications.findAndCountAll(payload)
        .then(({ count, rows }) => {
            return res.json({ count, data: rows });
        })
        .catch((err) => {
            log.error(err, 'notifications::controller::getNotifications');
            return res.status(500).json({ message: 'Error in get notifications list' });
        });
};

/**
 * @swagger
 * /notification:
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Create notification
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               campaign:
 *                 type: string
 *                 required: true
 *               title:
 *                 type: string
 *               text:
 *                 type: string
 *                 required: true
 *               platform:
 *                 type: array
 *                 required: true
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *               earliestOrderDate:
 *                 type: string
 *                 format: date-time
 *               latestOrderDate:
 *                 type: string
 *                 format: date-time
 *               numberOfOrdersMin:
 *                 type: number
 *               numberOfOrdersMax:
 *                 type: number
 *               kioskOfLastOrder:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *               consumerIds:
 *                 type: string
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.create = async (req, res) => {
    const payload = { ...req.body };
    isSchemeValid(notification.create, payload)
        .then(async notificationData => {
            notificationData.platform.forEach(os => {
                if (os.title === PLATFORM.ios) {
                    notificationData.isIOS = true;
                } else if (os.title === PLATFORM.android) {
                    notificationData.isAndroid = true;
                }
            });
            if (!notificationData.isAndroid && !notificationData.isIOS) {
                log.error('platform is required', 'notification::create::platform is required');
                return res.status(400).json({ message: 'platform is required' });
            }
            const payload = getPayloadForNotificationFilter(notificationData);
            payload.where.firebaseRegistrationToken = { [Op.ne]: null };
            payload.attributes = ['id', 'firebaseRegistrationToken'];
            const registredConsumers = await Consumers.findAndCountAll(payload);
            let registrationTokens = [];
            for (let i = 0, len = registredConsumers.rows.length; i < len; i++) {
                registrationTokens.push(registredConsumers.rows[i].firebaseRegistrationToken);
            }
            if (registrationTokens.length) {
                let result = await sendNotification(notificationData.title, notificationData.text, registrationTokens);
                notificationData.receivedConsumersCount = result.successCount;
            } else {
                notificationData.receivedConsumersCount = 0;
            }
            delete notificationData.platform;
            notificationData.registredConsumersCount = registredConsumers.rows.length;
            if (notificationData.kioskOfLastOrder) {
                notificationData.kioskOfLastOrder = notificationData.kioskOfLastOrder.map(kiosk => kiosk.id).join(',');
            }

            await Notifications.create(notificationData);
            return res.json({ message: 'notification has been created' });
        })
        .catch(err => {
            log.error(err, 'notification::create::server error');
            return res.status(500).json({ message: 'Error in create notification' });
        });
};

/**
 * @swagger
 * '/notifications/{id}':
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get notification by id
 *     description: ''
 *     parameters:
 *       - name: id
 *         in: path
 *         description: notification ID
 *         required: true
 *         type: string
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.get = async (req, res) => {
    try {
        const id = req.params.id;
        const notification = await Notifications.findOne({ where: { id } });

        if (!notification) {
            return res.status(404).json({ message: 'notification not found' });
        }
        return res.json(notification);
    } catch (err) {
        log.error(err, 'notifications::controller::get');
        return res.status(400).json({ message: 'Error in get notification' });
    }
};