const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  width: Number,
  depth: Number,
  height: Number,
  mass: Number,
  priority: { type: Number, required: true },
  expiryDate: Date,
  usageLimit: Number,
  preferredZone: String,
  isWaste: { type: Boolean, default: false },
});

module.exports = mongoose.model('Item', ItemSchema);