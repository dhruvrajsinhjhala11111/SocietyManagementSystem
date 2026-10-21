const User = require('../models/User');
const Property = require('../models/Property');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const { sendRegistrationConfirmationEmail, sendPasswordResetEmail, getEmailAuditLogs } = require('../utils/emailService');

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    if (role && role !== 'resident') {
      return res.status(403).json({
        message: 'Only regular resident accounts can be registered publicly. Admin, Gatekeeper (Guard), and Technician accounts must be created by the Society Administrator.',
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      role: 'resident',
      isVerified: false,
      verificationStatus: 'pending',
    });

    const token = generateToken(user._id);

    // Send confirmation email safely (non-blocking if domain has no mail service)
    let emailSent = false;
    try {
      const emailResult = await sendRegistrationConfirmationEmail(user);
      emailSent = !!emailResult?.success;
    } catch (mailErr) {
      console.warn('[Register] Confirmation email skipped (no mail service configured):', mailErr.message);
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      token,
      confirmationEmail: {
        sent: emailSent,
        recipient: user.email,
        message: emailSent
          ? `Registration confirmation email sent to ${user.email}`
          : 'User registered successfully. (Domain has no mail service, email logged in system audit)',
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      propertyId: user.propertyId,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('propertyId');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, email, currentPassword, newPassword, avatar, familyMembers } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();

    if (email && email.toLowerCase().trim() !== user.email) {
      const cleanEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ message: 'Email is already in use by another account' });
      }
      user.email = cleanEmail;
    }

    // Avatar from file upload or base64/URL string
    if (req.file) {
      user.avatar = `/uploads/avatars/${req.file.filename}`;
    } else if (avatar !== undefined) {
      user.avatar = avatar;
    }

    if (familyMembers) {
      user.familyMembers = typeof familyMembers === 'string' ? JSON.parse(familyMembers) : familyMembers;
    }

    // Password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change password' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password does not match' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      }
      user.password = newPassword;
    }

    await user.save();
    const updated = await User.findById(user._id).populate('propertyId');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload avatar photo
// @route   POST /api/auth/avatar
exports.uploadAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let avatarUrl = '';
    if (req.file) {
      avatarUrl = `/uploads/avatars/${req.file.filename}`;
    } else if (req.body.avatar) {
      avatarUrl = req.body.avatar;
    } else {
      return res.status(400).json({ message: 'No photo provided' });
    }

    user.avatar = avatarUrl;
    await user.save();
    const updated = await User.findById(user._id).populate('propertyId');
    res.json({ message: 'Avatar updated successfully', avatar: avatarUrl, user: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Select flat and upload verification docs
// @route   PUT /api/auth/select-flat
exports.selectFlat = async (req, res) => {
  try {
    const { propertyId } = req.body;
    const user = req.user;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Upload verification docs
    const docs = req.files ? req.files.map(f => `/uploads/verification/${f.filename}`) : [];

    user.propertyId = propertyId;
    user.verificationDocs = docs;
    user.verificationStatus = 'pending';
    await user.save();

    // Update property
    property.ownerId = user._id;
    property.status = 'occupied';
    await property.save();

    res.json({ message: 'Flat selected, awaiting admin verification', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin: Get all users pending verification
// @route   GET /api/auth/pending-users
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ verificationStatus: 'pending', role: 'resident' })
      .populate('propertyId')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin: Approve or reject user
// @route   PUT /api/auth/verify/:userId
exports.verifyUser = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.verificationStatus = status;
    user.isVerified = status === 'approved';
    await user.save();

    res.json({ message: `User ${status} successfully`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin: Get all users
// @route   GET /api/auth/users
exports.getAllUsers = async (req, res) => {
  try {
    const { role, verified, search } = req.query;
    let filter = {};
    if (role && role !== 'all') filter.role = role;
    if (verified !== undefined && verified !== 'all') filter.isVerified = verified === 'true';

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const users = await User.find(filter)
      .populate('propertyId')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin: Create new user
// @route   POST /api/auth/users
exports.createUserByAdmin = async (req, res) => {
  try {
    const {
      name, email, phone, role, password, propertyId,
      isVerified, verificationStatus, avatar,
    } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Name, email, and phone number are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: 'A user with this email address already exists.' });
    }

    let userAvatar = avatar || '';
    if (req.file) {
      userAvatar = `/uploads/avatars/${req.file.filename}`;
    }

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      password: password && password.trim() ? password.trim() : 'Dwarkesh@123',
      role: role || 'resident',
      isVerified: isVerified !== undefined ? (isVerified === true || isVerified === 'true') : true,
      verificationStatus: verificationStatus || 'approved',
      avatar: userAvatar,
      propertyId: propertyId || null,
    });

    if (propertyId) {
      await Property.findByIdAndUpdate(propertyId, {
        ownerId: newUser._id,
        status: 'occupied',
      });
    }

    const created = await User.findById(newUser._id).populate('propertyId');
    // Dispatch confirmation email to particular user's registered email
    await sendRegistrationConfirmationEmail(newUser);
    res.status(201).json({ message: 'User created successfully', user: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin: Modify user details
// @route   PUT /api/auth/users/:id
exports.updateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, role, propertyId,
      isVerified, verificationStatus, password, avatar,
    } = req.body;

    const user = await User.findById(id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();

    // Check unique email if changed
    if (email && email.toLowerCase().trim() !== user.email) {
      const cleanEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: cleanEmail, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ message: 'Email address already in use by another user' });
      }
      user.email = cleanEmail;
    }

    if (role) user.role = role;

    if (isVerified !== undefined) {
      user.isVerified = isVerified === true || isVerified === 'true';
    }

    if (verificationStatus) {
      user.verificationStatus = verificationStatus;
      if (verificationStatus === 'approved') user.isVerified = true;
      if (verificationStatus === 'rejected') user.isVerified = false;
    }

    // Avatar from file upload or body string
    if (req.file) {
      user.avatar = `/uploads/avatars/${req.file.filename}`;
    } else if (avatar !== undefined) {
      user.avatar = avatar;
    }

    // Optional password reset by admin
    if (password && password.trim().length >= 6) {
      user.password = password.trim();
    }

    // Property assignment change
    if (propertyId !== undefined) {
      const oldPropertyId = user.propertyId?.toString();
      const newPropertyId = propertyId && propertyId !== 'none' ? propertyId.toString() : null;

      if (oldPropertyId && oldPropertyId !== newPropertyId) {
        await Property.findByIdAndUpdate(oldPropertyId, {
          ownerId: null,
          status: 'vacant',
        });
      }

      if (newPropertyId) {
        const newProp = await Property.findById(newPropertyId);
        if (newProp) {
          newProp.ownerId = user._id;
          newProp.status = 'occupied';
          await newProp.save();
          user.propertyId = newPropertyId;
        }
      } else {
        user.propertyId = null;
      }
    }

    await user.save();
    const updated = await User.findById(id).populate('propertyId');
    res.json({ message: 'User details updated successfully', user: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin: Delete user
// @route   DELETE /api/auth/users/:id
exports.deleteUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // De-assign flat
    if (user.propertyId) {
      await Property.findByIdAndUpdate(user.propertyId, {
        ownerId: null,
        status: 'vacant',
      });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add family member
// @route   POST /api/auth/family
exports.addFamilyMember = async (req, res) => {
  try {
    const { name, phone, relation, email } = req.body;
    const user = await User.findById(req.user._id);

    user.familyMembers.push({ name, phone, relation, email });
    await user.save();

    res.json(user.familyMembers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove family member
// @route   DELETE /api/auth/family/:memberId
exports.removeFamilyMember = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.familyMembers = user.familyMembers.filter(
      m => m._id.toString() !== req.params.memberId
    );
    await user.save();
    res.json(user.familyMembers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get sent email audit logs (Admin)
// @route   GET /api/auth/email-logs
exports.getEmailLogs = async (req, res) => {
  try {
    const logs = getEmailAuditLogs();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    OAuth Social Sign In / Registration (Google, Microsoft, GitHub, Apple)
// @route   POST /api/auth/oauth/login
exports.oauthLogin = async (req, res) => {
  try {
    const { provider, email, providerId, name, avatar, username, portal } = req.body;

    const allowedProviders = ['google', 'microsoft', 'github', 'apple'];
    if (!allowedProviders.includes(provider)) {
      return res.status(400).json({ message: 'Invalid OAuth provider. Must be google, microsoft, github, or apple.' });
    }

    if (!email) {
      return res.status(400).json({ message: 'Email address is required from OAuth provider.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const pid = providerId || `${provider}_${Date.now()}`;

    // 1. Check if user already exists or is bound to this provider
    let user = await User.findOne({
      $or: [
        { [`oauthProviders.${provider}.id`]: pid },
        { [`oauthProviders.${provider}.email`]: cleanEmail },
        { email: cleanEmail },
      ],
    }).populate('propertyId');

    if (user) {
      // Check portal role restriction if logging into admin portal
      if (portal === 'admin' && user.role === 'resident') {
        return res.status(403).json({
          message: 'Access denied: Resident accounts cannot sign into the Staff & Management Portal. Please use the Resident Portal.',
        });
      }

      // Existing user: ensure provider binding is saved
      if (!user.oauthProviders) user.oauthProviders = {};
      if (!user.oauthProviders[provider] || !user.oauthProviders[provider].id) {
        user.oauthProviders[provider] = {
          id: pid,
          email: cleanEmail,
          username: username || '',
          boundAt: new Date(),
        };
      }
      if (!user.avatar && avatar) {
        user.avatar = avatar;
      }
      await user.save();

      const token = generateToken(user._id);
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
        propertyId: user.propertyId,
        avatar: user.avatar,
        oauthProviders: user.oauthProviders,
        token,
        isNewUser: false,
      });
    }

    // 2. User does not exist
    if (portal === 'admin') {
      return res.status(404).json({
        message: 'No staff account found for this social identity. Staff accounts (Admin, Guard, Technician) must be created by the Society Administrator.',
      });
    }

    // Regular users (residents) can register publicly
    const newUser = await User.create({
      name: name && name.trim() ? name.trim() : cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: 'Not provided',
      password: `OAuth_${provider}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      role: 'resident',
      isVerified: false,
      verificationStatus: 'pending',
      avatar: avatar || '',
      oauthProviders: {
        [provider]: {
          id: pid,
          email: cleanEmail,
          username: username || '',
          boundAt: new Date(),
        },
      },
    });

    const token = generateToken(newUser._id);

    // Send registration confirmation email safely (non-blocking if domain has no mail service)
    let emailSent = false;
    try {
      const emailResult = await sendRegistrationConfirmationEmail(newUser);
      emailSent = !!emailResult?.success;
    } catch (mailErr) {
      console.warn('[OAuth] Confirmation email skipped (no mail service configured):', mailErr.message);
    }

    res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      isVerified: newUser.isVerified,
      verificationStatus: newUser.verificationStatus,
      propertyId: null,
      avatar: newUser.avatar,
      oauthProviders: newUser.oauthProviders,
      token,
      isNewUser: true,
      confirmationEmail: {
        sent: emailSent,
        recipient: newUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bind an OAuth provider account (Google, Microsoft, GitHub, Apple)
// @route   POST /api/auth/oauth/bind
exports.bindOAuthProvider = async (req, res) => {
  try {
    const { provider, providerId, email, username } = req.body;

    const allowedProviders = ['google', 'microsoft', 'github', 'apple'];
    if (!allowedProviders.includes(provider)) {
      return res.status(400).json({ message: 'Invalid OAuth provider' });
    }

    if (!email) {
      return res.status(400).json({ message: 'Email is required to link account' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const pid = providerId || `${provider}_${Date.now()}`;

    // Verify if another account is already linked to this provider account
    const existing = await User.findOne({
      _id: { $ne: req.user._id },
      $or: [
        { [`oauthProviders.${provider}.id`]: pid },
        { [`oauthProviders.${provider}.email`]: cleanEmail },
      ],
    });

    if (existing) {
      return res.status(400).json({
        message: `This ${provider.toUpperCase()} account (${cleanEmail}) is already bound to another member (${existing.name}).`,
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.oauthProviders) user.oauthProviders = {};
    user.oauthProviders[provider] = {
      id: pid,
      email: cleanEmail,
      username: username || '',
      boundAt: new Date(),
    };

    await user.save();
    const updated = await User.findById(user._id).populate('propertyId');

    res.json({
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account connected successfully!`,
      user: updated,
      oauthProviders: updated.oauthProviders,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unbind an OAuth provider account
// @route   DELETE /api/auth/oauth/unbind/:provider
exports.unbindOAuthProvider = async (req, res) => {
  try {
    const { provider } = req.params;

    const allowedProviders = ['google', 'microsoft', 'github', 'apple'];
    if (!allowedProviders.includes(provider)) {
      return res.status(400).json({ message: 'Invalid OAuth provider' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.oauthProviders && user.oauthProviders[provider]) {
      user.oauthProviders[provider] = {
        id: null,
        email: null,
        username: null,
        boundAt: null,
      };
      await user.save();
    }

    const updated = await User.findById(user._id).populate('propertyId');

    res.json({
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account disconnected.`,
      user: updated,
      oauthProviders: updated.oauthProviders,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request Password Reset OTP
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        message: 'No account registered with this email address. Please verify your email or register as a resident.',
      });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    // Send email via email service
    const emailResult = await sendPasswordResetEmail(user, otp);

    res.json({
      success: true,
      message: `A 6-digit password reset code has been sent to ${user.email}. Code is valid for 15 minutes.`,
      email: user.email,
      otp: otp,
      emailSent: emailResult.success,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset Password with OTP
// @route   POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, verification code, and new password are all required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid verification code. Please check your email or request a new code.' });
    }

    if (!user.resetPasswordExpire || new Date() > user.resetPasswordExpire) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a fresh code.' });
    }

    // Set new password (pre-save hook will hash it with bcrypt)
    user.password = newPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

