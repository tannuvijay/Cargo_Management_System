const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const Item = require('../models/Item');
const Container = require('../models/Container');
const Log = require('../models/Log'); // Logging actions

// Helper function to log actions
const logAction = async (actionType, details) => {
  const logEntry = new Log({ actionType, ...details });
  await logEntry.save();
};
const parseDate = (dateStr) => {
  if (!dateStr || dateStr === 'N/A') return null;
  return new Date(dateStr);
};
// Handle Item CSV Upload
exports.uploadItemCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const filePath = path.join(__dirname, '../uploads', req.file.filename);
  const items = [];

  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on('data', (row) => {
      const item = {
        itemId: row['Item ID'],
        name: row['Name'],
        width: parseFloat(row['Width (cm)']),
        depth: parseFloat(row['Depth (cm)']),
        height: parseFloat(row['Height (cm)']),
        mass: parseFloat(row['Mass (kg)']),
        priority: parseInt(row['Priority (1-100)']),
        expiryDate: parseDate(row['Expiry Date (ISO Format)']),
        usageLimit: row['Usage Limit'] === 'N/A' ? 0 : parseInt(row['Usage Limit']),
        preferredZone: row['Preferred Zone'],
      };
      items.push(item);
    })
    .on('end', async () => {
      try {
        const bulkOps = items.map(item => ({
          updateOne: {
            filter: { itemId: item.itemId },
            update: { $set: item },
            upsert: true,
          },
        }));

        await Item.bulkWrite(bulkOps);

        // await logAction('uploadItems', { itemCount: items.length });

        res.status(200).json({ message: 'Items uploaded successfully!', items });
      } catch (error) {
        console.error('Error saving items:', error.message);
        res.status(500).json({ message: 'Error saving items.' });
      }
    })
    .on('error', (error) => {
      console.error('Error reading CSV file:', error.message);
      res.status(500).json({ message: 'Error reading CSV file.' });
    });
};

exports.uploadContainerCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const filePath = path.join(__dirname, '../uploads', req.file.filename);
  const containers = [];

  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on('data', (row) => {
      const container = {
        containerId: row['Container ID'],
        zone: row['Zone'],
        width: parseFloat(row['Width(cm)']),
        depth: parseFloat(row['Depth(cm)']),
        height: parseFloat(row['Height(cm)']),
        maxCapacity: parseFloat(row['Width(cm)']) * parseFloat(row['Depth(cm)']) * parseFloat(row['Height(cm)']),
      };
      containers.push(container);
    })
    .on('end', async () => {
      try {
        const bulkOps = containers.map(container => ({
          updateOne: {
            filter: { containerId: container.containerId },
            update: { $set: container },
            upsert: true,
          },
        }));

        await Container.bulkWrite(bulkOps);

        // await logAction('uploadContainers', { containerCount: containers.length });

        res.status(200).json({ message: 'Containers uploaded successfully!', containers });
      } catch (error) {
        console.error('Error saving containers:', error.message);
        res.status(500).json({ message: 'Error saving containers.' });
      }
    })
    .on('error', (error) => {
      console.error('Error reading CSV file:', error.message);
      res.status(500).json({ message: 'Error reading CSV file.' });
    });
};
