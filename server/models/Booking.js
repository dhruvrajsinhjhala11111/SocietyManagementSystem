const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  pricePerSlot: {
    type: Number,
    default: 0,
  },
  availableSlots: [{
    start: String, // "09:00"
    end: String,   // "11:00"
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  icon: {
    type: String,
    default: 'building',
  },
}, {
  timestamps: true,
});

const bookingSchema = new mongoose.Schema({
  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true,
  },
  facilityName: {
    type: String,
    required: true,
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  slot: {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  amount: {
    type: Number,
    default: 0,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'na'],
    default: 'na',
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'completed'],
    default: 'confirmed',
  },
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

bookingSchema.index({ facilityId: 1, date: 1, 'slot.start': 1 });

const Facility = mongoose.model('Facility', facilitySchema);
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = { Facility, Booking };
