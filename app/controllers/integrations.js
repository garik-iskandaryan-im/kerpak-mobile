const { integrations: Integrations } = require('app/models/models');
const { integrations: integrationValidator } = require('app/schemes');
const { isSchemeValidSync } = require('app/helpers/validate');
const log = require('app/helpers/logger');
const { getListPayload, getOnePayload, addOrderById } = require('app/controllers/common');

module.exports.list = async (req, res) => {
    try {
        let payload = getListPayload(req);
        payload = addOrderById(payload);

        const { count, rows } = await Integrations.findAndCountAll(payload)
        return res.json({ count, data: rows });
    } catch (err) {
        log.error(err, 'integration::list::server error');
        return res.status(500).json({ message: 'Error in get integration list' });
    }
};

module.exports.get = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { isValid, errors } = isSchemeValidSync(integrationValidator.get, { id });
        if (!isValid) {
            log.error(errors, 'integration::get::validation');
            return res.status(400).json({ message: 'validation failed' });
        }
        let payload = getOnePayload(req, id);
        const integration = await Integrations.findOne(payload);
        if (!integration) {
            return res.status(404).json({ message: 'integration not found' });
        }
        return res.json(integration);
    } catch (err) {
        log.error(err, 'integration::get::server error');
        return res.status(500).json({ message: 'Error in get integration' });
    }
};

module.exports.create = async (req, res) => {
    try {
        const payload = { ...req.body };
        const { isValid, errors, data: integrationData } = isSchemeValidSync(integrationValidator.create, payload);
        if (!isValid) {
            log.error(errors, 'integration::create::validation');
            return res.status(400).json({ message: 'validation failed' });
        }
        const integration = await Integrations.create(integrationData);
        if (!integration) {
            return res.status(500).json({ message: 'Error in create integration' });
        }
        return res.json(integration);
    } catch (err) {
        log.error(err, 'integration::create::server error');
        return res.status(500).json({ message: 'Error in create integration' });
    }
};

module.exports.update = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const payload = { ...req.body };
        const { isValid, errors, data: integrationData } = isSchemeValidSync(integrationValidator.update, payload);
        if (!isValid) {
            log.error(errors, 'integration::update::validation');
            return res.status(400).json({ message: 'validation failed' });
        }
        await Integrations.update(integrationData, { where: { id } });
        const integration = await Integrations.findOne({ where: { id } });
        if (!integration) {
            return res.status(500).json({ message: 'Error in update integration' });
        }
        return res.json(integration);
    } catch (err) {
        log.error(err, 'integration::update::server error');
        return res.status(500).json({ message: 'Error in update integration' });
    }
};
