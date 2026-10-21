const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  block: {
    type: String,
    required: [true, 'Block name is required'],
    trim: true,
    uppercase: true,
  },
  flatNumber: {
    type: String,
    required: [true, 'Flat number is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['1BHK', '2BHK', '3BHK', '4BHK', 'Penthouse', 'Studio'],
    default: '2BHK',
  },
  sqFt: {
    type: Number,
    default: 0,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  tenants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  billingType: {
    type: String,
    enum: ['sqft', 'fixed'],
    default: 'fixed',
  },
  ratePerSqFt: {
    type: Number,
    default: 5,
  },
  fixedRate: {
    type: Number,
    default: 3000,
  },
  status: {
    type: String,
    enum: ['vacant', 'occupied'],
    default: 'vacant',
  },
}, {
  timestamps: true,
});

// Virtual for display name
propertySchema.virtual('displayName').get(function() {
  return `${this.block}-${this.flatNumber}`;
});

propertySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Property', propertySchema);
