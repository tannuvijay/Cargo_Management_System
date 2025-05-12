const mongoose = require('mongoose');

const placementSchema = new mongoose.Schema({
  itemId: { 
    type: String, 
    required: true, 
    unique: true  // This ensures that an item can only be placed once
  },
  itemName: { type: String, required: true },
  containerId: { type: String, required: true },
  position: {
    startCoordinates: { 
      width: Number, 
      depth: Number, 
      height: Number 
    },
    endCoordinates: { 
      width: Number, 
      depth: Number, 
      height: Number 
    }
  },
  priority: Number,
  retrieval_step: Number,
});

module.exports = mongoose.model('Placement', placementSchema);
