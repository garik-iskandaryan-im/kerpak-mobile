const isActionAllowed = (req, res, next) => {
    const id = req.params.id;
    if (!req.user || !req.user.id || !id || parseInt(id) !== parseInt(req.user.id)) {
        res.status(403);
        return res.send({ messages: 'forbidden' });
    }
    return next();
};

const isConsumer = (req, res, next) => {
    if (!req.user || !req.user.id || !(req.user.registerCompleted || req.user.registerByEmailCompleted)) {
        res.status(403);
        return res.send({ messages: 'forbidden' });
    }
    return next();
};

module.exports = { isActionAllowed, isConsumer };