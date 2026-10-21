const Notice = require('../models/Notice');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Create a notice (Admin)
// @route   POST /api/notices
exports.createNotice = async (req, res) => {
  try {
    const { title, content, category, isPinned, expiresAt } = req.body;
    const attachments = req.files ? req.files.map(f => `/uploads/notices/${f.filename}`) : [];

    const notice = await Notice.create({
      title,
      content,
      category: category || 'general',
      isPinned: isPinned || false,
      attachments,
      authorId: req.user._id,
      expiresAt: expiresAt || null,
    });

    // Broadcast notification to all residents
    const residents = await User.find({ role: 'resident', isVerified: true });
    const notifications = residents.map(r => ({
      userId: r._id,
      title: 'New Notice',
      message: `${title}`,
      type: 'notice',
      referenceId: notice._id,
    }));
    await Notification.insertMany(notifications);

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to('residents').emit('new_notice', {
        notice,
        message: `New notice: ${title}`,
      });
    }

    res.status(201).json(notice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all notices
// @route   GET /api/notices
exports.getNotices = async (req, res) => {
  try {
    const { category, pinned } = req.query;
    let filter = {};
    if (category) filter.category = category;
    if (pinned === 'true') filter.isPinned = true;

    // Filter out expired notices
    filter.$or = [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ];

    const notices = await Notice.find(filter)
      .populate('authorId', 'name role')
      .sort({ isPinned: -1, createdAt: -1 });

    res.json(notices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single notice
// @route   GET /api/notices/:id
exports.getNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id)
      .populate('authorId', 'name role');

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Mark as read
    const alreadyRead = notice.readBy.some(
      r => r.userId.toString() === req.user._id.toString()
    );
    if (!alreadyRead) {
      notice.readBy.push({ userId: req.user._id });
      await notice.save();
    }

    res.json(notice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update notice (Admin)
// @route   PUT /api/notices/:id
exports.updateNotice = async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }
    res.json(notice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete notice (Admin)
// @route   DELETE /api/notices/:id
exports.deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }
    res.json({ message: 'Notice deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
