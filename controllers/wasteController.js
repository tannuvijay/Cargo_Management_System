// const Item = require('../models/Item');
// const Waste = require('../models/Waste');

// exports.identifyWaste = async (req, res) => {
//   try {
//     const expiredItems = await Item.find({ expiryDate: { $lt: new Date() }, isWaste: false });
//     const depletedItems = await Item.find({ remainingUses: { $lte: 0 }, isWaste: false });

//     const wasteItems = [...expiredItems, ...depletedItems].map((item) => ({
//       itemId: item.itemId,
//       name: item.name,
//       reason: item.remainingUses <= 0 ? 'Out of Uses' : 'Expired',
//       containerId: item.containerId,
//     }));

//     for (const item of wasteItems) {
//       item.isWaste = true; // Update item as waste
//       await Item.updateOne({ itemId: item.itemId }, { isWaste: true });
//       await Waste.create(item); // Add to Waste collection
//     }

//     res.status(200).json({
//       success: true,
//       wasteItems,
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: 'Error identifying waste',
//     });
//   }
// };

// exports.getReturnPlan = async (req, res) => {
//   try {
//     // Simulate fetching waste data and generating a return plan
//     const returnPlan = {
//       steps: [
//         "Move expired items to the undocking module",
//         "Verify the items with the waste list",
//         "Prepare for undocking",
//       ],
//     };
//     res.status(200).json(returnPlan); // Respond with the return plan
//   } catch (error) {
//     console.error("Error generating return plan:", error.message);
//     res.status(500).json({ message: "Error generating return plan" });
//   }
// };




const Item = require('../models/Item');
const Waste = require('../models/Waste');
const moment = require('moment');

const resetWasteField = async () => {
  try {
    await Item.updateMany({}, { $set: { isWaste: false } });
    console.log("Successfully reset isWaste field for all items.");
  } catch (error) {
    console.error("Error resetting isWaste field:", error);
  }
};

// Call this function when needed, for example, during initialization
resetWasteField();

exports.identifyWaste = async (req, res) => {
  try {
    console.log("Identifying waste items...");

    // Get the current date
    const currentDate = new Date();
    console.log("Current Date:", currentDate);

    // Find expired items (ensure isWaste is false)
    const expiredItems = await Item.find({ expiryDate: { $lt: currentDate }, isWaste: false });
    console.log("Expired items:", expiredItems); // Log the expired items

    // Combine expired items into wasteItems
    const wasteItems = expiredItems.map((item) => ({
      itemId: item.itemId,
      name: item.name,
      reason: 'Expired', // All items here are expired
      containerId: item.containerId,
    }));
    console.log("Waste items:", wasteItems); // Log the waste items

    // Process each waste item
    for (const item of wasteItems) {
      console.log("Processing waste item:", item);

      // Check if the item already exists in the Waste collection
      const existingWasteItem = await Waste.findOne({ itemId: item.itemId });
      if (existingWasteItem) {
        console.log(`Item with itemId ${item.itemId} already exists in Waste collection. Skipping...`);
        continue; // Skip this item if it already exists
      }

      // Update the item as waste
      await Item.updateOne({ itemId: item.itemId }, { isWaste: true });
      await Waste.create(item); // Add to Waste collection
      console.log("Added to Waste collection:", item); // Log this
    }

    res.status(200).json({
      success: true,
      wasteItems,
    });
  } catch (err) {
    console.error("Error identifying waste:", err);
    res.status(500).json({
      success: false,
      message: 'Error identifying waste',
    });
  }
};

exports.getReturnPlan = async (req, res) => {
  try {
    // Simulate fetching waste data and generating a return plan
    const returnPlan = {
      steps: [
        "Move expired items to the undocking module",
        "Verify the items with the waste list",
        "Prepare for undocking",
      ],
    };
    res.status(200).json(returnPlan); // Respond with the return plan
  } catch (error) {
    console.error("Error generating return plan:", error.message);
    res.status(500).json({ message: "Error generating return plan" });
  }
};

exports.getWasteItems = async (req, res) => {
  try {
    const wasteItems = await Waste.find(); // Fetch all waste items
    console.log("these are waste items",wasteItems);
    res.status(200).json({
      success: true,
      wasteItems,
    });
  } catch (err) {
    console.error("Error fetching waste items:", err);
    res.status(500).json({
      success: false,
      message: 'Error fetching waste items',
    });
  }
};


