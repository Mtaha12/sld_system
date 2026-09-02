import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ override: true });

/**
 * Creates and configures the Nodemailer SMTP Transporter
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
};

/**
 * Generates branded HTML email template for admin notification
 */
const generateEmailTemplate = ({ fullName, email, subject, message, receivedAt, ipAddress }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Inquiry - SLD System</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1F2937;
      background-color: #F3F4F6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #FFFFFF;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border: 1px solid #E5E7EB;
    }
    .header {
      background-color: #0B0C10;
      color: #FFFFFF;
      padding: 24px 32px;
      border-bottom: 3px solid #E55C41;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .badge {
      background-color: rgba(229, 92, 65, 0.15);
      color: #E55C41;
      border: 1px solid rgba(229, 92, 65, 0.3);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 32px;
    }
    .intro {
      font-size: 15px;
      color: #4B5563;
      margin-bottom: 24px;
    }
    .details-card {
      background-color: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .detail-row {
      display: flex;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      width: 130px;
      font-weight: 600;
      color: #6B7280;
    }
    .detail-value {
      flex: 1;
      color: #111827;
      font-weight: 500;
    }
    .message-box {
      background-color: #FFFFFF;
      border-left: 4px solid #E55C41;
      border-top: 1px solid #E5E7EB;
      border-right: 1px solid #E5E7EB;
      border-bottom: 1px solid #E5E7EB;
      border-radius: 0 8px 8px 0;
      padding: 20px;
      margin-bottom: 28px;
    }
    .message-box h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #E55C41;
    }
    .message-text {
      font-size: 14px;
      color: #1F2937;
      white-space: pre-wrap;
      line-height: 1.6;
    }
    .actions {
      text-align: center;
      margin-top: 24px;
    }
    .reply-btn {
      display: inline-block;
      background-color: #E55C41;
      color: #FFFFFF !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(229, 92, 65, 0.2);
    }
    .footer {
      background-color: #F9FAFB;
      border-top: 1px solid #E5E7EB;
      padding: 16px 32px;
      text-align: center;
      font-size: 12px;
      color: #9CA3AF;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>SLD System</h1>
        <div style="font-size: 12px; color: #9CA3AF; margin-top: 2px;">Supreme Court & High Court Law Reports Portal</div>
      </div>
      <span class="badge">Support Ticket</span>
    </div>

    <div class="content">
      <p class="intro">
        A user has submitted a support or inquiry request through the <strong>SLD System Contact Us</strong> portal.
      </p>

      <div class="details-card">
        <div class="detail-row">
          <span class="detail-label">Sender Name:</span>
          <span class="detail-value">${fullName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email Address:</span>
          <span class="detail-value"><a href="mailto:${email}" style="color: #E55C41; text-decoration: none;">${email}</a></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Category/Subject:</span>
          <span class="detail-value">${subject}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date & Time:</span>
          <span class="detail-value">${receivedAt}</span>
        </div>
        ${ipAddress ? `
        <div class="detail-row">
          <span class="detail-label">Client Origin:</span>
          <span class="detail-value">${ipAddress}</span>
        </div>
        ` : ''}
      </div>

      <div class="message-box">
        <h3>User Inquiry Description:</h3>
        <div class="message-text">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>

      <div class="actions">
        <a href="mailto:${email}?subject=Re:%20${encodeURIComponent(subject)}%20-%20SLD%20System%20Support" class="reply-btn">
          Reply Directly to ${fullName}
        </a>
      </div>
    </div>

    <div class="footer">
      This notification was automatically dispatched by the SLD System SMTP Mail Gateway.<br>
      © ${new Date().getFullYear()} SLD System. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Dispatches an email to the Administrator via configured SMTP transporter
 */
export const sendAdminContactEmail = async ({ fullName, email, subject, message, ipAddress = '' }) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sldsystem.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'SLD System Support';
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || 'support@sldsystem.com';
  const receivedAt = new Date().toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  const transporter = createTransporter();

  const emailSubject = `[SLD System Inquiry] ${subject} - from ${fullName}`;
  const htmlContent = generateEmailTemplate({ fullName, email, subject, message, receivedAt, ipAddress });
  const textContent = `
================================================================================
                           SLD SYSTEM - CONTACT INQUIRY
================================================================================
Sender Name:    ${fullName}
Email Address:  ${email}
Inquiry Topic:  ${subject}
Received Date:  ${receivedAt}
${ipAddress ? `Client IP:      ${ipAddress}\n` : ''}
--------------------------------------------------------------------------------
MESSAGE:
${message}
--------------------------------------------------------------------------------
To reply directly to the sender, reply to this email or write to: ${email}
================================================================================
  `.trim();

  // If SMTP is not yet configured with real credentials, perform simulated logging for testing
  if (!transporter) {
    console.log('\n------------------ [SMTP SIMULATION / TEST MODE] ------------------');
    console.log(`[To]: ${adminEmail}`);
    console.log(`[From]: "${fromName}" <${fromAddress}>`);
    console.log(`[Reply-To]: "${fullName}" <${email}>`);
    console.log(`[Subject]: ${emailSubject}`);
    console.log(`[Message Details]:\n${textContent}`);
    console.log('-------------------------------------------------------------------\n');
    
    return {
      success: true,
      simulated: true,
      message: 'SMTP credentials not configured in .env. Message recorded and simulated successfully.',
      data: {
        recipient: adminEmail,
        subject: emailSubject,
        sender: email,
        sentAt: receivedAt
      }
    };
  }

  // Dispatch real email via SMTP transporter
  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to: adminEmail,
    replyTo: `"${fullName}" <${email}>`,
    subject: emailSubject,
    text: textContent,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP Success] Email sent successfully to ${adminEmail}. MessageID: ${info.messageId}`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
      recipient: adminEmail,
      sentAt: receivedAt
    };
  } catch (error) {
    console.error('[SMTP Error] Failed to dispatch email via SMTP:', error);
    throw new Error(`Failed to send email via SMTP: ${error.message}`);
  }
};

/**
 * Dispatches a notification email to the System Owner when a user uploads payment proof.
 */
export const sendOwnerPaymentVerificationEmail = async ({
  userName,
  userEmail,
  registrationDate,
  uploadTimestamp,
  proofUrl,
  approveUrl,
  rejectUrl,
  fileName,
  fileSizeFormatted
}) => {
  const ownerEmail = process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL || 'admin@sldsystem.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'SLD System Verification Gateway';
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || 'support@sldsystem.com';
  const subject = 'New Account Payment Verification Request';

  const transporter = createTransporter();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Verification Request - SLD System</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1F2937; background-color: #0B0C10; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #14151A; border-radius: 12px; overflow: hidden; border: 1px solid #262833; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
    .header { background: #0B0C10; color: #FFFFFF; padding: 24px 32px; border-bottom: 3px solid #E55C41; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #FFFFFF; }
    .badge { background-color: rgba(229, 92, 65, 0.15); color: #E55C41; border: 1px solid rgba(229, 92, 65, 0.3); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .content { padding: 32px; color: #D1D5DB; }
    .card { background-color: #1A1C23; border: 1px solid #262833; border-radius: 8px; padding: 18px 20px; margin: 20px 0; }
    .row { display: flex; margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid #262833; padding-bottom: 8px; }
    .row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
    .label { width: 140px; font-weight: 600; color: #9CA3AF; }
    .val { flex: 1; color: #FFFFFF; font-weight: 500; word-break: break-all; }
    .btn-container { margin: 28px 0 16px 0; text-align: center; }
    .btn-approve { display: inline-block; background-color: #22C55E; color: #FFFFFF !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 13px 28px; border-radius: 8px; margin: 6px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3); }
    .btn-reject { display: inline-block; background-color: #EF4444; color: #FFFFFF !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 13px 28px; border-radius: 8px; margin: 6px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
    .btn-view { display: inline-block; background-color: #E55C41; color: #FFFFFF !important; text-decoration: none; font-weight: 600; font-size: 13px; padding: 10px 20px; border-radius: 8px; margin-top: 10px; }
    .footer { background-color: #0B0C10; border-top: 1px solid #262833; padding: 16px 32px; text-align: center; font-size: 12px; color: #6B7280; }
    .notice { font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <table style="width: 100%;">
        <tr>
          <td>
            <h1>SLD System</h1>
            <div style="font-size: 12px; color: #9CA3AF; margin-top: 2px;">Supreme Court & High Court Law Reports Portal</div>
          </td>
          <td style="text-align: right;">
            <span class="badge">Payment Proof</span>
          </td>
        </tr>
      </table>
    </div>

    <div class="content">
      <p style="margin-top: 0; font-size: 15px;">
        A new user has registered and submitted proof of payment for account activation.
      </p>

      <div class="card">
        <div class="row">
          <span class="label">User Name:</span>
          <span class="val">${userName}</span>
        </div>
        <div class="row">
          <span class="label">User Email:</span>
          <span class="val"><a href="mailto:${userEmail}" style="color: #E55C41; text-decoration: none;">${userEmail}</a></span>
        </div>
        <div class="row">
          <span class="label">Registered On:</span>
          <span class="val">${registrationDate}</span>
        </div>
        <div class="row">
          <span class="label">Uploaded At:</span>
          <span class="val">${uploadTimestamp}</span>
        </div>
        ${fileName ? `
        <div class="row">
          <span class="label">File Details:</span>
          <span class="val">${fileName} ${fileSizeFormatted ? `(${fileSizeFormatted})` : ''}</span>
        </div>
        ` : ''}
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <p style="margin-bottom: 8px; font-size: 14px; color: #9CA3AF;">Inspect the uploaded payment receipt:</p>
        <a href="${proofUrl}" target="_blank" class="btn-view">
          📄 View Payment Proof Document
        </a>
      </div>

      <div class="btn-container">
        <p style="margin-bottom: 12px; font-size: 14px; font-weight: 600; color: #FFFFFF;">Take Immediate Action:</p>
        <a href="${approveUrl}" class="btn-approve" target="_blank">
          ✓ Approve Account
        </a>
        <a href="${rejectUrl}" class="btn-reject" target="_blank">
          ✕ Reject Account
        </a>
      </div>

      <div class="notice">
        These single-use action links are cryptographically signed and do not require logging into the admin portal.
      </div>
    </div>

    <div class="footer">
      This notification was automatically dispatched by the SLD System Verification Gateway.<br>
      © ${new Date().getFullYear()} SLD System. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
================================================================================
               SLD SYSTEM - NEW ACCOUNT PAYMENT VERIFICATION REQUEST
================================================================================
User Name:        ${userName}
User Email:       ${userEmail}
Registered Date:  ${registrationDate}
Upload Timestamp: ${uploadTimestamp}
${fileName ? `File Name:        ${fileName}\n` : ''}
--------------------------------------------------------------------------------
1. View Uploaded Payment Proof:
   ${proofUrl}

2. APPROVE Account (Single-Click Activation):
   ${approveUrl}

3. REJECT Account (Provide Rejection Reason):
   ${rejectUrl}
================================================================================
  `.trim();

  if (!transporter) {
    console.log('\n------------------ [SMTP SIMULATION / OWNER NOTIFICATION] ------------------');
    console.log(`[To]: ${ownerEmail}`);
    console.log(`[Subject]: ${subject}`);
    console.log(`[Text Content]:\n${textContent}`);
    console.log('----------------------------------------------------------------------------\n');
    return { success: true, simulated: true };
  }

  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to: ownerEmail,
    subject,
    text: textContent,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP Success] Payment verification request sent to owner ${ownerEmail}. ID: ${info.messageId}`);
    return { success: true, simulated: false, messageId: info.messageId };
  } catch (error) {
    console.error('[SMTP Error] Failed to send owner payment verification email:', error);
    throw new Error(`Failed to send owner verification email via SMTP: ${error.message}`);
  }
};

/**
 * Dispatches an account activation confirmation email to the user when approved by the owner.
 */
export const sendUserAccountApprovedEmail = async ({ fullName, email, loginUrl }) => {
  const fromName = process.env.EMAIL_FROM_NAME || 'SLD System Administration';
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || 'support@sldsystem.com';
  const subject = 'Account Approved';

  const transporter = createTransporter();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Approved - SLD System</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1F2937; background-color: #0B0C10; margin: 0; padding: 0; }
    .container { max-width: 540px; margin: 24px auto; background: #14151A; border-radius: 12px; overflow: hidden; border: 1px solid #262833; }
    .header { background: #0B0C10; color: #FFFFFF; padding: 24px 32px; border-bottom: 3px solid #22C55E; text-align: center; }
    .content { padding: 32px; color: #D1D5DB; }
    .success-box { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .btn-login { display: inline-block; background-color: #E55C41; color: #FFFFFF !important; text-decoration: none; font-weight: bold; font-size: 15px; padding: 13px 32px; border-radius: 8px; margin-top: 10px; box-shadow: 0 4px 12px rgba(229, 92, 65, 0.3); }
    .footer { background-color: #0B0C10; border-top: 1px solid #262833; padding: 16px 32px; text-align: center; font-size: 12px; color: #6B7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px; color: #22C55E;">✓ Account Approved</h1>
      <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px;">Supreme Court & High Court Law Reports Portal</div>
    </div>
    <div class="content">
      <p>Hello <strong>${fullName}</strong>,</p>
      
      <div class="success-box">
        <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #22C55E;">
          Your payment has been verified successfully.
        </p>
        <p style="margin: 0; font-size: 14px; color: #D1D5DB;">
          Your account is now active and you may log in.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0 12px 0;">
        <a href="${loginUrl}" class="btn-login" target="_blank">
          Log In to SLD System
        </a>
      </div>

      <p style="font-size: 13px; color: #9CA3AF; text-align: center; margin-top: 24px;">
        If you experience any issues accessing your account, please reach out to our administration team at <a href="mailto:info@sldsystem.com" style="color: #E55C41;">info@sldsystem.com</a>.
      </p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} SLD System. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
Hello ${fullName},

Your payment has been verified successfully.

Your account is now active and you may log in.

Log in here: ${loginUrl}

Regards,
SLD Administration Team
  `.trim();

  if (!transporter) {
    console.log('\n------------------ [SMTP SIMULATION / ACCOUNT APPROVED] ------------------');
    console.log(`[To]: ${email}`);
    console.log(`[Subject]: ${subject}`);
    console.log(`[Text Content]:\n${textContent}`);
    console.log('--------------------------------------------------------------------------\n');
    return { success: true, simulated: true };
  }

  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to: email,
    subject,
    text: textContent,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP Success] Account approval email dispatched to ${email}. ID: ${info.messageId}`);
    return { success: true, simulated: false, messageId: info.messageId };
  } catch (error) {
    console.error(`[SMTP Error] Failed to send account approved email to ${email}:`, error);
    throw new Error(`Failed to send account approval email via SMTP: ${error.message}`);
  }
};

/**
 * Dispatches a payment rejection notification email to the user with the specified reason.
 */
export const sendUserPaymentRejectedEmail = async ({ fullName, email, rejectionReason, paymentInstructionsUrl }) => {
  const fromName = process.env.EMAIL_FROM_NAME || 'SLD System Administration';
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || 'support@sldsystem.com';
  const subject = 'Payment Verification Rejected';

  const transporter = createTransporter();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Verification Rejected - SLD System</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1F2937; background-color: #0B0C10; margin: 0; padding: 0; }
    .container { max-width: 540px; margin: 24px auto; background: #14151A; border-radius: 12px; overflow: hidden; border: 1px solid #262833; }
    .header { background: #0B0C10; color: #FFFFFF; padding: 24px 32px; border-bottom: 3px solid #EF4444; text-align: center; }
    .content { padding: 32px; color: #D1D5DB; }
    .rejection-box { background: rgba(239, 68, 68, 0.08); border-left: 4px solid #EF4444; border-top: 1px solid #262833; border-right: 1px solid #262833; border-bottom: 1px solid #262833; border-radius: 0 8px 8px 0; padding: 18px 20px; margin: 20px 0; }
    .btn-reupload { display: inline-block; background-color: #E55C41; color: #FFFFFF !important; text-decoration: none; font-weight: bold; font-size: 14px; padding: 13px 28px; border-radius: 8px; margin-top: 10px; box-shadow: 0 4px 12px rgba(229, 92, 65, 0.3); }
    .footer { background-color: #0B0C10; border-top: 1px solid #262833; padding: 16px 32px; text-align: center; font-size: 12px; color: #6B7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px; color: #EF4444;">Payment Verification Notice</h1>
      <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px;">Supreme Court & High Court Law Reports Portal</div>
    </div>
    <div class="content">
      <p>Hello <strong>${fullName}</strong>,</p>
      
      <p style="font-size: 15px;">
        Your payment proof could not be verified.
      </p>

      <div class="rejection-box">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #EF4444; margin-bottom: 6px;">
          Reason for Rejection:
        </div>
        <div style="font-size: 14px; color: #FFFFFF; font-weight: 500;">
          ${rejectionReason || 'Invalid receipt or proof not readable.'}
        </div>
      </div>

      <p style="font-size: 14px; color: #D1D5DB;">
        Please upload a new payment proof using the link below:
      </p>

      <div style="text-align: center; margin: 24px 0 12px 0;">
        <a href="${paymentInstructionsUrl}" class="btn-reupload" target="_blank">
          Upload New Payment Proof
        </a>
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} SLD System. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
Hello ${fullName},

Your payment proof could not be verified.

Reason:
${rejectionReason || 'Invalid receipt or proof not readable.'}

Please upload a new payment proof.

Upload Link: ${paymentInstructionsUrl}

Regards,
SLD Administration Team
  `.trim();

  if (!transporter) {
    console.log('\n------------------ [SMTP SIMULATION / PAYMENT REJECTED] ------------------');
    console.log(`[To]: ${email}`);
    console.log(`[Subject]: ${subject}`);
    console.log(`[Text Content]:\n${textContent}`);
    console.log('--------------------------------------------------------------------------\n');
    return { success: true, simulated: true };
  }

  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to: email,
    subject,
    text: textContent,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP Success] Payment rejected email dispatched to ${email}. ID: ${info.messageId}`);
    return { success: true, simulated: false, messageId: info.messageId };
  } catch (error) {
    console.error(`[SMTP Error] Failed to send payment rejected email to ${email}:`, error);
    throw new Error(`Failed to send payment rejection email via SMTP: ${error.message}`);
  }
};
