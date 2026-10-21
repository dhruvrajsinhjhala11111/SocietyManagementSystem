const Bill = require('../models/Bill');
const User = require('../models/User');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const { generateMonthlyBills, markOverdueBills, generateReceiptNumber } = require('../utils/billingCalculator');
const razorpay = require('../utils/razorpay');
const { validateUPI, validateCard, validateBank, SUPPORTED_BANKS } = require('../utils/paymentValidator');

// @desc    Generate bills (Admin trigger or Cron)
// @route   POST /api/billing/generate
exports.generateBills = async (req, res) => {
  try {
    const options = req.body || {};
    const count = await generateMonthlyBills(options);

    // Notify connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('new_notice', {
        title: 'New Maintenance Bills Generated',
        message: `${options.title || 'Maintenance'} bills for ${options.month || 'the selected period'} have been published.`,
      });
    }

    res.json({
      message: `Successfully generated ${count} bill(s) for ${options.month || 'selected period'}. New and existing residents can now view and pay their bills.`,
      count,
    });
  } catch (error) {
    console.error('Error in generateBills:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all bills (Admin)
// @route   GET /api/billing
exports.getAllBills = async (req, res) => {
  try {
    const { month, status } = req.query;
    let filter = {};
    if (month) filter.month = month;
    if (status) filter.status = status;

    const bills = await Bill.find(filter)
      .populate('propertyId', 'block flatNumber type')
      .populate('residentId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my bills (Resident - works for both new and existing users)
// @route   GET /api/billing/my-bills
exports.getMyBills = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('propertyId');

    // 1. If resident doesn't have a flat yet, automatically assign an available flat
    if (!user.propertyId) {
      let prop = await Property.findOne({ ownerId: user._id })
        || await Property.findOne({ status: 'vacant', ownerId: null })
        || await Property.findOne({ ownerId: null })
        || await Property.findOne();

      if (prop) {
        user.propertyId = prop._id;
        if (!prop.ownerId) {
          prop.ownerId = user._id;
          prop.status = 'occupied';
          await prop.save();
        }
        await user.save();
      }
    }

    // 2. Link any flat bills to this resident
    if (user.propertyId) {
      const propId = user.propertyId._id || user.propertyId;
      await Bill.updateMany(
        { propertyId: propId, residentId: { $ne: user._id } },
        { residentId: user._id }
      );
    }

    // 3. Query all bills matching residentId or propertyId
    const filter = {
      $or: [
        { residentId: user._id },
      ],
    };
    if (user.propertyId) {
      filter.$or.push({ propertyId: user.propertyId._id || user.propertyId });
    }

    let bills = await Bill.find(filter)
      .populate('propertyId', 'block flatNumber type')
      .sort({ createdAt: -1 });

    // 4. If this resident user has ZERO bills, auto-generate their initial maintenance bill so it reflects immediately!
    if (bills.length === 0) {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const invSuffix = Date.now().toString(36).slice(-4).toUpperCase();
      const invoiceNumber = `INV-${month.replace('-', '')}-RES-${invSuffix}`;

      const newBill = await Bill.create({
        title: 'Monthly Maintenance',
        billType: 'maintenance',
        invoiceNumber,
        propertyId: user.propertyId?._id || user.propertyId || null,
        residentId: user._id,
        amount: 4000,
        month,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 25),
        breakdown: {
          maintenance: 3000,
          water: 200,
          parking: 500,
          sinkingFund: 300,
          other: 0,
        },
      });

      bills = [await Bill.findById(newBill._id).populate('propertyId', 'block flatNumber type')];
    }

    res.json(bills);
  } catch (error) {
    console.error('Error in getMyBills:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Pay bill (mock payment)
// @route   POST /api/billing/:id/pay
exports.payBill = async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const bill = await Bill.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    if (bill.status === 'paid') {
      return res.status(400).json({ message: 'Bill already paid' });
    }

    // Mock payment processing
    bill.status = 'paid';
    bill.paymentId = `PAY_${Date.now()}`;
    bill.paymentMethod = paymentMethod || 'upi';
    bill.paidAt = new Date();
    bill.receiptNumber = generateReceiptNumber();
    await bill.save();

    // Create notification
    await Notification.create({
      userId: bill.residentId,
      title: 'Payment Successful',
      message: `Your maintenance bill of ₹${bill.amount} for ${bill.month} has been paid. Receipt: ${bill.receiptNumber}`,
      type: 'billing',
      referenceId: bill._id,
    });

    res.json({
      message: 'Payment successful',
      bill,
      receipt: {
        receiptNumber: bill.receiptNumber,
        amount: bill.amount,
        paymentMethod: bill.paymentMethod,
        paidAt: bill.paidAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get billing stats (Admin)
// @route   GET /api/billing/stats
exports.getBillingStats = async (req, res) => {
  try {
    const { month } = req.query;
    const currentMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const total = await Bill.countDocuments({ month: currentMonth });
    const paid = await Bill.countDocuments({ month: currentMonth, status: 'paid' });
    const pending = await Bill.countDocuments({ month: currentMonth, status: 'pending' });
    const overdue = await Bill.countDocuments({ month: currentMonth, status: 'overdue' });

    const totalAmount = await Bill.aggregate([
      { $match: { month: currentMonth } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const collectedAmount = await Bill.aggregate([
      { $match: { month: currentMonth, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      month: currentMonth,
      total,
      paid,
      pending,
      overdue,
      totalAmount: totalAmount[0]?.total || 0,
      collectedAmount: collectedAmount[0]?.total || 0,
      collectionRate: total > 0 ? Math.round((paid / total) * 100) : 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send payment reminder
// @route   POST /api/billing/:id/remind
exports.sendReminder = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('residentId', 'name');

    if (!bill || bill.status === 'paid') {
      return res.status(400).json({ message: 'Invalid bill or already paid' });
    }

    bill.remindersSent += 1;
    await bill.save();

    await Notification.create({
      userId: bill.residentId._id,
      title: 'Payment Reminder',
      message: `Your maintenance bill of ₹${bill.amount} for ${bill.month} is pending. Please pay at the earliest.`,
      type: 'billing',
      referenceId: bill._id,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${bill.residentId._id}`).emit('payment_reminder', {
        bill,
        message: `Payment reminder for ₹${bill.amount}`,
      });
    }

    res.json({ message: 'Reminder sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark overdue bills
// @route   POST /api/billing/mark-overdue
exports.markOverdue = async (req, res) => {
  try {
    const count = await markOverdueBills();
    res.json({ message: `Marked ${count} bills as overdue` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Razorpay payment configuration
// @route   GET /api/billing/payment-config
exports.getPaymentConfig = async (req, res) => {
  try {
    res.json({
      keyId: razorpay.keyId,
      isConfigured: razorpay.isConfigured,
      currency: 'INR',
      societyName: 'Dwarkesh Ratna Co-op Housing Society',
      supportedBanks: SUPPORTED_BANKS,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Razorpay payment configuration / credentials
// @route   POST /api/billing/payment-config
exports.updatePaymentConfig = async (req, res) => {
  try {
    const { keyId, keySecret, webhookSecret } = req.body;
    const result = razorpay.updateCredentials({ keyId, keySecret, webhookSecret });
    res.json({
      message: 'Razorpay configuration updated successfully',
      isConfigured: result.isConfigured,
      keyId: result.keyId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Razorpay order for bill payment
// @route   POST /api/billing/:id/create-razorpay-order
exports.createRazorpayOrder = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('propertyId', 'block flatNumber')
      .populate('residentId', 'name email phone');

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    if (bill.status === 'paid') {
      return res.status(400).json({ message: 'This bill has already been paid.' });
    }

    const receipt = bill.receiptNumber || `INV_${bill._id.toString().slice(-8).toUpperCase()}`;

    const order = await razorpay.createOrder({
      amount: bill.amount,
      currency: 'INR',
      receipt,
      notes: {
        billId: bill._id.toString(),
        month: bill.month,
        residentName: bill.residentId?.name || req.user.name,
        flat: bill.propertyId ? `${bill.propertyId.block}-${bill.propertyId.flatNumber}` : 'Flat',
      },
    });

    bill.orderId = order.id;
    await bill.save();

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
      isSimulated: order.isSimulated,
      authWarning: order.authWarning || null,
      bill: {
        id: bill._id,
        amount: bill.amount,
        month: bill.month,
        invoiceNumber: receipt,
        flat: bill.propertyId ? `${bill.propertyId.block}-${bill.propertyId.flatNumber}` : '',
        residentName: bill.residentId?.name || req.user.name,
        breakdown: bill.breakdown,
      },
    });
  } catch (error) {
    const msg = error?.error?.description || error.message || 'Error creating Razorpay order';
    console.error('Failed to create Razorpay order:', msg);
    res.status(500).json({ message: msg });
  }
};

// @desc    Reset Razorpay payment configuration back to sandbox
// @route   POST /api/billing/reset-payment-config
exports.resetPaymentConfig = async (req, res) => {
  try {
    const result = razorpay.updateCredentials({
      keyId: 'rzp_test_placeholder',
      keySecret: 'placeholder_secret',
      webhookSecret: 'placeholder_webhook_secret',
    });
    res.json({
      message: 'Razorpay reset to Sandbox mode successfully',
      isConfigured: false,
      keyId: 'rzp_test_placeholder',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify Razorpay payment and mark bill as paid
// @route   POST /api/billing/:id/verify-payment
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentMethod,
    } = req.body;

    const bill = await Bill.findById(req.params.id)
      .populate('propertyId', 'block flatNumber')
      .populate('residentId', 'name email phone');

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    if (bill.status === 'paid') {
      return res.status(400).json({ message: 'This bill has already been paid.' });
    }

    const isValid = razorpay.verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid payment signature. Verification failed.' });
    }

    // Validate UPI / Card / Bank services
    if (paymentMethod && paymentMethod.includes('upi')) {
      const vpaToCheck = req.body.upiVpa || 'resident@okhdfcbank';
      const upiValidation = validateUPI(vpaToCheck);
      if (req.body.upiVpa && !upiValidation.isValid) {
        return res.status(400).json({ message: upiValidation.message });
      }
      bill.upiVpa = upiValidation.vpa || vpaToCheck;
      bill.bankName = upiValidation.bank || 'NPCI Linked Bank';
      bill.bankReference = `UPI_RR_${Date.now().toString().slice(-8)}`;
    } else if (paymentMethod && paymentMethod.includes('card')) {
      if (req.body.cardDetails) {
        const cardValidation = validateCard(req.body.cardDetails);
        if (!cardValidation.isValid) {
          return res.status(400).json({ message: cardValidation.message });
        }
        bill.cardNetwork = cardValidation.network;
        bill.cardLast4 = cardValidation.last4;
        bill.bankName = `${cardValidation.network} Card Gateway`;
      }
    } else if (paymentMethod && paymentMethod.includes('netbanking')) {
      const bankToCheck = req.body.bankName || 'HDFC Bank';
      const bankValidation = validateBank(bankToCheck);
      bill.bankName = bankValidation.bankName || bankToCheck;
      bill.bankReference = `${bankValidation.code || 'BANK'}_TXN_${Date.now().toString().slice(-6)}`;
    }

    bill.status = 'paid';
    bill.paymentId = razorpay_payment_id || `pay_${Date.now()}`;
    bill.paymentMethod = paymentMethod || 'razorpay';
    bill.paidAt = new Date();
    bill.receiptNumber = bill.receiptNumber || generateReceiptNumber();
    await bill.save();

    // Create resident notification
    await Notification.create({
      userId: bill.residentId?._id || req.user._id,
      title: 'Payment Successful',
      message: `Your maintenance payment of ₹${bill.amount.toLocaleString()} for ${bill.month} is confirmed via Razorpay. Receipt: ${bill.receiptNumber}`,
      type: 'billing',
      referenceId: bill._id,
    });

    // Notify via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${bill.residentId?._id || req.user._id}`).emit('payment_success', {
        billId: bill._id,
        receiptNumber: bill.receiptNumber,
        amount: bill.amount,
        paymentId: bill.paymentId,
      });
    }

    res.json({
      success: true,
      message: 'Payment verified and bill marked as paid successfully.',
      bill,
      receipt: {
        receiptNumber: bill.receiptNumber,
        invoiceNumber: bill.receiptNumber,
        amount: bill.amount,
        paymentId: bill.paymentId,
        paymentMethod: bill.paymentMethod,
        upiVpa: bill.upiVpa,
        bankName: bill.bankName,
        bankReference: bill.bankReference,
        cardNetwork: bill.cardNetwork,
        cardLast4: bill.cardLast4,
        paidAt: bill.paidAt,
        month: bill.month,
        breakdown: bill.breakdown,
        flat: bill.propertyId ? `${bill.propertyId.block}-${bill.propertyId.flatNumber}` : '',
        residentName: bill.residentId?.name || req.user.name,
      },
    });
  } catch (error) {
    console.error('Failed to verify Razorpay payment:', error);
    res.status(500).json({ message: error.message || 'Error verifying Razorpay payment' });
  }
};

// @desc    Validate UPI Virtual Payment Address (VPA) with NPCI bank handles
// @route   POST /api/billing/validate-upi
exports.validateUPIVpa = async (req, res) => {
  try {
    const { vpa } = req.body;
    const result = validateUPI(vpa);
    if (!result.isValid) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Validate Card Number (Luhn Checksum), Expiry, and CVV
// @route   POST /api/billing/validate-card
exports.validateCardDetails = async (req, res) => {
  try {
    const result = validateCard(req.body);
    if (!result.isValid) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create individual/custom bill
// @route   POST /api/billing/custom
exports.createCustomBill = async (req, res) => {
  try {
    const {
      title,
      billType,
      month,
      amount,
      dueDate,
      propertyId,
      residentId,
      breakdown,
    } = req.body;

    let targetResidentId = residentId;
    let targetPropertyId = propertyId;

    if (!targetResidentId && targetPropertyId) {
      const prop = await Property.findById(targetPropertyId);
      targetResidentId = prop?.ownerId;
    }

    if (!targetResidentId) {
      const firstRes = await User.findOne({ role: 'resident' });
      targetResidentId = firstRes?._id;
    }

    const now = new Date();
    const finalMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const invSuffix = Date.now().toString(36).slice(-4).toUpperCase() + Math.random().toString(36).slice(-2).toUpperCase();
    const invoiceNumber = `INV-${finalMonth.replace('-', '')}-CUST-${invSuffix}`;

    const bill = await Bill.create({
      title: title || 'Special Maintenance Assessment',
      billType: billType || 'other',
      invoiceNumber,
      propertyId: targetPropertyId || null,
      residentId: targetResidentId,
      amount: Number(amount) || 2500,
      month: finalMonth,
      dueDate: dueDate ? new Date(dueDate) : new Date(now.getFullYear(), now.getMonth(), 25),
      breakdown: breakdown || {
        maintenance: Number(amount) || 2500,
        water: 0,
        parking: 0,
        sinkingFund: 0,
        other: 0,
      },
    });

    const populated = await Bill.findById(bill._id)
      .populate('propertyId', 'block flatNumber')
      .populate('residentId', 'name email');

    res.status(201).json({
      message: 'Custom bill created successfully and assigned to resident',
      bill: populated,
    });
  } catch (error) {
    console.error('Error creating custom bill:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Handle Razorpay direct redirection callback (POST / GET from bank redirect)
// @route   ALL /api/billing/payment-callback
exports.handleRazorpayCallback = async (req, res) => {
  try {
    const data = req.method === 'POST' ? req.body : req.query;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, error } = data;
    const billId = req.query.billId || data.billId;
    const bankName = req.query.bank || data.bankName || 'NetBanking';

    const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

    if (error) {
      console.warn('Razorpay Redirection returned error:', error);
      const errMsg = error.description || error.reason || 'Payment cancelled or declined by bank';
      return res.redirect(`${clientOrigin}/resident/bills?payment_error=${encodeURIComponent(errMsg)}`);
    }

    if (!razorpay_payment_id || !razorpay_order_id) {
      return res.redirect(`${clientOrigin}/resident/bills?payment_error=${encodeURIComponent('Missing payment details from bank callback')}`);
    }

    // Verify signature
    const isValid = razorpay.verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      console.warn('Signature verification failed on direct NetBanking callback');
      return res.redirect(`${clientOrigin}/resident/bills?payment_error=${encodeURIComponent('Payment signature verification failed')}`);
    }

    // Locate bill by billId or by orderId
    let bill = null;
    if (billId) {
      bill = await Bill.findById(billId);
    }
    if (!bill && razorpay_order_id) {
      bill = await Bill.findOne({ orderId: razorpay_order_id });
    }

    if (!bill) {
      return res.redirect(`${clientOrigin}/resident/bills?payment_error=${encodeURIComponent('Associated bill record not found')}`);
    }

    if (bill.status !== 'paid') {
      bill.status = 'paid';
      bill.paymentId = razorpay_payment_id;
      bill.paymentMethod = 'razorpay_netbanking';
      bill.bankName = bankName;
      bill.bankReference = `${bankName}_${Date.now().toString().slice(-6)}`;
      bill.paidAt = new Date();
      bill.receiptNumber = bill.receiptNumber || generateReceiptNumber();
      await bill.save();

      // Send resident notification
      try {
        await Notification.create({
          userId: bill.residentId,
          title: 'NetBanking Payment Successful',
          message: `Your maintenance payment of ₹${bill.amount.toLocaleString()} for ${bill.month} is confirmed via NetBanking. Payment ID: ${razorpay_payment_id}`,
          type: 'billing',
          referenceId: bill._id,
        });
      } catch (nErr) {
        console.warn('Notification create warning:', nErr.message);
      }

      // Notify socket
      const io = req.app.get('io');
      if (io) {
        io.emit('billUpdated', bill);
        io.emit('paymentReceived', {
          billId: bill._id,
          amount: bill.amount,
          paidAt: bill.paidAt,
          paymentMethod: 'razorpay_netbanking',
          receiptNumber: bill.receiptNumber,
        });
      }
    }

    return res.redirect(`${clientOrigin}/resident/bills?payment_success=true&billId=${bill._id}&paymentId=${razorpay_payment_id}`);
  } catch (error) {
    console.error('Error handling Razorpay callback:', error);
    const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientOrigin}/resident/bills?payment_error=${encodeURIComponent(error.message || 'Payment processing error')}`);
  }
};



