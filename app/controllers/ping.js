const {handleErrors} = require('../helpers/utils');

const getPing = async (req, res) => {
    try {
        res.send('pong');
    } catch(err) {
        handleErrors(res, err);
    }
};

module.exports = {
    getPing
};