const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Monthly Maintenance',
    trim: true,
  },
  billType: {
    type: String,
    enum: ['maintenance', 'water', 'electricity', 'penalty', 'event', 'other'],
    default: 'maintenance',
  },
  invoiceNumber: {
    type: String,
    default: '',
    trim: true,
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: false,
    default: null,
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  month: {
    type: String,
    required: true, // Format: "2026-10"
  },
  dueDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending',
  },
  orderId: {
    type: String,
    default: '',
  },
  paymentId: {
    type: String,
    default: '',
  },
  paymentMethod: {
    type: String,
    default: '',
  },
  paidAt: {
    type: Date,
    default: null,
  },
  receiptNumber: {
    type: String,
    default: '',
  },
  upiVpa: {
    type: String,
    default: '',
  },
  bankName: {
    type: String,
    default: '',
  },
  bankReference: {
    type: String,
    default: '',
  },
  cardNetwork: {
    type: String,
    default: '',
  },
  cardLast4: {
    type: String,
    default: '',
  },
  breakdown: {
    maintenance: { type: Number, default: 0 },
    water: { type: Number, default: 0 },
    parking: { type: Number, default: 0 },
    sinkingFund: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
  lateFee: {
    type: Number,
    default: 0,
  },
  remindersSent: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Non-unique compound indices to allow generating multiple bills per month/year
billSchema.index({ propertyId: 1, month: 1 });
billSchema.index({ residentId: 1, status: 1 });
billSchema.index({ invoiceNumber: 1 });

module.exports = mongoose.model('Bill', billSchema);
