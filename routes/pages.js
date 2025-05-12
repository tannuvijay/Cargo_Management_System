console.log("Me route me hu")
const express = require('express');
const {
  getDashboardPage,
  getPlacementPage,
  getWasteManagementPage,
  getLogsPage,
} = require('../controllers/pagesController');
console.log("Me route me hu")
const router = express.Router();
router.get('/', (req, res) => {
  res.render('layouts/main'); // Rendering main.ejs directly
});
router.get('/dashboard', getDashboardPage); // Dashboard
router.get('/placement', getPlacementPage); // Placement Recommendations
router.get('/waste', getWasteManagementPage); // Waste Management
router.get('/logs', getLogsPage); // Logs Viewer
router.get('/simulate', (req, res) => res.render('pages/simulate'));
module.exports = router;


