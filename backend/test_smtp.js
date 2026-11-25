/**
 * SLD System - Enhanced SMTP Diagnostic and Verification Tool
 * 
 * Usage:
 *   node test_smtp.js
 *   node test_smtp.js "custom app password"
 *   node test_smtp.js "custom app password" "custom_email@gmail.com"
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

const customPassArg = process.argv[2];
const customUserArg = process.argv[3];

const user = (customUserArg || process.env.SMTP_USER || 'haroonarafiq@gmail.com').trim().replace(/["']/g, '');
const pass = (customPassArg || process.env.SMTP_PASS || '').trim().replace(/\s+/g, '').replace(/["']/g, '');
const adminEmail = (process.env.ADMIN_EMAIL || process.env.OWNER_EMAIL || user || 'haroonarafiq@gmail.com').trim().replace(/["']/g, '');

console.log('================================================================');
console.log('       SLD SYSTEM - ENHANCED SMTP DIAGNOSTIC TOOL               ');
console.log('================================================================');
console.log(`SMTP Service:   Google Mail (smtp.gmail.com)`);
console.log(`SMTP User:      ${user}`);
console.log(`Recipient:      ${adminEmail}`);
console.log(`Password:       ${pass ? pass.slice(0, 4) + ' **** **** ' + pass.slice(-4) + ' (length: ' + pass.length + ' chars)' : 'NOT CONFIGURED'}`);
console.log('----------------------------------------------------------------\n');

if (!pass) {
  console.error(' ERROR: No App Password found. Please set SMTP_PASS in backend/.env');
  console.log(' Or run: node test_smtp.js "xxxx xxxx xxxx xxxx"');
  process.exit(1);
}

const configurations = [
  {
    name: 'Method 1: Direct SSL (Port 465) [Best for Cloud VPS]',
    transportOptions: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    }
  },
  {
    name: 'Method 2: Standard Gmail Service (smtp.gmail.com)',
    transportOptions: {
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    }
  },
  {
    name: 'Method 3: STARTTLS (Port 587)',
    transportOptions: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    }
  }
];

async function trySend(transporter, methodName) {
  const info = await transporter.sendMail({
    from: `"SLD Legal AI Intelligence" <${user}>`,
    to: adminEmail,
    subject: `[SLD AI Chat SMTP Test] Successful Connection @ ${new Date().toLocaleTimeString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #ea580c; margin-top: 0;">SLD Legal AI - Email Alert Verified</h2>
        <p><strong>Hello Haroon,</strong></p>
        <p>Your Google SMTP configuration is working correctly from your VPS server!</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #ea580c; padding: 12px 16px; margin: 16px 0;">
          <strong>Account:</strong> ${user}<br>
          <strong>Method:</strong> ${methodName}<br>
          <strong>Time:</strong> ${new Date().toLocaleString()}
        </div>
        <p style="color: #64748b; font-size: 13px;">AI Chatbot query alerts will now be delivered automatically to this inbox.</p>
      </div>
    `
  });
  return info;
}

async function runDiagnostics() {
  let success = false;

  for (const config of configurations) {
    console.log(`\nTesting ${config.name}...`);
    try {
      const transporter = nodemailer.createTransport(config.transportOptions);
      await transporter.verify();
      console.log(`   ${config.name}: AUTHENTICATION SUCCESSFUL!`);

      console.log(`  Sending test email to ${adminEmail}...`);
      const info = await trySend(transporter, config.name);
      console.log(`   EMAIL DELIVERED SUCCESSFULLY!`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`\n================================================================`);
      console.log(` SUCCESS: Emails are fully functional via ${config.name}!`);
      console.log(`================================================================\n`);
      success = true;
      break;
    } catch (err) {
      console.log(`   ${config.name} Failed.`);
      console.log(`     Error Code: ${err.code || 'N/A'}`);
      console.log(`     Server Response: ${err.response || err.message}`);
    }
  }

  if (!success) {
    console.log('\n================================================================');
    console.log('               WHY GOOGLE IS REJECTING THE PASSWORD             ');
    console.log('================================================================');
    console.log('\n Google reported [535 BadCredentials]. Here are the exact solutions:\n');
    console.log(' 1. VPS IP SECURITY CHALLENGE (MOST COMMON FOR VPS SERVERS):');
    console.log('    Because your VPS is connecting from a new IP/datacenter, Google blocks it.');
    console.log('    -> Check your Gmail inbox for a "Critical security alert: Sign-in attempt blocked".');
    console.log('       Open it and click "YES, IT WAS ME".');
    console.log('    -> ALSO open this link in your browser while logged into ' + user + ':');
    console.log('       https://accounts.google.com/DisplayUnlockCaptcha');
    console.log('       Click "Continue". This unlocks access for 10 minutes for your VPS.');
    console.log('\n 2. GOOGLE ACCOUNT MISMATCH:');
    console.log('    Make sure you generated the app password under the EXACT account: ' + user);
    console.log('    If you have multiple Google accounts logged into your browser, check the avatar');
    console.log('    in top right of https://myaccount.google.com/apppasswords to ensure it is ' + user);
    console.log('\n 3. 2-STEP VERIFICATION MUST BE ACTIVE:');
    console.log('    Ensure 2-Step Verification is ON at:');
    console.log('    https://myaccount.google.com/signinoptions/two-step-verification');
    console.log('================================================================\n');
  }
}

runDiagnostics();
