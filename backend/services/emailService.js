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
