
const Item = require('../models/Item');
const Container = require('../models/Container');
const Placement = require('../models/placement');
const Log = require('../models/Log'); // Import Log model for action logging
const logAction = async (actionType, details) => {
  const logEntry = new Log({ actionType, ...details });
  await logEntry.save();
};
class BinPacker {
  static generateRotations(item) {
    return [
      { width: item.width, depth: item.depth, height: item.height },
      { width: item.width, depth: item.height, height: item.depth },
      { width: item.depth, depth: item.width, height: item.height },
      { width: item.depth, depth: item.height, height: item.width },
      { width: item.height, depth: item.width, height: item.depth },
      { width: item.height, depth: item.depth, height: item.width },
    ];
  }

  static findBestFit(itemDims, freeSpaces, itemPriority) {
    let bestFit = null;

    for (const space of freeSpaces) {
      for (const rotation of itemDims) {
        // Check if the item fits in the current free space
        if (
          rotation.width <= space.width &&
          rotation.depth <= space.depth &&
          rotation.height <= space.height
        ) {
          // Check if this placement is better than the current best fit
          const fitVolume = rotation.width * rotation.depth * rotation.height;
          const spaceVolume = space.width * space.depth * space.height;
          if (
            !bestFit ||
            fitVolume > bestFit.fitVolume || // Prioritize larger fits
            (itemPriority > bestFit.itemPriority) // Prioritize higher-priority items
          ) {
            bestFit = {
              position: {
                start: { width: space.x, depth: space.y, height: space.z },
                end: {
                  width: space.x + rotation.width,
                  depth: space.y + rotation.depth,
                  height: space.z + rotation.height,
                },
              },
              rotation,
              fitVolume,
              itemPriority,
            };
          }
        }
      }
    }

    return bestFit;
  }

  static updateFreeSpaces(freeSpaces, placement) {
    const updatedSpaces = [];

    for (const space of freeSpaces) {
      // Split the remaining spaces around the placement
      if (placement.position.end.width < space.width) {
        updatedSpaces.push({
          x: placement.position.end.width,
          y: space.y,
          z: space.z,
          width: space.width - placement.position.end.width,
          depth: space.depth,
          height: space.height,
        });
      }
      if (placement.position.end.depth < space.depth) {
        updatedSpaces.push({
          x: space.x,
          y: placement.position.end.depth,
          z: space.z,
          width: space.width,
          depth: space.depth - placement.position.end.depth,
          height: space.height,
        });
      }
      if (placement.position.end.height < space.height) {
        updatedSpaces.push({
          x: space.x,
          y: space.y,
          z: placement.position.end.height,
          width: space.width,
          depth: space.depth,
          height: space.height - placement.position.end.height,
        });
      }
    }

    return updatedSpaces;
  }
}


const calculateRetrievalStep = async (itemId) => {
  try {
    // Fetch placement data for the target item
    const targetPlacement = await Placement.findOne({ itemId });
    if (!targetPlacement) {
      throw new Error(`Item ${itemId} is not placed.`);
    }

    // Fetch the container data for the item's placement
    const container = await Container.findOne({ containerId: targetPlacement.containerId });
    if (!container) {
      throw new Error(`Container ${targetPlacement.containerId} not found.`);
    }

    // Fetch all items placed in the same container
    const allPlacements = await Placement.find({ containerId: container.containerId });

    // Initialize retrieval step
    let retrievalStep = 1;

    // Analyze items in the container to find blocking items
    for (const placement of allPlacements) {
      if (placement.itemId !== itemId) {
        const blocking = checkOverlap(
          targetPlacement.position,
          placement.position
        );

        if (blocking) {
          console.log(`Item ${placement.itemId} is blocking the retrieval of item ${itemId}.`);
          retrievalStep++;
        }
      }
    }

    
    return retrievalStep;
  } catch (error) {
    
    throw error;
  }
};

// Function to check overlap between two placements
const checkOverlap = (targetPos, otherPos) => {
  return !(
    targetPos.endCoordinates.width <= otherPos.startCoordinates.width ||
    targetPos.startCoordinates.width >= otherPos.endCoordinates.width ||
    targetPos.endCoordinates.depth <= otherPos.startCoordinates.depth ||
    targetPos.startCoordinates.depth >= otherPos.endCoordinates.depth ||
    targetPos.endCoordinates.height <= otherPos.startCoordinates.height ||
    targetPos.startCoordinates.height >= otherPos.endCoordinates.height
  );
};


const getplaced = async () => {
  try {
    // Check if the Log collection is empty
    const existingLogs = await Log.find();
    if (existingLogs.length > 0) {
      await Log.deleteMany({ actionType: 'retrieval' });
    }

    // Check if the Placement collection is empty
    const existingPlacements = await Placement.find();
    if (existingPlacements.length > 0) {
      // Loop through existing placements to update container capacity
      for (const placement of existingPlacements) {
        const item = await Item.findOne({ itemId: placement.itemId });
        if (item) {
          const itemVolume = item.width * item.height * item.depth;
          const container = await Container.findOne({ containerId: placement.containerId });
          if (container) {
            // Increase the container's capacity
            container.maxCapacity += itemVolume;
            await container.save(); // Save the updated container back to the database
            console.log(`Increased capacity of container ${placement.containerId} by ${itemVolume}.`);
          }
        }
      }
      // Remove all existing placements
      await Placement.deleteMany({});
      console.log('Existing placements cleared.');
    }

    const items = await Item.find();  // Fetch items from the database
    const containers = await Container.find();  // Fetch containers from the database

    const placements = []; // Array to store placement results
    const remainingItems = []; // Array to store items that could not be placed

    // Create a set of placed item IDs for quick lookup
    const placedItemIds = new Set();

    for (const container of containers) {
      let freeSpaces = [{
        x: 0, y: 0, z: 0,
        width: container.width,
        height: container.height,
        depth: container.depth
      }];

      for (const item of items) {
        // Check if the item is already placed
        if (placedItemIds.has(item.itemId)) {
          console.log(`Item ${item.itemId} is already placed. Skipping...`);
          continue; // Skip this item if it is already placed
        }

        const itemDims = BinPacker.generateRotations(item);
        const placement = BinPacker.findBestFit(itemDims, freeSpaces);

        if (placement) {
          const itemVolume = item.width * item.depth * item.height; // Calculate the volume of the item

          // Check if placing the item would exceed the container's capacity
          if (container.maxCapacity >= itemVolume) {
            // Check for existing placement and delete it if it exists
            const existingPlacement = await Placement.findOne({ itemId: item.itemId, containerId: container.containerId });
            if (existingPlacement) {
              await Placement.deleteOne({ itemId: item.itemId, containerId: container.containerId });
              console.log(`Deleted existing placement for item ${item.itemId} in container ${container.containerId}.`);
            }

            const newPlacement = new Placement({
              itemId: item.itemId,
              itemName: item.name,
              containerId: container.containerId,
              position: {
                startCoordinates: placement.position.start,
                endCoordinates: placement.position.end
              },
              priority: item.priority,
            });

            try {
              await newPlacement.save(); // Save the placement data to the database
              await logAction('retrieval', { itemId: item.itemId, containerId: container.containerId });

              placements.push(newPlacement); // Add placement data to the results array
              placedItemIds.add(item.itemId); // Track this item as placed
              freeSpaces = BinPacker.updateFreeSpaces(freeSpaces, placement); // Update free spaces

              // Update the container's maxCapacity
              container.maxCapacity -= itemVolume; // Reduce the maxCapacity by the item's volume
              await container.save(); // Save the updated container back to the database
            } catch (error) {
              console.error(`Error saving placement for item ${item.itemId}:`, error.message);
            }
          } else {
            console.warn(`Not enough capacity in container ${container.containerId} for item ${item.itemId}.`);
            remainingItems.push(item); // Item could not be placed due to capacity
          }
        } else {
          remainingItems.push(item); // Item could not be placed
        }
      }
    }

    // Handle remaining items that could not be placed
    for (const item of remainingItems) {
      const notPlaced = new Placement({
        itemId: item.itemId,
        itemName: item.name,
        containerId: 'Not Placed',
        position: null,
      });

      try {
        await notPlaced.save(); // Save the "not placed" entry to the database
      } catch (error) {
        console.error(`Error saving not placed entry for item ${item.itemId}:`, error.message);
      }
    }

    // Log unplaced items
    if (remainingItems.length > 0) {
      console.warn(`The following items could not be placed:`, remainingItems.map(item => item.itemId));
    }

    return placements; // Return the placements array
  } catch (error) {
    console.error('Error in getplaced function:', error.message);
    throw new Error('Could not complete placement process.');
  }
};

exports.getPlacementRecommendations = async (req, res) => {
  try {
    const check = await Placement.find({});
    const itemcheck =  await Item.find({});
    
    if(check.length===itemcheck.length)
    {
      res.status(200).json({ placements: check });
      return;
    }
    const placementsOnUi = await getplaced();
    const placements = await Placement.find(); // Fetch all placements
    let itemsFromArray = placements.map(item => item.itemId); // Extract item IDs

// Asynchronously update retrieval steps and save to database
   for (const item of itemsFromArray) {
      const placement = placements.find(placement => placement.itemId === item); // Find the placement for the item

   if (placement) {
    // Calculate the retrieval step
    const retrievalStep = await calculateRetrievalStep(item);

    await Log.updateOne(
      { itemId: item }, // Find placement by itemId
      { $set: { retrieval_step: retrievalStep } } // Update the retrieval_step field
    );

    // Update the retrieval_step in the database
    await Placement.updateOne(
      { itemId: item }, // Find placement by itemId
      { $set: { retrieval_step: retrievalStep } } // Update the retrieval_step field
    );

    console.log(`Updated retrieval_step for item ${item}: ${retrievalStep}`);
  }
}



    res.status(200).json({ placementsOnUi });
  } catch (error) {
    console.error('Error generating placement recommendations:', error.message);
    res.status(500).json({ message: 'Error generating placement recommendations.' });
  }
};
exports.retrieveItem = async (req, res) => {
  try {
    const { itemId } = req.params;  // Extract from URL params (not body)
    
    // Check if placement exists for the item
    const placement = await Placement.findOne({ itemId });

    // If no placement is found or it's marked as 'Not Placed'
    if (!placement || placement.containerId === 'Not Placed') {
      return res.status(404).json({ message: 'Item not found or not placed.' });
    }

    // Delete the placement record (if needed)
    await Placement.deleteOne({ itemId });

    // Log the retrieval action (ensure logAction function is working)
    await logAction('retrieval', { itemId, containerId: placement.containerId });

    // Return the response with placement details
    res.status(200).json({ message: 'Item retrieved successfully!', placement });
  } catch (error) {
    console.error('Error retrieving item:', error.message);
    res.status(500).json({ message: 'Error retrieving item.' });
  }
};
// Rearrange item from one container to another
exports.rearrangeItem = async (req, res) => {
  const { itemId, newContainerId } = req.body;
  try {
    const placement = await Placement.findOne({ itemId });
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }
    placement.containerId = newContainerId; // Update container
    await placement.save();

    // Log action
    await logAction('rearrangement', { itemId, fromContainer: placement.containerId, toContainer: newContainerId });

    res.status(200).json({ success: true, message: 'Item rearranged successfully.' });
  } catch (error) {
    console.error('Error rearranging item:', error.message);
    res.status(500).json({ success: false, message: 'Error rearranging item.' });
  }
}
// Dispose of item
exports.disposeItem = async (req, res) => {
  const { itemId } = req.params;
  try {
    const placement = await Placement.findOneAndDelete({ itemId });
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    // Log action
    await logAction('disposal', { itemId });

    res.status(200).json({ success: true, message: 'Item disposed of successfully.' });
  } catch (error) {
    console.error('Error disposing item:', error.message);
    res.status(500).json({ success: false, message: 'Error disposing item.' });
  }
};











