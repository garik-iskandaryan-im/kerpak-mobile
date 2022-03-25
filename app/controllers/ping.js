// const {handleErrors} = require('../helpers/utils');

const getPing = async (req, res) => {
    try {
        res.send('pong');
    } catch (err) {
        console.log(err);
        // handleErrors(res, err);
    }
};

module.exports = {
    getPing
};