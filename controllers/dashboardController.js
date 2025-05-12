const Container = require('../models/Container');
const Item = require('../models/Item');
const Placement = require('../models/placement');
const Waste=require('../models/Waste');
exports.getDashboard = async (req, res) => {
    const Items=await Item.find();
    const TotalItem=Items.length;
    const Containers=await Container.find();
    const TotalContainers=Containers.length;
    const Placements=await Placement.find();
    const TotalPlacedItem=Placements.length;
    const Wastes=await Waste.find();
    const TotalWasteItem=Wastes.length;
    res.status(200).json({      
        TotalItem,
        TotalContainers,
        TotalPlacedItem,
        TotalWasteItem,
      });
}