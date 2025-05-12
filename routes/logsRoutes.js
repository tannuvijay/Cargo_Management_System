const express = require('express');
const { getLogs,rearrangeItem,disposal } = require('../controllers/logsController');
const router = express.Router();
console.log("routes hooo");
router.get('/', getLogs);
router.get('/rearrange',rearrangeItem);
router.get('/disposal',disposal);

module.exports = router;