
const { Op } = require('sequelize');
const {
    serviceProviders: ServiceProviders,
    kiosks: Kiosks,
    warehouses: Warehouses,
    regions: Regions,
    Sequelize,
    sequelize,
} = require('app/models/models');
const { serviceProviders: serviceProviderValidator } = require('app/schemes');
const { isSchemeValid } = require('app/helpers/validate');
const log = require('app/helpers/logger');
const loggerValidations = require('app/helpers/loggerValidations');
const { getListPayload, addOrderById } = require('app/controllers/common');
const { getBankClient } = require('app/helpers/payment/common');
const { payment: { PROVIDERS } } = require('app/settings');

module.exports.getNames = async (req, res) => {
    return ServiceProviders.findAndCountAll({
        attributes: ['id', 'legalName', 'brandName', 'primaryLogo', 'multiTenantSupport', 'isSpAllowDelivery', 'havePreOrder', 'stripeId'],
        include: [{model: Regions, attributes: ['id', 'isoCode', 'currencyName', 'currencySymbol', 'timezone', 'image', 'isDefault'], required: true }]
    })
        .then(({ count, rows }) => {
            return res.json({ count, data: rows });
        })
        .catch((err) => {
            log.error(err, 'serviceProvider::getServiceProvidersNames');
            return res.status(500).json({ message: 'Error in get service provider list' });
        });
};

module.exports.list = async (req, res) => {
    try {
        let payload = getListPayload(req, true);
        payload.subQuery = false;
        payload.group = [Sequelize.col('serviceProviders.id')];
        payload.attributes = ['id', 'primaryLogo', 'brandName', 'contactPhone', [Sequelize.fn('count', Sequelize.col('kiosks.id')), 'kiosksCount']];
        payload.include = [{ model: Kiosks, attributes: [], required: false }];
        payload = addOrderById(payload);
        const { count, rows } = await  ServiceProviders.findAndCountAll(payload);
        return res.json({ count: count.length, data: rows });
    } catch (err) {
        log.error(err, 'serviceProvider::getServiceProvidersList');
        return res.status(500).json({ err, message: 'Error in get service provider list' });
    }
};

module.exports.get = async (req, res) => {
    try {
        const id = Number(req.params.id);
        try {
            await isSchemeValid(serviceProviderValidator.get, { id });
        } catch (err) {
            loggerValidations.error(err, 'serviceProvider::getServiceProvider::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        const payload = {
            where: { id },
            include: [
                { model: Regions, attributes: ['id', 'isoCode', 'currencyName', 'currencySymbol', 'timezone', 'image', 'isDefault'], required: true }
            ]
        };
        if (!req.user.isKerpakOperator) {
            payload.attributes = { exclude: ['isTesting'] };
        }
        const serviceProvider = await  ServiceProviders.findOne(payload);
        return res.json(serviceProvider);
    } catch (err) {
        log.error(err, 'serviceProvider::getServiceProvider::server error');
        return res.status(500).json({ message: 'Error in get serviceProvider' });
    }
};

module.exports.create = async (req, res) => {
    let t;
    try {
        const payload = { ...req.body };
        let serviceProvider;
        try {
            serviceProvider = await isSchemeValid(serviceProviderValidator.create, payload);
        } catch (err) {
            loggerValidations.error(err, 'serviceProvider::create::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        if (!req.user.isKerpakOperator && payload.pinIcon) {
            log.error('serviceProvider::create::pinIcon');
            return res.status(400).json({ message: 'Validation error, could not add pinIcon.' });
        }
        // TODO: need to delete
        if (serviceProvider.regionId) {
            const region = await Regions.findOne({where: { id: serviceProvider.regionId }});
            serviceProvider.regionalSettings = region.isoCode.toUpperCase();
        }
        const { legalName, brandName } = serviceProvider;
        const exist = await ServiceProviders.findOne({
            where: { [Op.or]: [{ legalName }, { brandName }] }
        });
        if (exist) {
            return res.status(409).json({ message: 'brandName or legalName already in use' });
        }
        t = await sequelize.transaction();
        const createdServiceProvider = await ServiceProviders.create(serviceProvider, { transaction: t });
        if (!createdServiceProvider) {
            await t.rollback();
            log.error('Error in create serviceProvider', 'serviceProvider::create::serviceProvider::rollback');
            return res.status(500).json({ message: 'Error in create serviceProvider' });
        }
        let warehouse = {
            displayName: createdServiceProvider.legalName + ' Warehouse Kiosk',
            description: 'Warehouse Kiosk for ' + legalName + ' Warehouse Kiosk',
            serviceProviderId: createdServiceProvider.id,
            warehouse: true,
            status: 'active',
            useTeltonika: false,
        };
        const createdWarehouse = await Warehouses.create(warehouse, { transaction: t });
        if (!createdWarehouse) {
            await t.rollback();
            log.error('Error in create warehouse', 'serviceProvider::create::warehouse::rollback');
            return res.status(500).json({ message: 'Error in create warehouse' });
        }
        await t.commit();
        return res.json({ createdServiceProvider, message: 'serviceProvider has been created' });
    } catch (err) {
        if (t) {
            await t.rollback();
            log.error(err, 'serviceProvider::create::rollback');
        }
        log.error(err, 'serviceProvider::create::server error');
        return res.status(500).json({ message: 'Error in create serviceProvider' });
    }
};

module.exports.update = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const payload = { ...req.body };
        let serviceProvider;
        try {
            serviceProvider = await isSchemeValid(serviceProviderValidator.update, payload);
        } catch (err) {
            loggerValidations.error(err, 'serviceProvider::update::validation');
            return res.status(400).json({ message: 'validation error' });
        }
        if (!req.user.isKerpakOperator && payload.pinIcon) {
            log.error('serviceProvider::update::pinIcon');
            return res.status(400).json({ message: 'Validation error, could not change pinIcon.' });
        }
        // TODO: need to delete
        if (serviceProvider.regionId) {
            const region = await Regions.findOne({where: { id: serviceProvider.regionId }});
            serviceProvider.regionalSettings = region.isoCode.toUpperCase();
        }
        const { legalName, brandName } = serviceProvider;
        if (!req.user.isKerpakOperator && Object.prototype.hasOwnProperty.call(serviceProvider, 'isTesting')) {
            res.status(403);
            return res.send({ message: 'forbidden' });
        }
        const exist = await ServiceProviders.findOne({
            where: { [Op.or]: [{ legalName }, { brandName }], id: { [Op.ne]: id } }
        });
        if (exist) {
            return res.status(409).json({ message: 'brandName or legalName already in use' });
        }
        const [updated] = await ServiceProviders.update(serviceProvider, { where: { id } });
        if (!updated) {
            log.error('Error in update serviceProvider', 'serviceProvider::update::serviceProvider::rollback');
            return res.status(500).json({ message: 'Error in update serviceProvider' });
        }
        const updatedServiceProvider = await ServiceProviders.findOne({ where: { id } });
        return res.json({ updatedServiceProvider, message: 'serviceProvider has been updated' });
    } catch (err) {
        log.error(err, 'serviceProvider::update::server error');
        return res.status(500).json({ message: 'Error in update serviceProvider' });
    }
};

/**
 * @swagger
 * /serviceProviders/{id}/stripe/loginLink:
 *   get:
 *     tags:
 *       - Service providers
 *     summary: Get status of the order
 *     description: 'Try to get status of the order'
 *     parameters:
 *      - in: path
 *        name: id
 *        description: ID for service provider
 *        required: true
 *        type: number
 *     produces:
 *      - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - bearerAuth: []
 */
module.exports.getStripeLoginLink = async (req, res) => {
    try {
        const serviceProvider = await ServiceProviders.findOne({
            where: { id: Number(req.params.id) },
            include: [
                { model: Regions, required: true }
            ]
        });
        if (!serviceProvider) {
            log.error('serviceProvider not found', 'serviceProvider::controller::getStripeLoginLink::serviceProviderNotFound');
            return res.status(404).json({ message: 'Service provider not found' });
        }
        if (!serviceProvider.stripeId) {
            log.error('The service provider does not have a stripe account', 'serviceProvider::controller::getStripeLoginLink::stripeId');
            return res.status(409).json({ message: 'The service provider does not have a stripe account' });
        }
        if (!serviceProvider.region.paymentMethod) {
            log.error('There are no supported payment methods in the region.', 'serviceProvider::controller::getStripeLoginLink::noPaymentMethod');
            return res.status(409).json({ message: 'There are no supported payment methods in the region.' });
        }
        if (!(serviceProvider.region.paymentMethod === PROVIDERS.STRIPE || serviceProvider.region.paymentMethod === PROVIDERS.STRIPE_TEST)) {
            log.error('FORBIDDEN', 'serviceProvider::controller::getStripeLoginLink::forbidden');
            return res.status(403).json({ error: 'FORBIDDEN' });
        }
        const client = getBankClient(serviceProvider.region.paymentMethod);
        let response;
        try {
            response = await client.createLoginLink(serviceProvider.stripeId);
        } catch (err) {
            log.error(err, 'serviceProvider::controller::getStripeLoginLink::createLoginLink');
            return res.status(500).json({ hasError: true, err: err });
        }
        if (response.hasError) {
            log.error(response, 'serviceProvider::controller::getStripeLoginLink::createLoginLink::hasError');
            return res.status(500).json(response);
        }
        return res.json({ url: response.data.url });

    } catch (err) {
        log.error(err, 'order::controller::status::generic');
        return res.status(500).json({ success: false });
    }
};