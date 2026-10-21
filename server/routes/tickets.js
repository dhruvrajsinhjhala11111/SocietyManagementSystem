const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createTicket, getTickets, getTicket,
  assignTicket, updateTicketStatus, rateTicket,
  getTicketStats,
} = require('../controllers/ticketController');

// Stats (before /:id)
router.get('/stats', protect, authorize('admin'), getTicketStats);

// Resident routes
router.post('/', protect, authorize('resident'), (req, res, next) => {
  req.uploadSubDir = 'tickets';
  next();
}, upload.array('photos', 5), createTicket);

router.put('/:id/rate', protect, authorize('resident'), rateTicket);

// Admin routes
router.put('/:id/assign', protect, authorize('admin'), assignTicket);

// Technician routes
router.put('/:id/status', protect, authorize('admin', 'technician'), (req, res, next) => {
  req.uploadSubDir = 'tickets';
  next();
}, upload.array('photos', 5), updateTicketStatus);

// Shared routes
router.get('/', protect, getTickets);
router.get('/:id', protect, getTicket);

module.exports = router;
