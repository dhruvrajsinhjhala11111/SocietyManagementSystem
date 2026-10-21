const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Bill = require('../models/Bill');
const Notification = require('../models/Notification');

/**
 * Razorpay Webhook Handler
 * Route: POST /api/webhooks/razorpay
 * 
 * NOTE: Razorpay sends raw JSON bytes. This route uses express.raw()
 * and must be mounted BEFORE any global express.json() parser.
 */
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // 1. Verify signature if webhook secret is configured
  if (webhookSecret) {
    if (!signature) {
      console.error('⚠️ Unauthorized: Missing X-Razorpay-Signature header.');
      return res.status(400).send('Missing signature');
    }

    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(req.body);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== signature) {
      console.error('⚠️ Unauthorized: Invalid Webhook Signature detected.');
      return res.status(400).send('Invalid signature');
    }
  } else {
    console.warn('⚠️ RAZORPAY_WEBHOOK_SECRET not set; running in development bypass mode.');
  }

  // 2. Parse the verified payload
  let payload;
  try {
    payload = JSON.parse(req.body.toString());
  } catch (parseErr) {
    console.error('❌ Failed to parse webhook payload JSON:', parseErr);
    return res.status(400).send('Invalid JSON payload');
  }

  const event = payload.event;
  console.log(`📩 Razorpay Webhook Event: ${event}`);

  // 3. Handle successful capture event
  if (event === 'payment.captured' || event === 'order.paid') {
    const paymentData = payload.payload?.payment?.entity || {};
    const orderId = paymentData.order_id;
    const paymentId = paymentData.id;
    const notes = paymentData.notes || {};
    const billId = notes.billId;

    try {
      // Find bill by billId note, paymentId, or invoiceNumber
      let bill = null;
      if (billId) {
        bill = await Bill.findById(billId).populate('residentId', 'name email');
      }
      if (!bill && paymentId) {
        bill = await Bill.findOne({ paymentId }).populate('residentId', 'name email');
      }

      // Idempotency check: Already processed
      if (bill && bill.status === 'paid') {
        console.log(`ℹ️ Bill ${bill._id} already marked as paid. Idempotent skip.`);
        return res.status(200).send('OK - Already Processed');
      }

      if (bill) {
        // Mark bill as paid
        bill.status = 'paid';
        bill.paymentId = paymentId || `pay_${Date.now()}`;
        bill.paymentMethod = paymentData.method || 'razorpay';
        bill.paidAt = new Date();
        bill.receiptNumber = bill.receiptNumber || `REC_${Date.now().toString().slice(-8)}`;
        await bill.save();

        // Create resident notification
        await Notification.create({
          userId: bill.residentId?._id || bill.residentId,
          title: 'Payment Confirmed',
          message: `Your payment of ₹${bill.amount} for ${bill.month} has been verified and confirmed. Receipt: ${bill.receiptNumber}`,
          type: 'billing',
          referenceId: bill._id,
        });

        // Broadcast socket notification
        const io = req.app.get('io');
        if (io && bill.residentId) {
          const residentIdStr = bill.residentId._id ? bill.residentId._id.toString() : bill.residentId.toString();
          io.to(`user_${residentIdStr}`).emit('payment_success', {
            billId: bill._id,
            receiptNumber: bill.receiptNumber,
            amount: bill.amount,
            paymentId: bill.paymentId,
          });
        }

        console.log(`✅ Society bill ${bill._id} fulfilled and marked paid via webhook.`);
      } else {
        console.log(`ℹ️ Webhook received for external/unmapped order ${orderId} (Payment ID: ${paymentId})`);
      }

    } catch (error) {
      console.error('❌ Webhook fulfillment error:', error);
      return res.status(500).send('Internal Server Error');
    }
  }

  // Acknowledge receipt to Razorpay
  return res.status(200).send('OK');
});

module.exports = router;
