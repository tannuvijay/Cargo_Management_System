
const express = require('express');
const {
  getPlacementRecommendations,
  retrieveItem
} = require('../controllers/itemsController');

const router = express.Router();

router.post('/placement', getPlacementRecommendations);
router.post('/retrieve', retrieveItem);

module.exports = router;




