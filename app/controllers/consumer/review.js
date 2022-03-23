const {
    reviews: Reviews,
    orders: Orders,
} = require('app/models/models');
const { review } = require('app/schemes');
const { isSchemeValid } = require('app/helpers/validate');
const log = require('app/helpers/logger');

/**
 * @swagger
 * /mobile/review:
 *   post:
 *     tags:
 *       - Mobile APIs
 *     summary: Create review
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 required: true
 *               message:
 *                 type: string
 *               orderId:
 *                 type: number
 *                 required: true
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.create = async (req, res) => {
    const payload = { ...req.body };
    isSchemeValid(review.create, payload)
        .then(async reviewData => {
            const order = await Orders.findOne({
                where: {
                    id: reviewData.orderId
                },
                include: [
                    { model: Reviews, required: false }
                ]
            });
            if (!order) {
                log.error('order not found', 'review::getOrder::order not found');
                return res.status(404).json({ message: 'order not found' });
            } else if (order.review) {
                log.error('order review already exist', 'review::getReview::already exist');
                return res.status(409).json({ message: 'order review already exist' });
            }
            if (order.consumerId !== req.user.id) {
                return res.status(403).json({ message: 'forbidden' });
            }
            reviewData.consumerId = order.consumerId;
            reviewData.kioskId = order.kioskId;
            reviewData.serviceProviderId = order.serviceProviderId;
            const newReview = await Reviews.create(reviewData);
            return res.json({ review: newReview, message: 'review has been created' });
        })
        .catch(err => {
            log.error(err, 'review::create::validation');
            return res.status(400).json({ message: 'validation error' });
        });
};