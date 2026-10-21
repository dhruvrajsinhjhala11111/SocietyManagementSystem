const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  generateBills, getAllBills, getMyBills,
  payBill, getBillingStats, sendReminder, markOverdue,
  getPaymentConfig, updatePaymentConfig, resetPaymentConfig, createRazorpayOrder, verifyRazorpayPayment,
  createCustomBill, validateUPIVpa, validateCardDetails, handleRazorpayCallback,
} = require('../controllers/billingController');

// Direct Razorpay NetBanking Callback (public route for gateway redirect)
router.all('/payment-callback', handleRazorpayCallback);

// Payment gateway config & service validators
router.get('/payment-config', protect, getPaymentConfig);
router.post('/payment-config', protect, updatePaymentConfig);
router.post('/reset-payment-config', protect, resetPaymentConfig);
router.post('/validate-upi', protect, validateUPIVpa);
router.post('/validate-card', protect, validateCardDetails);

// Resident routes
router.get('/my-bills', protect, authorize('resident'), getMyBills);
router.post('/:id/create-razorpay-order', protect, authorize('resident'), createRazorpayOrder);
router.post('/:id/verify-payment', protect, authorize('resident'), verifyRazorpayPayment);
router.post('/:id/pay', protect, authorize('resident'), payBill);

// Admin routes
router.post('/generate', protect, authorize('admin'), generateBills);
router.post('/custom', protect, authorize('admin'), createCustomBill);
router.get('/stats', protect, authorize('admin'), getBillingStats);
router.post('/:id/remind', protect, authorize('admin'), sendReminder);
router.post('/mark-overdue', protect, authorize('admin'), markOverdue);
router.get('/', protect, authorize('admin'), getAllBills);

module.exports = router;
