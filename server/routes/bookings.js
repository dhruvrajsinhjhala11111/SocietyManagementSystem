const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createFacility, getFacilities, updateFacility,
  getAvailability, createBooking, getBookings,
  cancelBooking, payBooking,
} = require('../controllers/bookingController');

// Facility management (Admin)
router.post('/facilities', protect, authorize('admin'), createFacility);
router.get('/facilities', protect, getFacilities);
router.put('/facilities/:id', protect, authorize('admin'), updateFacility);

// Availability
router.get('/availability/:facilityId', protect, getAvailability);

// Booking CRUD
router.route('/')
  .get(protect, getBookings)
  .post(protect, authorize('resident'), createBooking);

router.put('/:id/cancel', protect, cancelBooking);
router.post('/:id/pay', protect, authorize('resident'), payBooking);

module.exports = router;
