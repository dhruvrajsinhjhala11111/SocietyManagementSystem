const Property = require('../models/Property');
const User = require('../models/User');

// @desc    Create a new property (Admin)
// @route   POST /api/properties
exports.createProperty = async (req, res) => {
  try {
    const { block, flatNumber, type, sqFt, billingType, fixedRate, ratePerSqFt } = req.body;

    const exists = await Property.findOne({ block, flatNumber });
    if (exists) {
      return res.status(400).json({ message: 'Property already exists' });
    }

    const property = await Property.create({
      block, flatNumber, type, sqFt,
      billingType: billingType || 'fixed',
      fixedRate: fixedRate || 3000,
      ratePerSqFt: ratePerSqFt || 5,
    });

    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk create properties (Admin)
// @route   POST /api/properties/bulk
exports.bulkCreateProperties = async (req, res) => {
  try {
    const { block, startFlat, endFlat, type, sqFt, billingType, fixedRate } = req.body;
    const properties = [];

    for (let i = startFlat; i <= endFlat; i++) {
      const flatNumber = i.toString();
      const exists = await Property.findOne({ block, flatNumber });
      if (!exists) {
        properties.push({
          block, flatNumber, type, sqFt,
          billingType: billingType || 'fixed',
          fixedRate: fixedRate || 3000,
        });
      }
    }

    const created = await Property.insertMany(properties);
    res.status(201).json({ message: `Created ${created.length} properties`, properties: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all properties
// @route   GET /api/properties
exports.getProperties = async (req, res) => {
  try {
    const { block, status } = req.query;
    let filter = {};
    if (block) filter.block = block.toUpperCase();
    if (status) filter.status = status;

    const properties = await Property.find(filter)
      .populate('ownerId', 'name email phone')
      .populate('tenants', 'name email phone')
      .sort({ block: 1, flatNumber: 1 });

    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
exports.getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('ownerId', 'name email phone familyMembers')
      .populate('tenants', 'name email phone');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
exports.updateProperty = async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Unlink users from this property
    await User.updateMany({ propertyId: property._id }, { propertyId: null });
    await Property.findByIdAndDelete(req.params.id);

    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get vacant properties (for resident flat selection)
// @route   GET /api/properties/vacant
exports.getVacantProperties = async (req, res) => {
  try {
    const properties = await Property.find({ status: 'vacant' })
      .sort({ block: 1, flatNumber: 1 });
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get property stats
// @route   GET /api/properties/stats
exports.getPropertyStats = async (req, res) => {
  try {
    const total = await Property.countDocuments();
    const occupied = await Property.countDocuments({ status: 'occupied' });
    const vacant = await Property.countDocuments({ status: 'vacant' });
    const blocks = await Property.distinct('block');

    res.json({ total, occupied, vacant, blocks: blocks.length, blockNames: blocks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
