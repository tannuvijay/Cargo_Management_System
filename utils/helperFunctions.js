// Example helper function for 3D placement checks
exports.fitsInContainer = (item, container) => {
    return (
      item.width <= container.width &&
      item.depth <= container.depth &&
      item.height <= container.height
    );
  };
  
  // Function to calculate the next best fit for items
  exports.findBestFitContainer = (item, containers) => {
    for (const container of containers) {
      if (this.fitsInContainer(item, container)) {
        return container.containerId;
      }
    }
    return null; // No container found
  };