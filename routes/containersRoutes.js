const express = require('express');
const { importContainers } = require('../controllers/containersController');
const router = express.Router();

router.post('/import', importContainers);

module.exports = router;
