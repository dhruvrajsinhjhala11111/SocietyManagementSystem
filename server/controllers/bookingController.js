const { Facility, Booking } = require('../models/Booking');
const Notification = require('../models/Notification');

// @desc    Create facility (Admin)
// @route   POST /api/bookings/facilities
exports.createFacility = async (req, res) => {
  try {
    const facility = await Facility.create(req.body);
    res.status(201).json(facility);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all facilities
// @route   GET /api/bookings/facilities
exports.getFacilities = async (req, res) => {
  try {
    const facilities = await Facility.find({ isActive: true });
    res.json(facilities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update facility (Admin)
// @route   PUT /api/bookings/facilities/:id
exports.updateFacility = async (req, res) => {
  try {
    const facility = await Facility.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }
    res.json(facility);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get available slots for a facility on a date
// @route   GET /api/bookings/availability/:facilityId
exports.getAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    const facility = await Facility.findById(req.params.facilityId);

    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    const bookings = await Booking.find({
      facilityId: facility._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'confirmed',
    });

    const bookedSlots = bookings.map(b => b.slot.start);

    const availability = facility.availableSlots.map(slot => ({
      ...slot.toObject ? slot.toObject() : slot,
      isBooked: bookedSlots.includes(slot.start),
    }));

    res.json({ facility, slots: availability, date });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Book a slot (Resident)
// @route   POST /api/bookings
exports.createBooking = async (req, res) => {
  try {
    const { facilityId, facility: altFacilityId, date, slot, notes, bookingDate, startTime, endTime } = req.body;
    const targetFacilityId = facilityId || altFacilityId;
    const facility = await Facility.findById(targetFacilityId);

    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    // Safely extract slot
    const finalSlot = (slot && slot.start && slot.end)
      ? slot
      : (startTime && endTime ? { start: startTime, end: endTime } : null);

    if (!finalSlot || !finalSlot.start || !finalSlot.end) {
      return res.status(400).json({ message: 'Please select a valid time slot' });
    }

    // Safely parse date
    const rawDate = date || bookingDate || new Date();
    const parsedDate = new Date(rawDate);
    const startOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 23, 59, 59, 999);

    // Check if slot is already booked
    const existing = await Booking.findOne({
      facilityId,
      date: { $gte: startOfDay, $lte: endOfDay },
      'slot.start': finalSlot.start,
      status: 'confirmed',
    });

    if (existing) {
      return res.status(400).json({ message: `Slot ${finalSlot.start} - ${finalSlot.end} is already booked for this date. Please choose another slot.` });
    }

    const booking = await Booking.create({
      facilityId: targetFacilityId,
      facilityName: facility.name,
      residentId: req.user._id,
      date: startOfDay,
      slot: finalSlot,
      isPaid: Boolean(facility.isPaid && facility.pricePerSlot > 0),
      amount: facility.isPaid ? facility.pricePerSlot : 0,
      paymentStatus: (facility.isPaid && facility.pricePerSlot > 0) ? 'pending' : 'na',
      notes: notes || '',
    });

    // Notify user
    await Notification.create({
      userId: req.user._id,
      title: 'Booking Confirmed',
      message: `Your reservation for ${facility.name} on ${startOfDay.toLocaleDateString()} (${finalSlot.start} - ${finalSlot.end}) has been confirmed.`,
      type: 'booking',
      referenceId: booking._id,
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error in createBooking:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings
// @route   GET /api/bookings
exports.getBookings = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'resident') {
      filter.residentId = req.user._id;
    }

    const bookings = await Booking.find(filter)
      .populate('residentId', 'name phone')
      .populate('facilityId', 'name')
      .sort({ date: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'cancelled';
    if (booking.isPaid && booking.paymentStatus === 'paid') {
      booking.paymentStatus = 'refunded';
    }
    await booking.save();

    res.json({ message: 'Booking cancelled', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Pay for booking
// @route   POST /api/bookings/:id/pay
exports.payBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.paymentStatus = 'paid';
    await booking.save();

    res.json({ message: 'Payment successful', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
