const { regions: Regions } = require('app/models/models');

const isActionAllowed = (req, res, next) => {
    const id = req.params.id;
    if (!req.user || !req.user.id || !id || parseInt(id) !== parseInt(req.user.id)) {
        res.status(403);
        return res.send({messages: 'forbidden'});
    }
    return next();
};

const isConsumer = (req, res, next) => {
    if (!req.user || !req.user.id || !(req.user.registerCompleted || req.user.registerByEmailCompleted)) {
        res.status(403);
        return res.send({messages: 'forbidden'});
    }
    return next();
};

const validateRegion = async (req, res, next) => {
    if (!req.params.country_ISO) {
        return res.status(409).json({messages: 'Missing country_ISO code.'});
    }
    const region = await Regions.findOne({where: {isoCode: req.params.country_ISO}});
    if (!region) {
        return res.status(409).json({message: 'Provided invalid country_ISO code.'});
    }
    req.region = region;
    return next();
};

module.exports = {isActionAllowed, isConsumer, validateRegion};