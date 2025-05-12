
const Item = require('../models/Item'); // Assuming the Item model is in the models folder

exports.simulateDay = async (req, res) => {
  try {
    // Fetch all items
    const items = await Item.find();

    const expiredItems = [];
    const updatedItems = [];

    const today = new Date();

    for (const item of items) {
      // Check if the item is expired
      if (item.expiryDate && item.expiryDate < today) {
        item.isExpired = true;
        expiredItems.push({
          itemId: item.itemId,
          name: item.name,
          reason: 'Expired',
        });
      }

      // Decrement remaining uses
      if (item.remainingUses > 0) {
        item.remainingUses -= 1;
        updatedItems.push({
          itemId: item.itemId,
          name: item.name,
          remainingUses: item.remainingUses,
        });
      }

      // Save the updated item
      await item.save();
    }

    // Respond with the simulation results
    res.status(200).json({
      message: 'Day simulated successfully!',
      simulationResult: {
        expiredItems,
        updatedItems,
      },
    });
  } catch (error) {
    console.error('Error simulating day:', error.message);
    res.status(500).json({ message: 'Error simulating day' });
  }
};
