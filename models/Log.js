const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  actionType: { type: String, required: true }, // e.g., placement, retrieval, disposal
  itemId: String,
  userId: String,
  containerId:String,
  timestamp: { type: Date, default: Date.now },
  details: Object,
  retrieval_step: Number,
});

module.exports = mongoose.model('Log', LogSchema);





