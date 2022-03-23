const {
    organizations: Organizations,
    consumers: Consumers,
    sequelize,
} = require('app/models/models');
const { Op } = require('sequelize');
const { organizations: organizationsValidator } = require('app/schemes');
const { isSchemeValid } = require('app/helpers/validate');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');

/**
 * @swagger
 * '/organizations':
 *   get:
 *     tags:
 *       - Organizations
 *     summary: Get organizations
 *     description: ''
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.getGroups = async (req, res) => {
    try {
        const organizations = await Organizations.findAll();
        return res.json(organizations);
    } catch (err) {
        log.error(err, 'organizations::controller::getGroups');
        return res.status(500).json({ message: 'Error to get organizations' });
    }
};

/**
 * @swagger
 * '/organizations':
 *   post:
 *     tags:
 *       - Organizations
 *     summary: Add organization
 *     description: ''
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               ids:
 *                 type: array
 *                 items:
 *                   type: number
 *               organizationId:
 *                 type: number
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */

module.exports.addGroupOrMembers = async (req, res) => {
    let transaction;
    try {
        const payload = { ...req.body };
        try {
            await isSchemeValid(organizationsValidator.addGroupOrMembers, payload);
        } catch (err) {
            loggerValidations.error(err, 'organizations::addGroupOrMembers::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        const organizationParams = {
            where: {
                name: payload.name,
            }
        };
        if (payload.organizationId) {
            organizationParams.where.id = payload.organizationId;
        }
        const organization = await Organizations.findOne(organizationParams);
        if (!organization && payload.organizationId) {
            log.error('Organization not found', 'organizations::addGroupOrMembers::organization not found');
            return res.status(404).json({ message: 'Organization not found' });
        }
        transaction = await sequelize.transaction();
        let organizationId;
        if (!organization) {
            const { id: createdId } = await Organizations.create({ name: payload.name }, { transaction });
            organizationId = createdId;
        } else {
            organizationId = organization.id;
        }
        await Consumers.update({ organizationId }, { where: { id: { [Op.in]: payload.ids } }, transaction });
        await transaction.commit();
        return res.json({ status: true, message: 'Organization has been added successfully' });
    } catch (err) {
        if (transaction) {
            await transaction.rollback();
        }
        log.error(err, 'organizations::addGroupOrMembers::server error');
        return res.status(500).json({ message: 'Error to add organizations' });
    }
};

/**
 * @swagger
 * '/organizations/{organizationId}/consumers/{consumerId}':
 *   delete:
 *     tags:
 *       - Organizations
 *     summary: Remove consumer from organization
 *     description: ''
 *     parameters:
 *       - name: organizationId
 *         in: path
 *         description: ID for organization
 *         required: true
 *         type: number
 *       - name: consumerId
 *         in: path
 *         description: ID for consumer
 *         required: true
 *         type: number
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */

module.exports.deleteGroupMember = async (req, res) => {
    try {
        const { organizationId, consumerId } = req.params;
        if (!organizationId || !consumerId) {
            loggerValidations.error('Invalid params', 'organizations::controller::deleteGroupMember');
            return res.status(400).json({ message: 'validation error' });
        }
        const payload = {
            where: {
                organizationId,
                id: consumerId
            }
        };
        const consumer = await Consumers.findOne(payload);
        if (!consumer) {
            log.error('Consumer not found', 'organizations::deleteGroupMember::consumer not found');
            return res.status(404).json({ message: 'Consumer not found' });
        }
        await Consumers.update({ organizationId: null }, { where: { id: consumerId } });
        return res.json({ status: true, message: 'The consumer has been successfully removed from the organization' });
    } catch (err) {
        log.error(err, 'organizations::deleteGroupMember::server error');
        return res.status(500).json({ message: 'Error to consumer delete from organizations' });
    }
};