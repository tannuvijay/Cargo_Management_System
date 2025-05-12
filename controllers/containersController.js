const Container = require('../models/Container');
const Log = require('../models/Log'); // Logging actions

// Import Containers
exports.importContainers = async (req, res) => {
  try {
    const containers = req.body.containers;

    const bulkInsert = containers.map(container => ({
      containerId: container.containerId,
      zone: container.zone,
      width: container.width,
      depth: container.depth,
      height: container.height,
    }));

    const result = await Container.insertMany(bulkInsert);

    // Log the import action
    await Log.create({ actionType: 'importContainers', details: { count: result.length } });

    res.status(200).json({
      success: true,
      containersImported: result.length,
    });
  } catch (err) {
    console.error("Error importing containers:", err.message);
    res.status(500).json({
      success: false,
      message: "Error importing containers.",
    });
  }
};