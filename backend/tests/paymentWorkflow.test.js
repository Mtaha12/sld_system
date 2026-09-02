import 'dotenv/config';
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import dns from 'dns';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import express from 'express';
import cors from 'cors';
import authRoutes from '../src/routes/authRoutes.js';
import paymentRoutes from '../src/routes/paymentRoutes.js';
import errorHandler from '../src/middleware/errorMiddleware.js';

// Register models
import User from '../src/models/User.js';
import PaymentSubmission from '../src/models/PaymentSubmission.js';
import ApprovalToken from '../src/models/ApprovalToken.js';
import PaymentConfig from '../src/models/PaymentConfig.js';

// Configure DNS
dns.setServers(['8.8.8.8', '1.1.1.1']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let API_URL = '';
const MONGODB_URI = process.env.MONGODB_URI;

const rand1 = Math.floor(Math.random() * 1000000);
const rand2 = Math.floor(Math.random() * 1000000);

const testUser1 = {
  fullName: 'Payment Workflow Tester One',
  username: `pay_tester_1_${rand1}`,
  email: `pay.tester.1.${rand1}@testmail.com`,
  password: 'Password123!@#',
};

const testUser2 = {
  fullName: 'Payment Workflow Tester Two',
  username: `pay_tester_2_${rand2}`,
  email: `pay.tester.2.${rand2}@testmail.com`,
  password: 'Password123!@#',
};

let dbConnection = null;
let serverInstance = null;
let testFilesCreated = [];

// Helper to create dummy test files for upload
const createDummyFile = (filename, content = 'dummy payment receipt content', sizeBytes = null) => {
  const filePath = path.resolve(__dirname, filename);
  if (sizeBytes) {
    const buffer = Buffer.alloc(sizeBytes);
    fs.writeFileSync(filePath, buffer);
  } else {
    fs.writeFileSync(filePath, content);
  }
  testFilesCreated.push(filePath);
  return filePath;
};

before(async () => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in environment.');
  }

  dbConnection = await mongoose.connect(MONGODB_URI);
  console.log('[Test Setup] Connected to MongoDB Atlas.');

  // Create self-contained Express test app
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  app.get('/api/health', (req, res) => res.json({ success: true, status: 'online' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use(errorHandler);

  await new Promise((resolve) => {
    serverInstance = app.listen(0, () => {
      const port = serverInstance.address().port;
      API_URL = `http://localhost:${port}`;
      console.log(`[Test Setup] In-process Express test server online at ${API_URL}`);
      resolve();
    });
  });
});

after(async () => {
  // Clean up created files
  for (const f of testFilesCreated) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch (e) { /* ignore */ }
  }

  // Clean up DB records
  if (dbConnection) {
    const users = await User.find({
      email: { $in: [testUser1.email, testUser2.email] }
    });
    const userIds = users.map(u => u._id);

    const submissions = await PaymentSubmission.find({ userId: { $in: userIds } });
    const subIds = submissions.map(s => s._id);

    // Remove uploaded files
    for (const sub of submissions) {
      if (sub.filePath && fs.existsSync(sub.filePath)) {
        try { fs.unlinkSync(sub.filePath); } catch (e) { /* ignore */ }
      }
    }

    await ApprovalToken.deleteMany({
      $or: [
        { userId: { $in: userIds } },
        { paymentSubmissionId: { $in: subIds } }
      ]
    });
    await PaymentSubmission.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });

    await mongoose.disconnect();
    if (serverInstance) {
      serverInstance.close();
    }
    console.log('[Test Cleanup] Cleaned up test database records and closed test server.');
  }
});

test('1. User Registration sets status to PENDING_APPROVAL and requires OTP', async () => {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser1)
  });

  const body = await res.json();
  assert.strictEqual(res.status, 201, `Expected 201 created, got ${res.status}: ${JSON.stringify(body)}`);
  assert.strictEqual(body.success, true);

  // Verify in database
  const user = await User.findOne({ email: testUser1.email });
  assert.ok(user, 'User must exist in DB');
  assert.strictEqual(user.isVerified, false, 'User must not be verified before OTP');
  assert.strictEqual(user.status, 'PENDING_APPROVAL', 'Default status must be PENDING_APPROVAL');
  assert.ok(user.verificationCode, 'Verification code must be generated');
});

test('2. OTP Verification sets isVerified to true and keeps status as PENDING_APPROVAL without session tokens', async () => {
  const user = await User.findOne({ email: testUser1.email });
  assert.ok(user && user.verificationCode);

  const res = await fetch(`${API_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUser1.email,
      code: user.verificationCode
    })
  });

  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.status, 'PENDING_APPROVAL');
  assert.strictEqual(body.redirect, '/payment-instructions');
  assert.strictEqual(body.accessToken, undefined, 'No accessToken must be returned');

  const updatedUser = await User.findOne({ email: testUser1.email });
  assert.strictEqual(updatedUser.isVerified, true);
  assert.strictEqual(updatedUser.status, 'PENDING_APPROVAL');
});

test('3. Login blocked for PENDING_APPROVAL account with exact required message', async () => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testUser1.email,
      password: testUser1.password
    })
  });

  const body = await res.json();
  assert.strictEqual(res.status, 403, 'Login must be blocked with 403 for PENDING_APPROVAL');
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.status, 'PENDING_APPROVAL');
  assert.ok(
    body.message.includes('Your account is awaiting payment verification') &&
    body.message.includes('Please wait for approval from the administrator'),
    `Expected approval message, got: ${body.message}`
  );
  assert.strictEqual(body.accessToken, undefined, 'No token should be issued');
});

test('4. Dynamic Payment Instructions API returns active config with accounts', async () => {
  const res = await fetch(`${API_URL}/api/payment/instructions`);
  const body = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.success, true);
  assert.ok(body.data, 'Instructions data must exist');
  assert.ok(Array.isArray(body.data.bankAccounts), 'Bank accounts array must exist');
  assert.ok(body.data.bankAccounts.length > 0, 'At least one bank account must be present');
  assert.ok(body.data.bankAccounts[0].accountNumber, 'Account number must exist');
  assert.ok(body.data.bankAccounts[0].accountTitle, 'Account title must exist');
});

test('5. Payment Proof Upload rejects invalid file types and oversized files', async () => {
  // A. Invalid file type (e.g. .txt / text/plain)
  const txtFile = createDummyFile('receipt.txt', 'invalid file content');
  const formDataInvalid = new FormData();
  formDataInvalid.append('email', testUser1.email);
  formDataInvalid.append('paymentProof', new Blob([fs.readFileSync(txtFile)], { type: 'text/plain' }), 'receipt.txt');

  const resInvalid = await fetch(`${API_URL}/api/payment/upload`, {
    method: 'POST',
    body: formDataInvalid
  });
  const bodyInvalid = await resInvalid.json();
  assert.strictEqual(resInvalid.status, 400);
  assert.ok(bodyInvalid.message.includes('Invalid file type') || bodyInvalid.message.includes('JPG, PNG, and PDF'));

  // B. Oversized file (> 10MB)
  const bigFile = createDummyFile('big_receipt.png', '', 11 * 1024 * 1024); // 11MB
  const formDataBig = new FormData();
  formDataBig.append('email', testUser1.email);
  formDataBig.append('paymentProof', new Blob([fs.readFileSync(bigFile)], { type: 'image/png' }), 'big_receipt.png');

  const resBig = await fetch(`${API_URL}/api/payment/upload`, {
    method: 'POST',
    body: formDataBig
  });
  const bodyBig = await resBig.json();
  assert.strictEqual(resBig.status, 400);
  assert.ok(bodyBig.message.includes('too large') || bodyBig.message.includes('10 MB'));
});

test('6. Valid Payment Proof Upload creates PENDING_REVIEW submission & owner cryptographic tokens', async () => {
  const validFile = createDummyFile('valid_receipt.png', 'fake image binary content');
  const formData = new FormData();
  formData.append('email', testUser1.email);
  formData.append('paymentProof', new Blob([fs.readFileSync(validFile)], { type: 'image/png' }), 'valid_receipt.png');

  const res = await fetch(`${API_URL}/api/payment/upload`, {
    method: 'POST',
    body: formData
  });

  const body = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.status, 'PENDING_REVIEW');

  const user = await User.findOne({ email: testUser1.email });
  const submission = await PaymentSubmission.findOne({ userId: user._id }).sort({ createdAt: -1 });

  assert.ok(submission, 'PaymentSubmission record must be created');
  assert.strictEqual(submission.status, 'PENDING_REVIEW');
  assert.strictEqual(submission.fileName, 'valid_receipt.png');
  assert.strictEqual(submission.mimeType, 'image/png');

  // Verify single-use tokens generated
  const tokens = await ApprovalToken.find({ paymentSubmissionId: submission._id });
  assert.strictEqual(tokens.length, 3, 'Must generate APPROVE, REJECT, and VIEW_PROOF tokens');

  const approveToken = tokens.find(t => t.actionType === 'APPROVE');
  const rejectToken = tokens.find(t => t.actionType === 'REJECT');
  const proofToken = tokens.find(t => t.actionType === 'VIEW_PROOF');

  assert.ok(approveToken && approveToken.token.length >= 32);
  assert.ok(rejectToken && rejectToken.token.length >= 32);
  assert.ok(proofToken && proofToken.token.length >= 32);
  assert.strictEqual(approveToken.usedAt, null);
  assert.strictEqual(rejectToken.usedAt, null);
});

test('7. Secure Payment Proof viewing streams file inline via valid token and blocks invalid tokens', async () => {
  const user = await User.findOne({ email: testUser1.email });
  const submission = await PaymentSubmission.findOne({ userId: user._id });
  const proofTokenDoc = await ApprovalToken.findOne({ paymentSubmissionId: submission._id, actionType: 'VIEW_PROOF' });

  // Valid token
  const resValid = await fetch(`${API_URL}/api/payment/proof/${proofTokenDoc.token}`);
  assert.strictEqual(resValid.status, 200);
  assert.strictEqual(resValid.headers.get('content-type'), 'image/png');
  const text = await resValid.text();
  assert.strictEqual(text, 'fake image binary content');

  // Invalid token
  const resInvalid = await fetch(`${API_URL}/api/payment/proof/invalid_token_12345`);
  assert.strictEqual(resInvalid.status, 403);
});

test('8. Email Approval link marks token as used, activates user (ACTIVE), updates submission (APPROVED)', async () => {
  const user = await User.findOne({ email: testUser1.email });
  const submission = await PaymentSubmission.findOne({ userId: user._id });
  const approveTokenDoc = await ApprovalToken.findOne({ paymentSubmissionId: submission._id, actionType: 'APPROVE' });

  // Token metadata query
  const resInfo = await fetch(`${API_URL}/api/payment/review/token-info/${approveTokenDoc.token}`);
  const bodyInfo = await resInfo.json();
  assert.strictEqual(resInfo.status, 200);
  assert.strictEqual(bodyInfo.data.actionType, 'APPROVE');
  assert.strictEqual(bodyInfo.data.user.email, testUser1.email);

  // Execute approval
  const resApprove = await fetch(`${API_URL}/api/payment/review/approve/${approveTokenDoc.token}`, {
    method: 'POST'
  });
  const bodyApprove = await resApprove.json();
  assert.strictEqual(resApprove.status, 200);
  assert.strictEqual(bodyApprove.success, true);

  // Verify DB state
  const updatedToken = await ApprovalToken.findById(approveTokenDoc._id);
  assert.ok(updatedToken.usedAt !== null, 'Token must be marked as used');

  const updatedSub = await PaymentSubmission.findById(submission._id);
  assert.strictEqual(updatedSub.status, 'APPROVED');
  assert.ok(updatedSub.reviewedAt !== null);

  const updatedUser = await User.findById(user._id);
  assert.strictEqual(updatedUser.status, 'ACTIVE');

  // Verify token reuse is prevented
  const resReuse = await fetch(`${API_URL}/api/payment/review/approve/${approveTokenDoc.token}`, {
    method: 'POST'
  });
  const bodyReuse = await resReuse.json();
  assert.strictEqual(resReuse.status, 400);
  assert.strictEqual(bodyReuse.used, true);
});

test('9. Login allowed normally for ACTIVE user after approval', async () => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testUser1.email,
      password: testUser1.password
    })
  });

  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.success, true);
  assert.ok(body.accessToken, 'Access token must be returned');
  assert.ok(body.refreshToken, 'Refresh token must be returned');
  assert.strictEqual(body.user.email, testUser1.email);
});

test('10. Rejection workflow: sets user and submission status to REJECTED with reason, blocks login', async () => {
  // Register User 2
  await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser2)
  });

  const user2 = await User.findOne({ email: testUser2.email });
  // Verify OTP
  await fetch(`${API_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser2.email, code: user2.verificationCode })
  });

  // Upload payment proof for User 2
  const receipt2 = createDummyFile('receipt2.jpg', 'user2 receipt bytes');
  const formData2 = new FormData();
  formData2.append('email', testUser2.email);
  formData2.append('paymentProof', new Blob([fs.readFileSync(receipt2)], { type: 'image/jpeg' }), 'receipt2.jpg');

  await fetch(`${API_URL}/api/payment/upload`, {
    method: 'POST',
    body: formData2
  });

  const sub2 = await PaymentSubmission.findOne({ userId: user2._id });
  const rejectTokenDoc = await ApprovalToken.findOne({ paymentSubmissionId: sub2._id, actionType: 'REJECT' });

  // Missing reason -> 400
  const resNoReason = await fetch(`${API_URL}/api/payment/review/reject/${rejectTokenDoc.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: '' })
  });
  assert.strictEqual(resNoReason.status, 400);

  // Execute Rejection with valid reason
  const rejectionReason = 'Payment not found in bank statement. Amount PKR 15,000 missing.';
  const resReject = await fetch(`${API_URL}/api/payment/review/reject/${rejectTokenDoc.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: rejectionReason })
  });

  const bodyReject = await resReject.json();
  assert.strictEqual(resReject.status, 200);
  assert.strictEqual(bodyReject.success, true);

  // Verify DB
  const updatedUser2 = await User.findById(user2._id);
  assert.strictEqual(updatedUser2.status, 'REJECTED');

  const updatedSub2 = await PaymentSubmission.findById(sub2._id);
  assert.strictEqual(updatedSub2.status, 'REJECTED');
  assert.strictEqual(updatedSub2.rejectionReason, rejectionReason);

  // Verify login is blocked with REJECTED message and reason
  const resLogin2 = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testUser2.email,
      password: testUser2.password
    })
  });

  const bodyLogin2 = await resLogin2.json();
  assert.strictEqual(resLogin2.status, 403);
  assert.strictEqual(bodyLogin2.status, 'REJECTED');
  assert.ok(bodyLogin2.message.includes('Your payment proof was rejected'));
  assert.ok(bodyLogin2.message.includes(rejectionReason));
  assert.strictEqual(bodyLogin2.redirect, '/payment-instructions');
});

test('11. Resubmission after rejection resets status to PENDING_APPROVAL and creates new PENDING_REVIEW submission', async () => {
  const user2 = await User.findOne({ email: testUser2.email });
  assert.strictEqual(user2.status, 'REJECTED');

  // User 2 uploads new proof
  const newReceipt = createDummyFile('new_receipt.pdf', '%PDF-1.4 new valid proof');
  const formDataNew = new FormData();
  formDataNew.append('email', testUser2.email);
  formDataNew.append('paymentProof', new Blob([fs.readFileSync(newReceipt)], { type: 'application/pdf' }), 'new_receipt.pdf');

  const resNew = await fetch(`${API_URL}/api/payment/upload`, {
    method: 'POST',
    body: formDataNew
  });

  const bodyNew = await resNew.json();
  assert.strictEqual(resNew.status, 201);
  assert.strictEqual(bodyNew.data.status, 'PENDING_REVIEW');

  // Verify user status is reset to PENDING_APPROVAL
  const refreshedUser2 = await User.findById(user2._id);
  assert.strictEqual(refreshedUser2.status, 'PENDING_APPROVAL');

  // Verify new tokens generated
  const latestSub = await PaymentSubmission.findOne({ userId: user2._id }).sort({ createdAt: -1 });
  assert.strictEqual(latestSub.status, 'PENDING_REVIEW');
  assert.strictEqual(latestSub.mimeType, 'application/pdf');

  const newTokens = await ApprovalToken.find({ paymentSubmissionId: latestSub._id });
  assert.strictEqual(newTokens.length, 3);
});
