const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createVisitorPass, verifyPassCode, checkInVisitor,
  checkOutVisitor, requestApproval, respondToVisitor,
  getVisitors, getActiveVisitors,
} = require('../controllers/visitorController');

// Resident and Admin routes
router.post('/', protect, authorize('resident'), createVisitorPass);
router.put('/:id/respond', protect, authorize('resident', 'admin'), respondToVisitor);
router.get('/', protect, getVisitors);

// Guard routes
router.post('/verify', protect, authorize('guard'), verifyPassCode);
router.put('/:id/checkin', protect, authorize('guard'), checkInVisitor);
router.put('/:id/checkout', protect, authorize('guard'), checkOutVisitor);
router.post('/request-approval', protect, authorize('guard'), requestApproval);
router.get('/active', protect, authorize('guard', 'admin'), getActiveVisitors);

module.exports = router;
