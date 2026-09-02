import 'dotenv/config';
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import dns from 'dns';
import bcrypt from 'bcryptjs';

import User from '../src/models/User.js';
import { forgotPassword, verifyResetOtp, resetPassword, login } from '../src/controllers/authController.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI = process.env.MONGODB_URI;

// Mock Response Helper
const createMockResponse = () => {
  const res = {
    statusCode: 200,
    jsonData: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
    send(data) {
      this.jsonData = data;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    }
  };
  return res;
};

const testUserEmail = `pw_reset_test_${Date.now()}@example.com`;
const testUsername = `pw_reset_user_${Date.now()}`;
const originalPassword = 'OriginalPassword123!';
const newPassword = 'NewSecurePassword456!';

before(async () => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }
  await mongoose.connect(MONGODB_URI);
  console.log('[Test Setup] Connected to MongoDB for Password Reset Test Suite.');

  // Create test user
  const user = new User({
    fullName: 'Password Reset Tester',
    username: testUsername,
    email: testUserEmail,
    password: originalPassword,
    isVerified: true
  });
  await user.save();
});

after(async () => {
  await User.deleteMany({ email: testUserEmail });
  await mongoose.disconnect();
  console.log('[Test Teardown] Cleaned up test user and disconnected.');
});

test('1. forgotPassword generates 6-digit OTP and sets expiration in DB', async () => {
  const req = { body: { identifier: testUserEmail } };
  const res = createMockResponse();
  const next = (err) => { if (err) throw err; };

  await forgotPassword(req, res, next);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.jsonData.success, true);
  assert.strictEqual(res.jsonData.email, testUserEmail);

  const dbUser = await User.findOne({ email: testUserEmail });
  assert.ok(dbUser.resetPasswordToken);
  assert.strictEqual(dbUser.resetPasswordToken.length, 6);
  assert.ok(dbUser.resetPasswordExpires > new Date());
});

test('2. verifyResetOtp rejects incorrect OTP code', async () => {
  const req = { body: { email: testUserEmail, otp: '000000' } };
  const res = createMockResponse();
  const next = (err) => { if (err) throw err; };

  await verifyResetOtp(req, res, next);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.jsonData.success, false);
  assert.match(res.jsonData.message, /invalid or has expired/i);
});

test('3. verifyResetOtp rejects expired OTP code', async () => {
  const dbUser = await User.findOne({ email: testUserEmail });
  const validToken = dbUser.resetPasswordToken;

  // Set expiration to 5 mins in the past
  await User.updateOne({ email: testUserEmail }, { resetPasswordExpires: new Date(Date.now() - 5 * 60 * 1000) });

  const req = { body: { email: testUserEmail, otp: validToken } };
  const res = createMockResponse();
  const next = (err) => { if (err) throw err; };

  await verifyResetOtp(req, res, next);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.jsonData.success, false);
  assert.match(res.jsonData.message, /invalid or has expired/i);

  // Restore future expiration
  await User.updateOne({ email: testUserEmail }, { resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000) });
});

test('4. verifyResetOtp succeeds with valid OTP and returns resetToken', async () => {
  const dbUser = await User.findOne({ email: testUserEmail });
  const validToken = dbUser.resetPasswordToken;

  const req = { body: { email: testUserEmail, otp: validToken } };
  const res = createMockResponse();
  const next = (err) => { if (err) throw err; };

  await verifyResetOtp(req, res, next);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.jsonData.success, true);
  assert.strictEqual(res.jsonData.resetToken, validToken);
});

test('5. resetPassword validates minimum length (8 chars) and password matching', async () => {
  const dbUser = await User.findOne({ email: testUserEmail });
  const validToken = dbUser.resetPasswordToken;

  // Short password
  const reqShort = {
    body: { email: testUserEmail, token: validToken, newPassword: '123' },
    headers: {}
  };
  const resShort = createMockResponse();
  await resetPassword(reqShort, resShort, (e) => { if (e) throw e; });
  assert.strictEqual(resShort.statusCode, 400);
  assert.match(resShort.jsonData.message, /8 characters/i);

  // Mismatched passwords
  const reqMismatch = {
    body: { email: testUserEmail, token: validToken, newPassword: 'Password123!', confirmPassword: 'DifferentPassword!' },
    headers: {}
  };
  const resMismatch = createMockResponse();
  await resetPassword(reqMismatch, resMismatch, (e) => { if (e) throw e; });
  assert.strictEqual(resMismatch.statusCode, 400);
  assert.match(resMismatch.jsonData.message, /do not match/i);
});

test('6. resetPassword securely updates and bcrypt-hashes password in database and clears OTP', async () => {
  const dbUser = await User.findOne({ email: testUserEmail });
  const validToken = dbUser.resetPasswordToken;

  const req = {
    body: {
      email: testUserEmail,
      token: validToken,
      newPassword: newPassword,
      confirmPassword: newPassword
    },
    headers: {}
  };
  const res = createMockResponse();
  await resetPassword(req, res, (e) => { if (e) throw e; });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.jsonData.success, true);
  assert.match(res.jsonData.message, /successfully updated/i);

  // Verify in MongoDB
  const updatedUser = await User.findOne({ email: testUserEmail });
  assert.strictEqual(updatedUser.resetPasswordToken, null, 'Reset token must be cleared');
  assert.strictEqual(updatedUser.resetPasswordExpires, null, 'Reset expires must be cleared');

  // Verify password is NOT plain text and is a valid bcrypt hash
  assert.notStrictEqual(updatedUser.password, newPassword, 'Password must not be stored in plain text');
  assert.ok(updatedUser.password.startsWith('$2'), 'Password must be a bcrypt hash');

  const matches = await bcrypt.compare(newPassword, updatedUser.password);
  assert.strictEqual(matches, true, 'Bcrypt hash must match the new password');
});

test('7. resetPassword rejects already-used OTP code', async () => {
  const req = {
    body: {
      email: testUserEmail,
      token: '123456',
      newPassword: 'AnotherPassword789!'
    },
    headers: {}
  };
  const res = createMockResponse();
  await resetPassword(req, res, (e) => { if (e) throw e; });

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.jsonData.success, false);
  assert.match(res.jsonData.message, /invalid, expired, or has already been used/i);
});

test('8. login verifies user can log in with new password and fails with old password', async () => {
  // Try with old password -> should fail
  const oldReq = { body: { identifier: testUserEmail, password: originalPassword } };
  const oldRes = createMockResponse();
  await login(oldReq, oldRes, (e) => { if (e) throw e; });
  assert.strictEqual(oldRes.statusCode, 401);
  assert.strictEqual(oldRes.jsonData.success, false);

  // Try with new password -> should succeed
  const newReq = { body: { identifier: testUserEmail, password: newPassword } };
  const newRes = createMockResponse();
  await login(newReq, newRes, (e) => { if (e) throw e; });
  assert.strictEqual(newRes.statusCode, 200);
  assert.strictEqual(newRes.jsonData.success, true);
  assert.ok(newRes.jsonData.accessToken);
});
