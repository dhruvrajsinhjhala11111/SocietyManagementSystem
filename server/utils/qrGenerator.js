const crypto = require('crypto');
const QRCode = require('qrcode');

// Generate a 6-digit numeric pass code
const generatePassCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Generate QR code as data URL
const generateQRCode = async (data) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(data), {
      width: 300,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff',
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    return null;
  }
};

module.exports = { generatePassCode, generateQRCode };
