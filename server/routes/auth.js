const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  register, login, getMe, updateProfile, uploadAvatar, selectFlat,
  getPendingUsers, verifyUser, getAllUsers,
  createUserByAdmin, updateUserByAdmin, deleteUserByAdmin,
  addFamilyMember, removeFamilyMember, getEmailLogs,
  oauthLogin, bindOAuthProvider, unbindOAuthProvider,
  forgotPassword, resetPassword,
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/oauth/login', oauthLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (Self-Profile & Account & OAuth Binding)
router.post('/oauth/bind', protect, bindOAuthProvider);
router.delete('/oauth/unbind/:provider', protect, unbindOAuthProvider);

// Protected routes (Self-Profile & Account)
router.get('/me', protect, getMe);
router.put('/profile', protect, (req, res, next) => {
  req.uploadSubDir = 'avatars';
  next();
}, upload.single('avatar'), updateProfile);
router.post('/avatar', protect, (req, res, next) => {
  req.uploadSubDir = 'avatars';
  next();
}, upload.single('avatar'), uploadAvatar);
router.put('/select-flat', protect, (req, res, next) => {
  req.uploadSubDir = 'verification';
  next();
}, upload.array('documents', 5), selectFlat);
router.post('/family', protect, addFamilyMember);
router.delete('/family/:memberId', protect, removeFamilyMember);

// Admin routes (User Management & Modification)
router.get('/pending-users', protect, authorize('admin'), getPendingUsers);
router.put('/verify/:userId', protect, authorize('admin'), verifyUser);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.get('/email-logs', protect, authorize('admin'), getEmailLogs);
router.post('/users', protect, authorize('admin'), (req, res, next) => {
  req.uploadSubDir = 'avatars';
  next();
}, upload.single('avatar'), createUserByAdmin);
router.put('/users/:id', protect, authorize('admin'), (req, res, next) => {
  req.uploadSubDir = 'avatars';
  next();
}, upload.single('avatar'), updateUserByAdmin);
router.delete('/users/:id', protect, authorize('admin'), deleteUserByAdmin);

module.exports = router;
