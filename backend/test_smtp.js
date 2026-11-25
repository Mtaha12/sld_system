/**
 * SLD System - SMTP Diagnostic and Verification Tool
 * 
 * Usage:
 *   node test_smtp.js
 *   node test_smtp.js [custom_app_password]
 * 
 * Tests connection to Google SMTP and attempts delivery of a test AI Chat alert
 * to the owner email (haroonarafiq@gmail.com).
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

function resolveModule(moduleName) {
  const candidatePaths = [
    moduleName,
    path.resolve(__dirname, 'node_modules', moduleName),
    path.resolve(__dirname, '..', 'node_modules', moduleName),
    path.resolve(__dirname, 'backend', 'node_modules', moduleName),
    path.resolve(__dirname, '..', 'backend', 'node_modules', moduleName)
  ];
  for (const p of candidatePaths) {
    try {
      return require(p);
    } catch (_) {}
  }
  throw new Error(`Unable to resolve required module "${moduleName}".`);
}

const dotenv = resolveModule('dotenv');
const nodemailer = resolveModule('nodemailer');

// Load environment variables
const envPaths = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, 'backend', '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', 'backend', '.env')
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const customPass = process.argv[2];
const user = (process.env.SMTP_USER || 'haroonarafiq@gmail.com').trim();
const pass = (customPass || process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');
const adminEmail = (process.env.ADMIN_EMAIL || process.env.OWNER_EMAIL || user || 'haroonarafiq@gmail.com').trim();

console.log('================================================================');
console.log('            SLD SYSTEM - SMTP CONFIGURATION TEST                ');
console.log('================================================================');
console.log(`SMTP Service:   Gmail (smtp.gmail.com)`);
console.log(`SMTP Account:   ${user}`);
console.log(`Recipient:      ${adminEmail}`);
console.log(`App Password:   ${pass ? pass.slice(0, 4) + ' **** **** ' + pass.slice(-4) + ' (length: ' + pass.length + ')' : 'NOT CONFIGURED'}`);
console.log('----------------------------------------------------------------\n');

if (!pass) {
  console.error(' ERROR: No App Password provided in backend/.env (SMTP_PASS)');
  console.log('\nSteps to resolve:');
  console.log('1. Go to https://myaccount.google.com/apppasswords');
  console.log('2. Sign in with ' + user);
  console.log('3. Create an App password named "SLD System"');
  console.log('4. Put the 16-character code in backend/.env under SMTP_PASS');
  console.log('   or run: node test_smtp.js "xxxx xxxx xxxx xxxx"');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user, pass }
});

async function runTest() {
  console.log('Verifying SMTP credentials with Google Mail servers...');
  try {
    await transporter.verify();
    console.log(' SMTP Authentication Successful!\n');

    console.log(`Sending sample AI Chat Alert email to ${adminEmail}...`);
    const info = await transporter.sendMail({
      from: `"SLD Legal AI Intelligence" <${user}>`,
      to: adminEmail,
      subject: `[SLD AI Chat Test] Notification Test @ ${new Date().toLocaleTimeString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0f172a; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; color: #ea580c;">SLD Legal AI Intelligence</h2>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">Email Dispatch & Notification Test</p>
          </div>
          <div style="padding: 24px;">
            <p><strong>Hello Admin,</strong></p>
            <p>This is a verification test to confirm that AI Chat query and answer notifications are reaching your email inbox successfully.</p>
            <div style="background: #f8fafc; border-left: 4px solid #ea580c; padding: 12px 16px; margin: 16px 0;">
              <strong>Status:</strong> Active & Connected<br>
              <strong>Timestamp:</strong> ${new Date().toLocaleString()}<br>
              <strong>Receiver:</strong> ${adminEmail}
            </div>
            <p style="font-size: 13px; color: #64748b;">Whenever any user queries the SLD AI Chatbot, a full audit of their prompt and the generated legal response will be emailed to you automatically.</p>
          </div>
        </div>
      `
    });

    console.log(' Email delivered successfully!');
    console.log(`Message ID: ${info.messageId}`);
    console.log('Please check your inbox at:', adminEmail);
  } catch (error) {
    console.error('\n SMTP Delivery Error:');
    if (error.code === 'EAUTH' || (error.message && error.message.includes('BadCredentials'))) {
      console.error(' [535 BadCredentials]: Google rejected the username/app password combination.');
      console.log('\n How to generate a new Google App Password:');
      console.log(' 1. Make sure 2-Step Verification is ON in your Google Account:');
      console.log('    https://myaccount.google.com/signinoptions/two-step-verification');
      console.log(' 2. Open Google App Passwords:');
      console.log('    https://myaccount.google.com/apppasswords');
      console.log(' 3. Create a new password (e.g. named "SLD System")');
      console.log(' 4. Copy the generated 16-character code (example: abcd efgh ijkl mnop)');
      console.log(' 5. Update backend/.env with:');
      console.log('    SMTP_PASS="abcd efgh ijkl mnop"');
      console.log(' 6. Test again with: node test_smtp.js');
    } else {
      console.error(error.message || error);
    }
  }
}

runTest();
