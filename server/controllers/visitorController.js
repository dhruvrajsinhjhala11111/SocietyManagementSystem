const Visitor = require('../models/Visitor');
const Notification = require('../models/Notification');
const { generatePassCode, generateQRCode } = require('../utils/qrGenerator');

// @desc    Create visitor pass (Resident pre-approves)
// @route   POST /api/visitors
exports.createVisitorPass = async (req, res) => {
  try {
    const visitorName = req.body.visitorName || req.body.name;
    const visitorPhone = req.body.visitorPhone || req.body.phone;
    const { purpose, purposeNote, vehicleNumber, validHours } = req.body;

    if (!visitorName) {
      return res.status(400).json({ message: 'Visitor name is required' });
    }
    if (!visitorPhone) {
      return res.status(400).json({ message: 'Visitor phone is required' });
    }

    const passCode = generatePassCode();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (validHours || 24));

    let propertyId = req.user.propertyId;
    if (!propertyId) {
      const Property = require('../models/Property');
      const prop = await Property.findOne({ ownerId: req.user._id }) || await Property.findOne();
      if (prop) propertyId = prop._id;
    }

    const visitor = await Visitor.create({
      visitorName,
      visitorPhone,
      purpose: purpose || 'guest',
      purposeNote,
      residentId: req.user._id,
      propertyId,
      passCode,
      status: 'approved',
      isPreApproved: true,
      expiresAt,
      vehicleNumber,
    });

    // Generate QR code
    const qrData = await generateQRCode({
      id: visitor._id,
      passCode,
      flat: propertyId,
      resident: req.user.name,
    });

    visitor.qrCodeData = qrData;
    await visitor.save();

    res.status(201).json(visitor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Guard: Verify visitor pass code
// @route   POST /api/visitors/verify
exports.verifyPassCode = async (req, res) => {
  try {
    const { passCode } = req.body;

    const visitor = await Visitor.findOne({ passCode, status: 'approved' })
      .populate('residentId', 'name phone email')
      .populate('propertyId', 'block flatNumber');

    if (!visitor) {
      return res.status(404).json({ message: 'Invalid or expired pass code', valid: false });
    }

    if (new Date() > visitor.expiresAt) {
      visitor.status = 'expired';
      await visitor.save();
      return res.status(400).json({ message: 'Pass code has expired', valid: false });
    }

    res.json({ valid: true, visitor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Guard: Check-in visitor
// @route   PUT /api/visitors/:id/checkin
exports.checkInVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id)
      .populate('residentId', 'name phone');

    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    visitor.status = 'checked-in';
    visitor.entryTime = new Date();
    visitor.guardId = req.user._id;
    await visitor.save();

    // Create notification for resident
    await Notification.create({
      userId: visitor.residentId._id,
      title: 'Visitor Checked In',
      message: `${visitor.visitorName} has been checked in at the gate.`,
      type: 'visitor',
      referenceId: visitor._id,
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${visitor.residentId._id}`).emit('visitor_checkin', {
        visitor,
        message: `${visitor.visitorName} has arrived at the gate`,
      });
    }

    res.json(visitor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Guard: Check-out visitor
// @route   PUT /api/visitors/:id/checkout
exports.checkOutVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    visitor.status = 'checked-out';
    visitor.exitTime = new Date();
    await visitor.save();

    res.json(visitor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Guard: Request approval for unannounced visitor
// @route   POST /api/visitors/request-approval
exports.requestApproval = async (req, res) => {
  try {
    const visitorName = req.body.visitorName || req.body.name;
    const visitorPhone = req.body.visitorPhone || req.body.phone;
    const { purpose, propertyId, vehicleNumber } = req.body;
    let residentId = req.body.residentId;

    if (!residentId && propertyId) {
      const Property = require('../models/Property');
      const prop = await Property.findById(propertyId);
      if (prop && prop.ownerId) {
        residentId = prop.ownerId;
      }
    }

    if (!residentId) {
      const User = require('../models/User');
      const resUser = await User.findOne({ role: 'resident' }) || await User.findOne({ role: 'admin' });
      if (resUser) residentId = resUser._id;
    }

    const passCode = generatePassCode();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    const visitor = await Visitor.create({
      visitorName,
      visitorPhone,
      purpose: purpose || 'guest',
      residentId,
      propertyId,
      passCode,
      status: 'pending',
      isPreApproved: false,
      expiresAt,
      guardId: req.user._id,
      vehicleNumber,
    });

    // Send notification to resident
    await Notification.create({
      userId: residentId,
      title: 'Visitor at Gate',
      message: `${visitorName} is at the gate and waiting for your approval.`,
      type: 'visitor',
      referenceId: visitor._id,
    });

    // Real-time notification via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${residentId}`).emit('visitor_approval_request', {
        visitor: await Visitor.findById(visitor._id)
          .populate('propertyId', 'block flatNumber'),
        visitorId: visitor._id,
        message: `${visitorName} is at the gate`,
      });
    }

    res.status(201).json(visitor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resident: Approve or deny visitor
// @route   PUT /api/visitors/:id/respond
exports.respondToVisitor = async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'deny'
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    visitor.status = action === 'approve' ? 'approved' : 'denied';
    await visitor.save();

    // Notify guard via WebSocket
    const io = req.app.get('io');
    if (io) {
      const payload = {
        visitor,
        visitorId: visitor._id,
        action,
        message: action === 'approve'
          ? `✅ Entry approved for ${visitor.visitorName}`
          : `❌ Entry denied for ${visitor.visitorName}`,
      };
      if (visitor.guardId) {
        io.to(`user_${visitor.guardId}`).emit('visitor_response', payload);
      }
      io.to('guards').emit('visitor_response', payload);
    }

    res.json(visitor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get visitor log (various filters)
// @route   GET /api/visitors
exports.getVisitors = async (req, res) => {
  try {
    const { status, date, residentId } = req.query;
    let filter = {};

    if (req.user.role === 'resident') {
      filter.residentId = req.user._id;
    }
    if (status) filter.status = status;
    if (residentId) filter.residentId = residentId;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }

    const visitors = await Visitor.find(filter)
      .populate('residentId', 'name phone')
      .populate('propertyId', 'block flatNumber')
      .populate('guardId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(visitors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get active (checked-in) visitors
// @route   GET /api/visitors/active
exports.getActiveVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find({ status: 'checked-in' })
      .populate('residentId', 'name phone')
      .populate('propertyId', 'block flatNumber')
      .sort({ entryTime: -1 });

    res.json(visitors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
