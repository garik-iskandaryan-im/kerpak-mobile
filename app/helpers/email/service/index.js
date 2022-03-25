const { users: Users } = require('app/models/models');

const getSPUsersEmails = async (serviceProviderId, onlyOwners = true) => {
    if (!serviceProviderId) {
        return [];
    }
    const payload = { where: { serviceProviderId } };
    if (onlyOwners) {
        payload.where.owner = true;
    }
    const serviceProviders = await Users.findAll(payload);
    return serviceProviders.map(({ email }) => email);
};

const getOperatorsEmails = async () => {
    const serviceProviders = await Users.findAll({ where: { isKerpakOperator: true } });
    return serviceProviders.map(({ email }) => email);
};

module.exports = {
    getSPUsersEmails,
    getOperatorsEmails,
};