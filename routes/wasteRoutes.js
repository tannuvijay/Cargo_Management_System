
// const express = require('express');
// const { identifyWaste } = require('../controllers/wasteController');
// const { getReturnPlan } = require('../controllers/wasteController');
// const router = express.Router();

// router.get('/identify', identifyWaste);
// router.get('/return-plan', getReturnPlan);

// module.exports = router;



const express = require('express');
const { identifyWaste, getReturnPlan,getWasteItems} = require('../controllers/wasteController');
const router = express.Router();

router.get('/identify', identifyWaste);
router.get('/return-plan', getReturnPlan);
router.get('/waste-items', getWasteItems);

module.exports = router;
