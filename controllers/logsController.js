
const Item = require('../models/Item');
const Container = require('../models/Container');
const Placement = require('../models/placement');
const Log = require('../models/Log');
const Waste = require('../models/Waste');

// Helper function to log actions
const logAction = async (actionType, details) => {
  const logEntry = new Log({ actionType, ...details });
  await logEntry.save();
};
const getLogsForDateRange = async (startDate, endDate, queryFilters) => {
  try {
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    const combinedLogs = []; // Array to store results for all dates
    console.log("Query Filters Sent to Log.find:", queryFilters);
    // Loop through each date between startDate and endDate
    while (currentDate <= end) {
      // Get the current date's first 10 characters (YYYY-MM-DD)
      const currentDateString = currentDate.toISOString().slice(0, 10);

      console.log("Current Date Slice (YYYY-MM-DD):", currentDateString);
      
      // Fetch logs matching additional filters
      const dailyLogs = await Log.find(queryFilters); // Await the promise to get the logs
     // console.log("daily",dailyLogs);
      // Filter logs for the current date
      const filteredLogs = dailyLogs.filter(log => {
        // Slice the first 10 characters from the database timestamp
        const dbDateString = new Date(log.timestamp).toISOString().slice(0, 10);

        //console.log("Database Date Slice (YYYY-MM-DD):", dbDateString);

        // Compare the query date slice with the database date slice
        return dbDateString === currentDateString;
      });

      //console.log("Filtered Logs for current date:", filteredLogs);

      if (filteredLogs.length > 0) {
        combinedLogs.push(...filteredLogs); // Append logs to the combined array
      }

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1); // Increment the date
    }

    console.log("Combined Logs:", combinedLogs);

    return combinedLogs; // Return all fetched logs
  } catch (error) {
    console.error("Error fetching logs for date range:", error.message);
    throw error; // Rethrow the error for handling
  }
};
exports.getLogs = async (req, res) => {
  try {
    console.log("Fetching logs...");
    const { startDate, endDate, itemId, userId, actionType } = req.query;
    const action = "rearrangement";
    console.log("Query Parameters:", req.query);
    const search = await Log.find({ itemId: itemId, actionType: action});
    let updatedActionType = actionType;
    if(search.length>0){
      updatedActionType = action;
    }
    const query = {};
    if (itemId) query.itemId = itemId;
    if (userId) query.userId = userId;
    if (updatedActionType) query.actionType = updatedActionType;
    console.log("Me bhi to hu",query);
    if (!startDate && !endDate) {
      // Fetch all logs if both startDate and endDate are not provided
      const logs = await Log.find(query);
      console.log("Fetched Logs without date range:", logs);
      return res.status(200).json({ logs });
    }

    if (startDate && endDate) {
      // Fetch logs within the specified date range
      const logs = await getLogsForDateRange(startDate, endDate, query);
      console.log("Fetched Logs with date range:", logs);
      return res.status(200).json({ logs });
    }
  } catch (error) {
    console.error('Error fetching logs:', error.message);
    res.status(500).json({ message: 'Error fetching logs.' });
  }
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





const getplaced = async (itemIds, containerId) => {
  try {
    // Fetch container details
    const container = await Container.findOne({ containerId });
    if (!container) {
      throw new Error(`Container with ID ${containerId} not found.`);
    }
    console.log("Checkpoint-4");

    // Initialize free space in the container
    let freeSpaces = [{
      x: 0, y: 0, z: 0,
      width: container.width,
      height: container.height,
      depth: container.depth,
    }];

    // Array to store results
    const newPlacements = [];
    const remainingItems = [];

    // Calculate the maximum capacity of the container
    const maxCapacity = container.width * container.height * container.depth;
    let currentVolume = 0; // Track the current volume of items placed

    // Fetch items from the database based on item IDs
    const items = await Item.find({ itemId: { $in: itemIds } });
    console.log("Checkpoint-5");
    console.log("Items", items);

    // Check for existing placements in the container and remove them
    for (const itemId of itemIds) {
      const existingPlacement = await Placement.findOne({ itemId, containerId });
      const existingItem = await Item.findOne({ itemId });
      if (existingItem) {
        const existingItemVolume = existingItem.width * existingItem.height * existingItem.depth;

        if (existingPlacement) {
          // Increase the container's capacity
          container.maxCapacity += existingItemVolume;
          currentVolume -= existingItemVolume; // Decrease current volume
          // Remove the existing placement
          await Placement.deleteOne({ itemId, containerId });
          console.log(`Removed existing placement for item ${itemId} from container ${containerId}.`);
        } else {
          // If the placement does not exist, delete the item from placements
            const contain = await Placement.findOne({ itemId });
            if (contain) { // Check if contain is not null
              const contain_of_first = contain.containerId;
              const volumecontain = await Container.findOne({ containerId: contain_of_first }); // Use the correct field name
              if (volumecontain) { // Check if volumecontain is not null
              volumecontain.maxCapacity += existingItemVolume;
              await volumecontain.save(); // Save the updated container back to the database
              }else{
              console.warn(`Container with ID ${contain_of_first} not found.`);
              }
            }else {
            console.warn(`No placement found for item ${itemId}.`);
          }
          await Placement.deleteOne({ itemId });
        }
      } else {
        console.warn(`Item with ID ${itemId} not found in the database.`);
      }
    }

    // Attempt to place items in the container
    for (const item of items) {
      const itemDims = BinPacker.generateRotations(item); // Generate rotations for placement
      const placement = BinPacker.findBestFit(itemDims, freeSpaces);

      if (placement) {
        const itemVolume = item.width * item.height * item.depth; // Calculate the volume of the item

        // Check if placing the item would exceed the container's capacity
        if (currentVolume + itemVolume <= maxCapacity) {
          const newPlacement = new Placement({
            itemId: item.itemId,
            itemName: item.name,
            containerId: containerId,
            position: {
              startCoordinates: placement.position.start,
              endCoordinates: placement.position.end,
            },
          });

          try {
            // Save the new placement in the database
            await newPlacement.save();
            console.log(`Placed item ${item.itemId} in container ${containerId}.`);

            // Log the action for the placement
            const logEntry = {
              actionType: "rearrangement",
              itemId: newPlacement.itemId,
              containerId: containerId,
              details: { position: newPlacement.position },
            };
            await Log.create(logEntry);
            console.log(`Logged rearrangement for item ${item.itemId}.`);

            newPlacements.push(newPlacement); // Add placement data to the results array
            freeSpaces = BinPacker.updateFreeSpaces(freeSpaces, placement); // Update free spaces
            currentVolume += itemVolume; // Update current volume

            // Update the container's maxCapacity in the database
            container.maxCapacity -= itemVolume; // Decrease the maxCapacity
            await container.save(); // Save the updated container back to the database
          } catch (error) {
            console.error(`Error saving placement for item ${item.itemId}:`, error.message);
          }
        } else {
          console.warn(`Not enough capacity in container ${containerId} for item ${item.itemId}.`);
          remainingItems.push(item); // Item could not be placed due to capacity
        }
      } else {
        remainingItems.push(item); // Item could not be placed
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

    return { placements: newPlacements, remaining: remainingItems };
    
  } catch (error) {
    console.error('Error in getplaced function:', error.message);
    throw new Error('Could not complete placement process.');
  }
};


exports.rearrangeItem = async (req, res) => {
  console.log("Successfully here");
  const { userId, containerFrom, containerTo, itemId } = req.query; // Correctly destructuring variables from req.query
  console.log("req.query:", req.query);

  try {

    let a = await Placement.find({ itemId: itemId, containerId: containerFrom });

  // Check if the result is null or an empty array
    if (!a || a.length === 0) {
    console.log("No such element found.");
    // Render a message on the UI
    res.render('your-template', { message: 'No elements found' });
    return; // Exit the function early
    }
    // Fetch all items in containerFrom and create the itemsFromArray
    console.log("Fetching items from container:", containerFrom);
    const itemsInSourceContainer = await Placement.find({ containerId: containerFrom });
    console.log("Items in source container:", itemsInSourceContainer);

    

    // Map itemIds from the source container
    let itemsFromArray = itemsInSourceContainer.map(item => item.itemId);

    // Fetch all items in containerTo and create the itemsToArray
    console.log("Fetching items from container:", containerTo);
    const itemsInTargetContainer = await Placement.find({ containerId: containerTo });
    console.log("Items in target container:", itemsInTargetContainer);

    // Map itemIds from the target container
    let itemsToArray = itemsInTargetContainer.map(item => item.itemId);

    // Remove the input itemId from itemsFromArray
    itemsFromArray = itemsFromArray.filter(id => id !== itemId);

    // Add the input itemId to itemsToArray
    itemsFromArray.reverse();
    console.log("Updated itemsFromArray:", itemsFromArray);
    itemsToArray.push(itemId);
    itemsToArray.reverse();
    console.log("Updated itemsToArray:", itemsToArray);

    // Call the getplaced function for arrangement in the target container
    console.log("Calling getplaced for containerTo...");
    const { placements: placementResult, remaining: remainto } = await getplaced(itemsToArray, containerTo);
    
    console.log("Calling getplaced for containerFrom...");
    const { placements: placedPrevItems, remaining: remaingfrom} = await getplaced(itemsFromArray, containerFrom);
  
   
    const allContainers = await Container.find({});
    for (const container of allContainers) {
      const placementsInContainer = await Placement.find({ containerId: container.containerId });
      const itemIdsInContainer = placementsInContainer.map(item => item.itemId);
      if (remainto.length === 0) {
        console.log("No items remaining after processing.");
        break;
      }

      for (const item of remainto) {
        // Assuming item has width, height, and depth properties
        const itemVolume = item.width * item.height * item.depth;
        
        if (container.maxCapacity >= itemVolume) {
          itemIdsInContainer.push(item.itemId);
          const { placements: pt, remaining: rinto } = await getplaced(itemIdsInContainer, container.containerId);

          // Check if the item exists in the Placement database
          const placementEntry = await Placement.findOne({ itemId: item.itemId });

          // If the containerId is not "Not Placed", remove it from remainto
          if (placementEntry && placementEntry.containerId !== "Not Placed") {
            console.log(`Removing item ${item.itemId} from remainto as it is already placed in container ${placementEntry.containerId}.`);
            const index = remainto.indexOf(item);
            if (index > -1) {
              remainto.splice(index, 1); // Remove the item from remainto
            }
          }
        }
      }
    }
    const placements = await Placement.find(); // Fetch all placements
    let itemsArray = placements.map(item => item.itemId); // Extract item IDs
    
    // Asynchronously update retrieval steps and save to database
    for (const item of itemsArray) {
      const placement = placements.find(placement => placement.itemId === item); // Find the placement for the item
    
      if (placement) {
        // Check if the containerId is "Not Placed"
        if (placement.containerId === "Not Placed") {
          console.log(`Skipping item ${item} as it is marked as "Not Placed".`);
          continue; // Skip further steps for this item
        }
    
        // Calculate the retrieval step
        const retrievalStep = await calculateRetrievalStep(item);
    
        // Update the retrieval_step in the Log database
        await Log.updateOne(
          { itemId: item, actionType: "rearrangement" }, // Match itemId and actionType
          { $set: { retrieval_step: retrievalStep } } // Update the retrieval_step field
        );
    
        // Update the retrieval_step in the Placement database
        await Placement.updateOne(
          { itemId: item }, // Match itemId
          { $set: { retrieval_step: retrievalStep } } // Update the retrieval_step field
        );
    
        console.log(`Updated retrieval_step for item ${item} to ${retrievalStep}.`);
      }
    }
    // Fetch the log entry for the input itemId where actionType === "rearrangement"
    console.log("Fetching log entry for itemId:", itemId);
    const logEntry = await Log.find({
      itemId: itemId,
      actionType: "rearrangement",
    });

    if (!logEntry) {
      return res.status(404).json({ message: "Log entry for the rearrangement not found." });
    }
     
    // Render the success message and log entry on the UI
    res.status(200).json({
     logEntry,
      });
  } catch (error) {
    console.error("Error during rearrangement:", error.message);
    res.status(500).json({ message: "An error occurred during rearrangement." });
  }
};


exports.disposal=async (req,res)=>{

  const wasteItems = await Waste.find(); // Fetch all documents from Waste collection
   // Delete all documents in Placement collection
  let items = wasteItems.map(item => item.itemId);
  if(items.length==0){
    return res.status(404).json({ message: "Us id ka to item hi nahi." });
  }
  console.log(items);
  for (let item of items) {
  // Find the corresponding containerId from Placement database
     const placementRecord = await Placement.findOne({ itemId: item });
     const containerId = placementRecord ? placementRecord.containerId : null;
     const ItemRecord = await Item.findOne({itemId: item});
     const date=ItemRecord ? ItemRecord.expiryDate:null;
     
    const volumecontain = await Container.findOne( {containerId : containerId} );
    const v = ItemRecord.width * ItemRecord.height *ItemRecord.depth;
    if (containerId && volumecontain) { // Check if volumecontain is not null
      volumecontain.maxCapacity += v;
      await volumecontain.save(); // Save the updated container back to the database
    }
     // Create log entry
     await Log.create({
       actionType: "disposal",
       itemId: item,
       containerId: containerId,
       expiryDate:date,
       details: { message: `Item with ID ${item} has been disposed of`, containerId }
      });
  }
  await Placement.deleteMany();
  await Item.deleteMany({ itemId: { $in: items } });
  await Waste.deleteMany({ itemId: { $in: items } });
  const disposedLogs=await Log.find({actionType:"disposal"});
  if (!disposedLogs) {
    return res.status(404).json({ message: "Log entry for the disposal not found." });
  }
  res.status(200).json({      
    disposedLogs,
  });
}