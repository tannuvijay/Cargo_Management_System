
// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const path = require('path');

// // Initialize file upload settings
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/'); // Make sure this folder exists
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname)); // Naming file uniquely
//   }
// });

// const upload = multer({ storage: storage });

// // Import the controller methods
// const csvController = require('../controllers/csvController');

// // Define the routes and make sure handlers are correct
// router.post('/upload/items', upload.single('file'), csvController.uploadItemCSV); // Ensure correct path and function
// router.post('/upload/containers', upload.single('file'), csvController.uploadContainerCSV); // Ensure correct path and function

// module.exports = router;






const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const csvController = require('../controllers/csvController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.post('/upload/items', upload.single('file'), csvController.uploadItemCSV);
router.post('/upload/containers', upload.single('file'), csvController.uploadContainerCSV);

module.exports = router;

