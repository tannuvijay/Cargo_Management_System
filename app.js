

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const connectDB = require('./config/db'); // Database connection logic
const dotenv = require('dotenv');

// Import Backend Routes
const apiItemRoutes = require('./routes/itemsRoutes'); // Items functionality
const apiContainerRoutes = require('./routes/containersRoutes'); // Containers functionality
const apiLogsRoutes = require('./routes/logsRoutes'); // Logs functionality
const apiWasteRoutes = require('./routes/wasteRoutes'); // Waste management functionality
const simulateRoutes = require('./routes/simulateRoutes'); // Simulate day functionality
const csvRoutes = require('./routes/csvRoutes'); // CSV upload functionality
const dashboardRoutes = require('./routes/dashboardRoutes');
// Import Frontend Routes
const pageRoutes = require('./routes/pages'); // Page rendering routes

// Initialize App
const app = express();
dotenv.config(); // Load environment variables
connectDB(); // Connect to the database

// Middleware
app.use(bodyParser.json()); // JSON body parsing
app.use(bodyParser.urlencoded({ extended: false })); // URL-encoded body parsing
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
app.set('views', path.join(__dirname, 'views')); // Views directory
app.set('view engine', 'ejs'); // View engine set to EJS

// Backend API Routes
app.use('/api/items', apiItemRoutes); // Items API (placement, all items, recommendations)
app.use('/api/containers', apiContainerRoutes); // Containers API
app.use('/api/logs', apiLogsRoutes); // Logs API
app.use('/api/waste', apiWasteRoutes); // Waste API
app.use('/api/simulate', simulateRoutes); // Simulate API
app.use('/api/csv', csvRoutes); // CSV API
app.use('/api/dashboard', dashboardRoutes);

// Frontend Page Routes
app.use('/', pageRoutes); // Serve frontend pages

// Server Startup
const PORT = process.env.PORT || 3000; // Define the port
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
