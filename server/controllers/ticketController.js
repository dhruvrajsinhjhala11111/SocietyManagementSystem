const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');

// @desc    Create a complaint ticket (Resident)
// @route   POST /api/tickets
exports.createTicket = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;
    const photos = req.files ? req.files.map(f => `/uploads/tickets/${f.filename}`) : [];

    const ticket = await Ticket.create({
      title,
      description,
      category,
      priority: priority || 'medium',
      photos,
      residentId: req.user._id,
      propertyId: req.user.propertyId,
      statusHistory: [{
        status: 'open',
        changedBy: req.user._id,
        note: 'Ticket created',
      }],
    });

    // Notify all admins
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Complaint',
        message: `${req.user.name} raised a ${category} complaint: "${title}"`,
        type: 'ticket',
        referenceId: ticket._id,
      });
    }

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get tickets (filtered by role)
// @route   GET /api/tickets
exports.getTickets = async (req, res) => {
  try {
    const { status, category, priority } = req.query;
    let filter = {};

    if (req.user.role === 'resident') {
      filter.residentId = req.user._id;
    } else if (req.user.role === 'technician') {
      filter.assignedTo = req.user._id;
    }

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const tickets = await Ticket.find(filter)
      .populate('residentId', 'name phone')
      .populate('propertyId', 'block flatNumber')
      .populate('assignedTo', 'name phone')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single ticket
// @route   GET /api/tickets/:id
exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('residentId', 'name phone email')
      .populate('propertyId', 'block flatNumber')
      .populate('assignedTo', 'name phone')
      .populate('statusHistory.changedBy', 'name role');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign ticket to technician (Admin)
// @route   PUT /api/tickets/:id/assign
exports.assignTicket = async (req, res) => {
  try {
    const { technicianId } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.assignedTo = technicianId;
    ticket.status = 'assigned';
    ticket.statusHistory.push({
      status: 'assigned',
      changedBy: req.user._id,
      note: 'Assigned to technician',
    });
    await ticket.save();

    // Notify technician
    await Notification.create({
      userId: technicianId,
      title: 'New Task Assigned',
      message: `You have been assigned a ${ticket.category} task: "${ticket.title}"`,
      type: 'ticket',
      referenceId: ticket._id,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${technicianId}`).emit('ticket_assigned', { ticket });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update ticket status (Technician/Admin)
// @route   PUT /api/tickets/:id/status
exports.updateTicketStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Handle completion photos
    if (status === 'resolved' && req.files) {
      ticket.completionPhotos = req.files.map(f => `/uploads/tickets/${f.filename}`);
      ticket.resolvedAt = new Date();
    }

    ticket.status = status;
    ticket.statusHistory.push({
      status,
      changedBy: req.user._id,
      note: note || `Status changed to ${status}`,
    });
    await ticket.save();

    // Notify resident
    await Notification.create({
      userId: ticket.residentId,
      title: 'Ticket Update',
      message: `Your complaint "${ticket.title}" is now ${status}.`,
      type: 'ticket',
      referenceId: ticket._id,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${ticket.residentId}`).emit('ticket_update', { ticket, status });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Rate a resolved ticket (Resident)
// @route   PUT /api/tickets/:id/rate
exports.rateTicket = async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket || ticket.status !== 'resolved') {
      return res.status(400).json({ message: 'Can only rate resolved tickets' });
    }

    ticket.rating = rating;
    ticket.feedback = feedback || '';
    ticket.status = 'closed';
    ticket.statusHistory.push({
      status: 'closed',
      changedBy: req.user._id,
      note: `Rated ${rating}/5. ${feedback || ''}`,
    });
    await ticket.save();

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get ticket stats (Admin)
// @route   GET /api/tickets/stats
exports.getTicketStats = async (req, res) => {
  try {
    const total = await Ticket.countDocuments();
    const open = await Ticket.countDocuments({ status: 'open' });
    const assigned = await Ticket.countDocuments({ status: 'assigned' });
    const inProgress = await Ticket.countDocuments({ status: 'in-progress' });
    const resolved = await Ticket.countDocuments({ status: 'resolved' });
    const closed = await Ticket.countDocuments({ status: 'closed' });

    const byCategory = await Ticket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const avgRating = await Ticket.aggregate([
      { $match: { rating: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);

    res.json({
      total, open, assigned, inProgress, resolved, closed,
      byCategory,
      avgRating: avgRating[0]?.avg || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
