const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'resident', 'guard', 'technician'],
    default: 'resident',
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  verificationDocs: [{
    type: String,
  }],
  familyMembers: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relation: { type: String, required: true },
    email: { type: String },
  }],
  avatar: {
    type: String,
    default: '',
  },
  fcmToken: {
    type: String,
    default: '',
  },
  oauthProviders: {
    google: {
      id: { type: String, default: null },
      email: { type: String, default: null },
      boundAt: { type: Date, default: null },
    },
    microsoft: {
      id: { type: String, default: null },
      email: { type: String, default: null },
      boundAt: { type: Date, default: null },
    },
    github: {
      id: { type: String, default: null },
      email: { type: String, default: null },
      username: { type: String, default: null },
      boundAt: { type: Date, default: null },
    },
    apple: {
      id: { type: String, default: null },
      email: { type: String, default: null },
      boundAt: { type: Date, default: null },
    },
  },
  resetPasswordOtp: {
    type: String,
    default: null,
  },
  resetPasswordExpire: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
