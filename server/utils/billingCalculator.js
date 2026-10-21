const Property = require('../models/Property');
const Bill = require('../models/Bill');
const User = require('../models/User');

// Calculate bill amount based on property config
const calculateBillAmount = (property) => {
  let maintenance = 0;

  if (property.billingType === 'sqft') {
    maintenance = property.sqFt * (property.ratePerSqFt || 5);
  } else {
    maintenance = property.fixedRate || 3000;
  }

  // Standard breakdown
  const water = 200;
  const parking = 500;
  const sinkingFund = Math.round(maintenance * 0.1);

  return {
    maintenance,
    water,
    parking,
    sinkingFund,
    other: 0,
    total: maintenance + water + parking + sinkingFund,
  };
};

// Generate bills for all residents and properties (supports custom options and multiple bills)
const generateMonthlyBills = async (options = {}) => {
  try {
    const now = new Date();
    const month = options.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const title = options.title || 'Monthly Maintenance';
    const billType = options.billType || 'maintenance';
    // Allow multiple bills by default so admin can generate more than one bill freely
    const allowMultiple = options.allowMultiple !== undefined ? Boolean(options.allowMultiple) : true;
    const dueDate = options.dueDate
      ? new Date(options.dueDate)
      : new Date(now.getFullYear(), now.getMonth(), 25);

    // 1. Auto-assign any newly registered resident to an available property if they don't have one
    const allResidents = await User.find({ role: 'resident' });
    for (const resident of allResidents) {
      if (!resident.propertyId) {
        const availableProp = await Property.findOne({ status: 'vacant', ownerId: null })
          || await Property.findOne({ ownerId: null })
          || await Property.findOne();

        if (availableProp) {
          resident.propertyId = availableProp._id;
          await resident.save();
          if (!availableProp.ownerId) {
            availableProp.ownerId = resident._id;
            availableProp.status = 'occupied';
            await availableProp.save();
          }
        }
      }
    }

    // 2. Fetch occupied properties
    const properties = await Property.find({
      $or: [
        { status: 'occupied' },
        { ownerId: { $ne: null } },
      ],
    }).populate('ownerId');

    let billsCreated = 0;
    const billedResidentIds = new Set();

    for (const property of properties) {
      const residentId = property.ownerId?._id || property.ownerId;
      if (!residentId) continue;

      // If allowMultiple is disabled, check if this exact bill was already issued
      if (!allowMultiple) {
        const existingBill = await Bill.findOne({
          propertyId: property._id,
          month,
          title,
        });
        if (existingBill) {
          billedResidentIds.add(residentId.toString());
          continue;
        }
      }

      const billing = options.amount ? {
        maintenance: Math.round(Number(options.amount) * 0.75),
        water: Math.round(Number(options.amount) * 0.1),
        parking: Math.round(Number(options.amount) * 0.1),
        sinkingFund: Math.round(Number(options.amount) * 0.05),
        other: 0,
        total: Number(options.amount),
        ...options.breakdown,
      } : calculateBillAmount(property);

      const invSuffix = Date.now().toString(36).slice(-4).toUpperCase() + Math.random().toString(36).slice(-2).toUpperCase();
      const invoiceNumber = `INV-${month.replace('-', '')}-${property.block}${property.flatNumber}-${invSuffix}`;

      await Bill.create({
        title,
        billType,
        invoiceNumber,
        propertyId: property._id,
        residentId,
        amount: billing.total,
        month,
        dueDate,
        breakdown: {
          maintenance: billing.maintenance || 3000,
          water: billing.water || 200,
          parking: billing.parking || 500,
          sinkingFund: billing.sinkingFund || 300,
          other: billing.other || 0,
        },
      });

      billedResidentIds.add(residentId.toString());
      billsCreated++;
    }

    // 3. Ensure ANY new or existing resident who didn't get billed through a property also receives the bill
    for (const resident of allResidents) {
      if (billedResidentIds.has(resident._id.toString())) continue;

      if (!allowMultiple) {
        const existing = await Bill.findOne({
          residentId: resident._id,
          month,
          title,
        });
        if (existing) continue;
      }

      const totalAmount = options.amount ? Number(options.amount) : 4000;
      const invSuffix = Date.now().toString(36).slice(-4).toUpperCase() + Math.random().toString(36).slice(-2).toUpperCase();
      const invoiceNumber = `INV-${month.replace('-', '')}-RES-${invSuffix}`;

      await Bill.create({
        title,
        billType,
        invoiceNumber,
        propertyId: resident.propertyId || null,
        residentId: resident._id,
        amount: totalAmount,
        month,
        dueDate,
        breakdown: options.breakdown || {
          maintenance: Math.round(totalAmount * 0.75),
          water: 200,
          parking: 500,
          sinkingFund: 300,
          other: 0,
        },
      });

      billsCreated++;
    }

    console.log(`✅ Generated ${billsCreated} bills for ${month} ("${title}")`);
    return billsCreated;
  } catch (error) {
    console.error('❌ Bill generation error:', error);
    throw error;
  }
};

// Mark overdue bills
const markOverdueBills = async () => {
  try {
    const now = new Date();
    const result = await Bill.updateMany(
      { status: 'pending', dueDate: { $lt: now } },
      { status: 'overdue' }
    );
    console.log(`⚠️ Marked ${result.modifiedCount} bills as overdue`);
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Overdue marking error:', error);
  }
};

// Generate receipt number
const generateReceiptNumber = () => {
  const prefix = 'RCT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

module.exports = {
  calculateBillAmount,
  generateMonthlyBills,
  markOverdueBills,
  generateReceiptNumber,
};
