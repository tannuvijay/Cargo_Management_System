
const express = require('express');
const { simulateDay } = require('../controllers/simulateController');
const router = express.Router();

// Route for simulating a day
router.post('/day', simulateDay);

module.exports = router;