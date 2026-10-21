const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  visitorName: {
    type: String,
    required: [true, 'Visitor name is required'],
    trim: true,
  },
  visitorPhone: {
    type: String,
    required: [true, 'Visitor phone is required'],
    trim: true,
  },
  purpose: {
    type: String,
    enum: ['guest', 'delivery', 'cab', 'service', 'other'],
    default: 'guest',
  },
  purposeNote: {
    type: String,
    default: '',
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: false,
    default: null,
  },
  passCode: {
    type: String,
    required: true,
  },
  qrCodeData: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'checked-in', 'checked-out', 'expired'],
    default: 'pending',
  },
  entryTime: {
    type: Date,
    default: null,
  },
  exitTime: {
    type: Date,
    default: null,
  },
  guardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  isPreApproved: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  vehicleNumber: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Index for quick lookups
visitorSchema.index({ passCode: 1 });
visitorSchema.index({ residentId: 1, status: 1 });

module.exports = mongoose.model('Visitor', visitorSchema);
