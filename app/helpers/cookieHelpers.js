const {cookies} = require('../settings');

const addCookie = (req, res, name, value) => {
    const cookie = Object.values(cookies).find(c => c.name === name);
    if(cookie) {
        res.cookie(cookie.name, value, {
            maxAge: cookie.maxAge,
            httpOnly: cookie.httpOnly
        });
    }
};

module.exports = {addCookie};