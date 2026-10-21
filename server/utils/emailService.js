const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Maintain recent sent email audit logs
const emailAuditLog = [];

/**
 * Create or configure the nodemailer transporter
 */
const getTransporter = async () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  if (host && user && pass) {
    // Production / Configured SMTP
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  }

  // Fallback dev transport: logs emails locally with full delivery payload
  return nodemailer.createTransport({
    jsonTransport: true,
  });
};

/**
 * Generate responsive HTML email template for registration confirmation
 */
const generateRegistrationConfirmationHTML = (user) => {
  const dateFormatted = new Date().toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const roleTitle = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Resident';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dwarkesh Ratna CHS - Registration Confirmation</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 30px 15px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
      padding: 30px 25px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 10px 0 4px;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 0;
      font-size: 13px;
      color: #ccfbf1;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content {
      padding: 35px 30px;
    }
    .badge-confirmed {
      display: inline-block;
      background-color: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 6px 16px;
      border-radius: 50px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 20px;
    }
    h2 {
      margin: 0 0 14px;
      font-size: 20px;
      color: #0f172a;
    }
    p {
      margin: 0 0 16px;
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
    }
    .details-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }
    .details-box h3 {
      margin: 0 0 12px;
      font-size: 15px;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #edf2f7;
      font-size: 14px;
    }
    .details-row:last-child {
      border-bottom: none;
    }
    .details-label {
      color: #64748b;
      font-weight: 500;
    }
    .details-value {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }
    .steps-box {
      background-color: #f0fdfa;
      border-left: 4px solid #14b8a6;
      padding: 16px 20px;
      margin: 25px 0;
      border-radius: 0 8px 8px 0;
    }
    .steps-box h4 {
      margin: 0 0 10px;
      font-size: 15px;
      color: #0f766e;
    }
    .steps-box ul {
      margin: 0;
      padding-left: 20px;
      color: #334155;
      font-size: 14px;
      line-height: 1.6;
    }
    .cta-button {
      display: block;
      width: 220px;
      margin: 30px auto 10px;
      background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
      color: #ffffff !important;
      text-decoration: none;
      text-align: center;
      padding: 14px 20px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 15px;
      box-shadow: 0 4px 10px rgba(15, 118, 110, 0.3);
    }
    .security-note {
      margin-top: 25px;
      padding: 14px;
      background-color: #fffbeb;
      border-radius: 6px;
      border: 1px solid #fef3c7;
      font-size: 12px;
      color: #92400e;
      line-height: 1.5;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 20px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <p>Dwarkesh Ratna Co-operative Housing Society</p>
        <h1>Registration Confirmation</h1>
      </div>

      <div class="content">
        <div style="text-align: center;">
          <span class="badge-confirmed">✓ Account Registered</span>
        </div>

        <h2>Dear ${user.name},</h2>
        <p>
          Welcome to the <strong>Dwarkesh Ratna Co-operative Housing Society</strong> digital portal.
          Your account registration has been confirmed successfully!
        </p>

        <div class="details-box">
          <h3>Your Account Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Full Name</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right; font-size: 14px;">${user.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Registered Email</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right; font-size: 14px;">${user.email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Mobile Number</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right; font-size: 14px;">${user.phone || '—'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Account Role</td>
              <td style="padding: 8px 0; color: #0f766e; font-weight: 700; text-align: right; font-size: 14px;">${roleTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Registered Date</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right; font-size: 14px;">${dateFormatted}</td>
            </tr>
          </table>
        </div>

        <div class="steps-box">
          <h4>What You Can Do Next:</h4>
          <ul>
            <li><strong>Sign in</strong> with your email (<code>${user.email}</code>) and your chosen password.</li>
            <li><strong>Select Flat & Upload Documents:</strong> If you are a resident, pick your flat and provide verification docs for quick society approval.</li>
            <li><strong>Digital Services:</strong> Pay maintenance bills online, issue visitor passes, raise service tickets, and reserve society facilities.</li>
          </ul>
        </div>

        <a href="http://localhost:5173/login" class="cta-button">Go to Society Portal</a>

        <div class="security-note">
          <strong>Security Notice:</strong> If you did not register for the Dwarkesh Ratna CHS portal, please disregard this email or report to the society management office immediately.
        </div>
      </div>

      <div class="footer">
        Dwarkesh Ratna Co-operative Housing Society Ltd.<br>
        Dwarkesh Ratna Complex, Gandhinagar / Ahmedabad Highway<br>
        For society assistance: support@dwarkeshratna.org | Helpline: +91 98765 43210<br>
        © ${new Date().getFullYear()} Dwarkesh Ratna CHS. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Send registration confirmation email to particular user's email
 * @param {Object} user User object containing name, email, phone, role
 */
const sendRegistrationConfirmationEmail = async (user) => {
  if (!user || !user.email) {
    console.warn('[EmailService] Cannot send confirmation email: user email is missing');
    return { success: false, message: 'Missing user email' };
  }

  const fromAddress = process.env.EMAIL_FROM || '"Dwarkesh Ratna CHS" <no-reply@dwarkeshratna.org>';
  const subject = `Welcome to Dwarkesh Ratna CHS - Registration Confirmation`;

  const htmlContent = generateRegistrationConfirmationHTML(user);
  const textContent = `
Dwarkesh Ratna Co-operative Housing Society
REGISTRATION CONFIRMATION

Dear ${user.name},

Welcome to the Dwarkesh Ratna CHS digital portal. Your account has been registered successfully!

Your Account Details:
- Name: ${user.name}
- Email: ${user.email}
- Phone: ${user.phone || 'N/A'}
- Role: ${user.role || 'Resident'}
- Date: ${new Date().toLocaleString('en-IN')}

You can now log in at http://localhost:5173/login to access your society portal, pay bills, generate visitor passes, and book amenities.

If you did not register for this account, please contact the society management office immediately.

Regards,
Dwarkesh Ratna CHS Management Office
Support: support@dwarkeshratna.org
  `.trim();

  try {
    const transporter = await getTransporter();

    const mailOptions = {
      from: fromAddress,
      to: user.email,
      subject,
      text: textContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);

    const logEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      to: user.email,
      name: user.name,
      subject,
      timestamp: new Date().toISOString(),
      messageId: info.messageId || 'local-msg-' + Date.now(),
      status: 'sent',
      preview: nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null,
    };

    emailAuditLog.unshift(logEntry);
    if (emailAuditLog.length > 50) emailAuditLog.pop();

    console.log(`[EmailService] Registration confirmation email successfully sent to: ${user.email} (${user.name})`);

    return {
      success: true,
      messageId: info.messageId,
      preview: logEntry.preview,
      sentTo: user.email,
    };
  } catch (error) {
    console.error(`[EmailService] Failed to send confirmation email to ${user.email}:`, error.message);
    const logEntry = {
      id: Date.now().toString(36),
      to: user.email,
      name: user.name,
      subject,
      timestamp: new Date().toISOString(),
      status: 'failed',
      error: error.message,
    };
    emailAuditLog.unshift(logEntry);

    // Return gracefully so user registration is not blocked if mail server is unreachable
    return {
      success: false,
      error: error.message,
      sentTo: user.email,
    };
  }
};

/**
 * Send Password Reset OTP Email
 * @param {Object} user 
 * @param {string} otp 6-digit reset code
 */
const sendPasswordResetEmail = async (user, otp) => {
  if (!user || !user.email) {
    return { success: false, message: 'Missing user email' };
  }

  const fromAddress = process.env.EMAIL_FROM || '"Dwarkesh Ratna CHS" <no-reply@dwarkeshratna.org>';
  const subject = `Dwarkesh Ratna CHS - Password Reset Code: ${otp}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Password Reset - Dwarkesh Ratna CHS</title>
  <style>
    body { margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; }
    .wrapper { width: 100%; background: #f1f5f9; padding: 30px 15px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f766e 0%, #134e4a 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 8px 0 0; font-size: 22px; font-weight: 800; }
    .content { padding: 32px 28px; }
    .otp-card { text-align: center; margin: 26px 0; padding: 22px; background: #f8fafc; border-radius: 8px; border: 1px dashed #0f766e; }
    .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f766e; font-family: 'Courier New', Courier, monospace; }
    .notice { font-size: 13px; color: #64748b; line-height: 1.5; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #99f6e4; letter-spacing: 1px;">Dwarkesh Ratna Co-op Housing Society</p>
        <h1>Password Reset Request</h1>
      </div>
      <div class="content">
        <p style="font-size: 15px; margin-top: 0;">Hello <strong>${user.name}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          We received a request to reset the login password for your Dwarkesh Ratna CHS account (<code>${user.email}</code>).
          Use the secure 6-digit verification code below to reset your password:
        </p>

        <div class="otp-card">
          <div style="font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; font-weight: 600;">Verification Code</div>
          <div class="otp-code">${otp}</div>
          <div style="font-size: 12px; color: #d97706; margin-top: 8px; font-weight: 500;">⏱️ Valid for 15 minutes</div>
        </div>

        <p class="notice">
          If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged, and your account remains secure.
        </p>
      </div>
      <div class="footer">
        Dwarkesh Ratna Co-operative Housing Society • Management Office<br>
        Support: support@dwarkeshratna.org
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
Dwarkesh Ratna CHS - Password Reset Code

Hello ${user.name},

Your password reset verification code is: ${otp}
This code is valid for 15 minutes.

If you did not request this reset, please ignore this email.

Dwarkesh Ratna CHS Management Office
  `.trim();

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: fromAddress,
      to: user.email,
      subject,
      text: textContent,
      html: htmlContent,
    });

    const logEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      to: user.email,
      name: user.name,
      subject,
      timestamp: new Date().toISOString(),
      messageId: info.messageId || 'local-reset-' + Date.now(),
      status: 'sent',
    };
    emailAuditLog.unshift(logEntry);

    return {
      success: true,
      sentTo: user.email,
      otp,
    };
  } catch (error) {
    console.error(`[EmailService] Failed to send reset email to ${user.email}:`, error.message);
    return {
      success: false,
      error: error.message,
      sentTo: user.email,
      otp,
    };
  }
};

/**
 * Get recent email audit logs
 */
const getEmailAuditLogs = () => emailAuditLog;

module.exports = {
  sendRegistrationConfirmationEmail,
  sendPasswordResetEmail,
  getEmailAuditLogs,
  generateRegistrationConfirmationHTML,
};
