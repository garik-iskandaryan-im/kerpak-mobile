const express = require('express');
const router = express.Router();

const { getPing } = require('../controllers/ping');

router.get('/', getPing);

module.exports = router;