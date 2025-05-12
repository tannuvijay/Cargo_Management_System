const mongoose = require('mongoose');

const ContainerSchema = new mongoose.Schema({
  containerId: { type: String, required: true, unique: true },
  zone: { type: String, required: true },
  width: Number,
  depth: Number,
  height: Number,
  maxCapacity: Number,
});

module.exports = mongoose.model('Container', ContainerSchema);
