
const mongoose = require('mongoose');

const WasteSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  reason: { type: String, required: true }, // Expired or Out of Uses
  containerId: String,
});

module.exports = mongoose.model('Waste', WasteSchema);