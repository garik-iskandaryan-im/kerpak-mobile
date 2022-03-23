const isKerpakUser = (req, res, next) => {
    if (req.user && req.user.isKerpakOperator) {
        return next();
    }
    res.status(403);
    return res.send({message: 'forbidden'});
};

const isKerpakUserOrOwner = (req, res, next) => {
    if (req.user && (req.user.isKerpakOperator || req.user.owner)) {
        return next();
    }
    res.status(403);
    return res.send({message: 'forbidden'});
};

const isAuthValid = (req, res, next) => {
    if (req.user && req.user.isKerpakOperator) {
        return next();
    }
    if (req.user && req.user.serviceProviderId) {
        return next();
    }
    res.status(403);
    return res.send({message: 'forbidden'});
};

const isUserEditAllowed = (req, res, next) => {
    if (req.user && req.user.isKerpakOperator) {
        return next();
    }
    if (req.user && req.user.serviceProviderId && req.user.id === Number(req.params.id)) {
        return next();
    }
    res.status(403);
    return res.send({message: 'forbidden'});
};

const isOwner = (req, res, next) => {
    if (req.user && req.user.serviceProviderId && req.user.id === Number(req.params.id)) {
        return next();
    }
    res.status(403);
    return res.send({message: 'forbidden'});
};

const isRecorseAllowed = (req, res, next) => {
    if (req.user && req.user.isKerpakOperator) {
        return next();
    }
    if (req.user && req.user.serviceProviderId && req.user.serviceProviderId === Number(req.params.id)) {
        return next();
    }
    res.status(403);
    return res.send({message: 'forbidden'});
};

const hasUserManagePermission = (req, res, next) => {
    if (req.user && req.user.isKerpakOperator) {
        return next();
    }
    if (req.user && req.user.serviceProviderId === req.body.serviceProviderId && req.user.owner) {
        return next();
    }
    if (req.user && req.user.serviceProviderId && req.user.id === Number(req.params.id)) {
        return next();
    }
    res.status(403);
    return res.send({message: 'forbidden'});
};

module.exports = {isKerpakUser, isAuthValid, isRecorseAllowed, isUserEditAllowed, isOwner, hasUserManagePermission, isKerpakUserOrOwner};