// Comprehensive validation for UPI PSP Services, Indian Bank Netbanking, and Card Payment Networks

// NPCI Recognized Indian UPI PSP Handles
const UPI_HANDLES = {
  okhdfcbank: { app: 'Google Pay', bank: 'HDFC Bank', ifscPrefix: 'HDFC' },
  okaxis: { app: 'Google Pay', bank: 'Axis Bank', ifscPrefix: 'UTIB' },
  oksbi: { app: 'Google Pay', bank: 'State Bank of India', ifscPrefix: 'SBIN' },
  okicici: { app: 'Google Pay', bank: 'ICICI Bank', ifscPrefix: 'ICIC' },
  ybl: { app: 'PhonePe', bank: 'YES Bank', ifscPrefix: 'YESB' },
  ibl: { app: 'PhonePe', bank: 'ICICI Bank', ifscPrefix: 'ICIC' },
  axl: { app: 'PhonePe', bank: 'Axis Bank', ifscPrefix: 'UTIB' },
  paytm: { app: 'Paytm Payments Bank', bank: 'Paytm Bank', ifscPrefix: 'PYTM' },
  upi: { app: 'BHIM UPI', bank: 'NPCI National Gateway', ifscPrefix: 'NPCI' },
  apl: { app: 'Amazon Pay', bank: 'Axis Bank', ifscPrefix: 'UTIB' },
  hdfcbank: { app: 'HDFC Mobile Banking', bank: 'HDFC Bank', ifscPrefix: 'HDFC' },
  icici: { app: 'iMobile ICICI', bank: 'ICICI Bank', ifscPrefix: 'ICIC' },
  sbi: { app: 'YONO SBI', bank: 'State Bank of India', ifscPrefix: 'SBIN' },
  axisbank: { app: 'Axis Mobile', bank: 'Axis Bank', ifscPrefix: 'UTIB' },
  kotak: { app: 'Kotak 811', bank: 'Kotak Mahindra Bank', ifscPrefix: 'KKBK' },
  pnb: { app: 'PNB ONE', bank: 'Punjab National Bank', ifscPrefix: 'PUNB' },
  barodampay: { app: 'bob World', bank: 'Bank of Baroda', ifscPrefix: 'BARB' },
};

/**
 * Validate Indian UPI Virtual Payment Address (VPA)
 * @param {string} vpa Example: "resident@okhdfcbank"
 */
const validateUPI = (vpa) => {
  if (!vpa || typeof vpa !== 'string') {
    return { isValid: false, message: 'UPI ID is required.' };
  }

  const trimmed = vpa.trim().toLowerCase();
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,32}$/;

  if (!upiRegex.test(trimmed)) {
    return {
      isValid: false,
      message: 'Invalid UPI ID format. Standard format: username@bankhandle (e.g. resident@okhdfcbank)',
    };
  }

  const [username, handle] = trimmed.split('@');
  if (username.length < 2) {
    return { isValid: false, message: 'UPI username too short.' };
  }

  const pspInfo = UPI_HANDLES[handle];
  if (!pspInfo) {
    // Generic valid handle
    return {
      isValid: true,
      vpa: trimmed,
      handle,
      app: 'UPI App',
      bank: 'NPCI Linked Bank',
      isRecognizedPsp: false,
      accountHolder: username.toUpperCase(),
    };
  }

  return {
    isValid: true,
    vpa: trimmed,
    handle,
    app: pspInfo.app,
    bank: pspInfo.bank,
    ifscPrefix: pspInfo.ifscPrefix,
    isRecognizedPsp: true,
    accountHolder: username.toUpperCase(),
  };
};

/**
 * Luhn Algorithm (MOD 10 Checksum) for Credit / Debit Cards
 * @param {string} cardNumber
 */
const validateLuhn = (cardNumber) => {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

/**
 * Detect Indian card network
 * @param {string} digits
 */
const detectCardNetwork = (digits) => {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^6(?!011)(0|52[12])/.test(digits) || /^508[5-9]/.test(digits)) return 'RuPay';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^(5018|5020|5038|6304|6759|6761|6763)/.test(digits)) return 'Maestro';
  return 'Card';
};

/**
 * Validate Card Details
 */
const validateCard = ({ number, cardNumber, expiry, cvv, name }) => {
  const cleanNumber = (number || cardNumber || '').replace(/\s+/g, '');

  if (!cleanNumber) {
    return { isValid: false, message: 'Card number is required.' };
  }

  // Check Luhn checksum
  const isLuhnValid = validateLuhn(cleanNumber);
  const network = detectCardNetwork(cleanNumber);

  if (!isLuhnValid) {
    return {
      isValid: false,
      message: 'Invalid card number checksum (Luhn validation failed). Please enter a valid Visa, Mastercard, or RuPay card.',
    };
  }

  // Validate expiry MM/YY
  if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry.trim())) {
    return { isValid: false, message: 'Expiry date must be in MM/YY format.' };
  }

  const [expMonthStr, expYearStr] = expiry.trim().split('/');
  const expMonth = parseInt(expMonthStr, 10);
  const expYear = 2000 + parseInt(expYearStr, 10);

  if (expMonth < 1 || expMonth > 12) {
    return { isValid: false, message: 'Invalid expiry month (must be between 01 and 12).' };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
    return { isValid: false, message: 'Card has expired. Please use an active card.' };
  }

  // Validate CVV
  const cleanCvv = (cvv || '').trim();
  const requiredCvvLength = network === 'American Express' ? 4 : 3;
  if (!new RegExp(`^\\d{${requiredCvvLength}}$`).test(cleanCvv)) {
    return { isValid: false, message: `CVV must be ${requiredCvvLength} numeric digits for ${network}.` };
  }

  // Validate Cardholder Name
  const cleanName = (name || 'RESIDENT CARDHOLDER').trim();
  if (cleanName.length < 3) {
    return { isValid: false, message: 'Cardholder name is required (minimum 3 characters).' };
  }

  return {
    isValid: true,
    network,
    last4: cleanNumber.slice(-4),
    cardholderName: cleanName.toUpperCase(),
  };
};

/**
 * Bank Netbanking Router validation
 */
const SUPPORTED_BANKS = {
  'HDFC Bank': { code: 'HDFC', ifsc: 'HDFC0000001', gatewayUrl: 'https://netbanking.hdfcbank.com' },
  'State Bank of India': { code: 'SBIN', ifsc: 'SBIN0000001', gatewayUrl: 'https://retail.onlinesbi.sbi' },
  'ICICI Bank': { code: 'ICIC', ifsc: 'ICIC0000001', gatewayUrl: 'https://infinity.icicibank.com' },
  'Axis Bank': { code: 'UTIB', ifsc: 'UTIB0000001', gatewayUrl: 'https://omni.axisbank.co.in' },
  'Kotak Mahindra': { code: 'KKBK', ifsc: 'KKBK0000001', gatewayUrl: 'https://netbanking.kotak.com' },
  'Punjab National Bank': { code: 'PUNB', ifsc: 'PUNB0000001', gatewayUrl: 'https://netpnb.com' },
  'Bank of Baroda': { code: 'BARB', ifsc: 'BARB0000001', gatewayUrl: 'https://www.bobibanking.com' },
};

const validateBank = (bankName) => {
  const bankInfo = SUPPORTED_BANKS[bankName];
  if (!bankInfo) {
    return { isValid: false, message: 'Please select a supported bank for Netbanking.' };
  }
  return {
    isValid: true,
    bankName,
    code: bankInfo.code,
    ifsc: bankInfo.ifsc,
    gatewayUrl: bankInfo.gatewayUrl,
  };
};

module.exports = {
  validateUPI,
  validateCard,
  validateLuhn,
  validateBank,
  UPI_HANDLES,
  SUPPORTED_BANKS,
};
