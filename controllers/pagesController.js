


const axios = require('axios');
const Container = require('../models/Container');
const Log = require('../models/Log');

// Dashboard Page
exports.getDashboardPage = async (req, res) => {
  try {
    // Fetch dashboard statistics via the API
    const response = await axios.get('http://localhost:8000/api/dashboard'); // Ensure the URL matches your server setup

    // Extract the data from the API response
    const { TotalItem, TotalContainers, TotalPlacedItem, TotalWasteItem } = response.data;

    // Render the page with the dashboard data
    res.render('pages/dashboard', {
      totalItems: TotalItem, 
      usedContainers: TotalContainers, 
      wasteItems: TotalWasteItem,
      placedItems: TotalPlacedItem,
    });
  } catch (err) {
    console.error('Error fetching dashboard:', err.message);
    res.status(500).send('Error fetching dashboard');
  }
};

// Placement Page
exports.getPlacementPage = async (req, res) => {
  try {
    // Fetch placement recommendations via the API
    const response = await axios.post('http://localhost:8000/api/items/placement');
    const placements = response.data.placements || [];

    res.render('pages/placement', { placements });
  } catch (err) {
    console.error('Error fetching placement recommendations:', err.message);
    res.status(500).send('Error fetching placement recommendations');
  }
};
// Waste Management Page
exports.getWasteManagementPage = async (req, res) => {
  try {
    // Get waste items from the backend
    const response = await axios.get('http://localhost:8000/api/waste/identify');
    const wasteItems = response.data.wasteItems || [];

    res.render('pages/waste', { wasteItems });
  } catch (err) {
    console.error('Error fetching waste data:', err.message);
    res.status(500).send('Error fetching waste data');
  }
};

// Logs Page
exports.getLogsPage = async (req, res) => {
  try {
    // Extract filters from query parameters
    console.log("PagesCountroller");
    const { itemId, userId, containerId, actionType, startDate, endDate } = req.query;
    console.log(req.query);
    // Construct API query parameters
    const query = {};
    if (itemId) query.itemId = itemId;
    if (userId) query.userId = userId;
    if (containerId) query.containerId = containerId; // Corrected to use containerId
    if (actionType) query.actionType = actionType;

    // Fetch logs from the backend
    const response = await axios.get('http://localhost:8000/api/logs', { params: query });

    // Render the logs page with the fetched logs and any filters
    res.render('pages/logs', {
      logs: response.data.logs || [],
      startDate: startDate || '', // Pass startDate to the view
      endDate: endDate || '', // Pass endDate to the view
      itemId: itemId || '',
      userId: userId || '',
      actionType: actionType || '',
    });
  } catch (err) {
    console.error('Error fetching logs:', err.message);
    res.status(500).send('Error fetching logs');
  }
};

// Import Containers Page (Optional)
exports.importContainersPage = async (req, res) => {
  try {
    const containers = await Container.find();
    res.render('pages/importContainers', { containers });
  } catch (err) {
    console.error('Error fetching containers:', err.message);
    res.status(500).send('Error fetching containers data');
  }
};