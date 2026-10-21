const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createProperty, bulkCreateProperties, getProperties,
  getProperty, updateProperty, deleteProperty,
  getVacantProperties, getPropertyStats,
} = require('../controllers/propertyController');

// Get property stats & vacant properties (before /:id to avoid route conflicts)
router.get('/stats', protect, authorize('admin'), getPropertyStats);
router.get('/vacant', protect, getVacantProperties);

// CRUD routes
router.route('/')
  .get(protect, getProperties)
  .post(protect, authorize('admin'), createProperty);

router.post('/bulk', protect, authorize('admin'), bulkCreateProperties);

router.route('/:id')
  .get(protect, getProperty)
  .put(protect, authorize('admin'), updateProperty)
  .delete(protect, authorize('admin'), deleteProperty);

module.exports = router;
