import { test, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

// Import models to register schemas for Mongoose instance in test process
import User from '../src/models/User.js';
import Case from '../src/models/Case.js';
import Statute from '../src/models/Statute.js';
import Notification from '../src/models/Notification.js';

// Configure DNS to avoid Atlas ETIMEOUT lookups
dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config({ override: true });

const API_URL = 'http://localhost:5000';
const MONGODB_URI = process.env.MONGODB_URI;

// Mock user credentials
const rand = Math.floor(Math.random() * 100000);
const testAdmin = {
  fullName: 'Test Auditor Admin',
  username: `audit_admin_${rand}`,
  email: `audit.admin.${rand}@test.com`,
  password: 'SecurePassword123!',
};

const testUser = {
  fullName: 'Test Auditor User',
  username: `audit_user_${rand}`,
  email: `audit.user.${rand}@test.com`,
  password: 'SecurePassword123!',
};

let dbConnection = null;
let adminTokens = { accessToken: '', refreshToken: '' };
let userTokens = { accessToken: '', refreshToken: '' };
let testCaseId = '';
let testStatuteId = '';
let testNotificationId = '';

before(async () => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI env is not set.');
  }
  dbConnection = await mongoose.connect(MONGODB_URI);
  console.log('[Test Setup] Connected to Atlas MongoDB database.');

  // Wait for the Express server to fully boot up and connect to Atlas
  console.log('[Test Setup] Waiting for API Server to come online on port 5000...');
  let retries = 20;
  let online = false;
  while (retries > 0) {
    try {
      const res = await fetch(`${API_URL}/api/health`);
      if (res.status === 200) {
        online = true;
        console.log('[Test Setup] API Server is online and ready.');
        break;
      }
    } catch (e) {
      // Server still starting
    }
    retries--;
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!online) {
    throw new Error('[Test Setup] Timeout: API Server failed to respond on port 5000.');
  }
});

after(async () => {
  if (dbConnection) {
    console.log('[Test Cleanup] Deleting test records...');
    const collections = mongoose.connection.collections;
    
    await collections.users.deleteMany({
      email: { $in: [testAdmin.email, testUser.email] }
    });
    await collections.cases.deleteMany({
      sldNumber: { $regex: /^audit_/ }
    });
    await collections.statutes.deleteMany({
      srNumber: { $regex: /^audit_/ }
    });
    await collections.notifications.deleteMany({
      srNumber: { $regex: /^audit_/ }
    });

    await mongoose.disconnect();
    console.log('[Test Cleanup] Cleaned up Atlas test data and disconnected.');
  }
});

// Helper for making API calls
const makeRequest = async (path, options = {}) => {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await response.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { rawText: text };
  }
  return { status: response.status, data };
};

// Safe wrapper for logging assertion details on failure
const runTest = (name, fn) => {
  test(name, async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`\n=============================================`);
      console.error(`[TEST FAIL] ${name}`);
      console.error(`Error:`, err);
      console.error(`=============================================\n`);
      throw err;
    }
  });
};

// ----------------------------------------------------------------------------
// 1. HEALTH AND INFRASTRUCTURE
// ----------------------------------------------------------------------------
runTest('GET /api/health - Returns API health and online status', async () => {
  const { status, data } = await makeRequest('/api/health');
  assert.strictEqual(status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.status, 'online');
});

// ----------------------------------------------------------------------------
// 2. USER REGISTRATION AND OTP VERIFICATION FLOW
// ----------------------------------------------------------------------------
runTest('POST /api/auth/signup - Registers standard user', async () => {
  const { status, data } = await makeRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(testUser),
  });
  
  assert.strictEqual(status, 201, `Failed signup status: ${status}. Data: ${JSON.stringify(data)}`);
  assert.strictEqual(data.success, true);

  const User = mongoose.model('User');
  const user = await User.findOne({ email: testUser.email });
  assert.ok(user);
  assert.strictEqual(user.isVerified, false);
  assert.ok(user.verificationCode);
});

runTest('POST /api/auth/signup - Registers admin user', async () => {
  const { status, data } = await makeRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(testAdmin),
  });
  
  assert.strictEqual(status, 201, `Failed signup admin status: ${status}. Data: ${JSON.stringify(data)}`);
  assert.strictEqual(data.success, true);

  const User = mongoose.model('User');
  await User.updateOne({ email: testAdmin.email }, { role: 'Administrator' });
});

runTest('POST /api/auth/verify-email - Verifies users using DB generated OTP', async () => {
  const User = mongoose.model('User');
  
  const admin = await User.findOne({ email: testAdmin.email });
  assert.ok(admin, 'Admin not found in DB before verification');
  const adminRes = await makeRequest('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ code: admin.verificationCode, email: testAdmin.email }),
  });
  assert.strictEqual(adminRes.status, 200, `Admin verification status error: ${adminRes.status}. Data: ${JSON.stringify(adminRes.data)}`);
  assert.strictEqual(adminRes.data.success, true);

  const user = await User.findOne({ email: testUser.email });
  assert.ok(user, 'User not found in DB before verification');
  const userRes = await makeRequest('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ code: user.verificationCode, email: testUser.email }),
  });
  assert.strictEqual(userRes.status, 200, `User verification status error: ${userRes.status}. Data: ${JSON.stringify(userRes.data)}`);
  assert.strictEqual(userRes.data.success, true);

  const adminUpdated = await User.findOne({ email: testAdmin.email });
  const userUpdated = await User.findOne({ email: testUser.email });
  assert.strictEqual(adminUpdated.isVerified, true);
  assert.strictEqual(userUpdated.isVerified, true);
});

// ----------------------------------------------------------------------------
// 3. AUTHENTICATION AND LOGINS
// ----------------------------------------------------------------------------
runTest('POST /api/auth/login - Fails with invalid credentials', async () => {
  const { status, data } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: testAdmin.email, password: 'WrongPassword!' }),
  });
  assert.strictEqual(status, 401);
  assert.strictEqual(data.success, false);
});

runTest('POST /api/auth/login - Succeeds with correct credentials', async () => {
  const adminRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: testAdmin.email, password: testAdmin.password }),
  });
  assert.strictEqual(adminRes.status, 200, `Admin login error: ${adminRes.status}. Data: ${JSON.stringify(adminRes.data)}`);
  assert.ok(adminRes.data.accessToken);
  assert.ok(adminRes.data.refreshToken);
  assert.strictEqual(adminRes.data.user.role, 'Administrator');
  adminTokens = { accessToken: adminRes.data.accessToken, refreshToken: adminRes.data.refreshToken };

  const userRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: testUser.email, password: testUser.password }),
  });
  assert.strictEqual(userRes.status, 200, `User login error: ${userRes.status}. Data: ${JSON.stringify(userRes.data)}`);
  
  const User = mongoose.model('User');
  await User.updateOne({ email: testUser.email }, { role: 'User' });
  
  const userRes2 = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: testUser.email, password: testUser.password }),
  });
  assert.strictEqual(userRes2.data.user.role, 'User');
  userTokens = { accessToken: userRes2.data.accessToken, refreshToken: userRes2.data.refreshToken };
});

runTest('GET /api/auth/me - Blocked when unauthenticated', async () => {
  const { status } = await makeRequest('/api/auth/me');
  assert.strictEqual(status, 401);
});

runTest('GET /api/auth/me - Succeeds when token is attached', async () => {
  const { status, data } = await makeRequest('/api/auth/me', {
    headers: { Authorization: `Bearer ${adminTokens.accessToken}` }
  });
  assert.strictEqual(status, 200);
  assert.strictEqual(data.data.email, testAdmin.email);
});

// ----------------------------------------------------------------------------
// 4. ROLE-BASED ACCESS CONTROL (RBAC) & CASE CRUD OPERATIONS
// ----------------------------------------------------------------------------
runTest('POST /api/cases - User role is blocked from creating cases (403)', async () => {
  const payload = {
    srNumber: `audit_case_${rand}`,
    court: 'Supreme Court of Pakistan',
    caseNumber: 'C.P. 123/2026',
    judges: 'Judge A, Judge B',
    lawyers: 'Advocate X, Advocate Y',
    petitioners: 'Petitioner A',
    headNote: 'Constitutional write test.',
    judgment: 'Judgment detail text.',
    publications: [{ mag: 'SLD', year: 2026, page: 500 }],
    laws: [{ lawStatute: 'Constitution of Pakistan', section: '184(3)' }]
  };

  const { status } = await makeRequest('/api/cases', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userTokens.accessToken}` },
    body: JSON.stringify(payload)
  });
  assert.strictEqual(status, 403);
});

runTest('POST /api/cases - Admin role succeeds in creating case (201)', async () => {
  const payload = {
    srNumber: `audit_case_${rand}`,
    court: 'Supreme Court of Pakistan',
    caseNumber: 'C.P. 123/2026',
    judges: 'Judge A, Judge B',
    lawyers: 'Advocate X, Advocate Y',
    petitioners: 'Petitioner A',
    headNote: 'Constitutional write test.',
    judgment: 'Judgment detail text.',
    publications: [{ mag: 'SLD', year: 2026, page: 500 }],
    laws: [{ lawStatute: 'Constitution of Pakistan', section: '184(3)' }]
  };

  const { status, data } = await makeRequest('/api/cases', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
    body: JSON.stringify(payload)
  });
  
  assert.strictEqual(status, 201, `Create case status error: ${status}. Data: ${JSON.stringify(data)}`);
  assert.strictEqual(data.success, true);
  assert.ok(data.data.id);
  testCaseId = data.data.id;

  const Case = mongoose.model('Case');
  const dbCase = await Case.findById(testCaseId);
  assert.ok(dbCase);
  assert.strictEqual(dbCase.sldNumber, payload.srNumber);
});

runTest('GET /api/cases - Lists cases and filters properly', async () => {
  const { status, data } = await makeRequest('/api/cases', {
    headers: { Authorization: `Bearer ${userTokens.accessToken}` }
  });
  assert.strictEqual(status, 200);
  assert.ok(data.data.length > 0);
  
  const found = data.data.find(c => c.sldNumber === `audit_case_${rand}`);
  assert.ok(found);
});

runTest('PUT /api/cases/:id - Updates case details', async () => {
  const updatePayload = {
    court: 'Updated High Court',
    status: 'Inactive'
  };

  const { status, data } = await makeRequest(`/api/cases/${testCaseId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
    body: JSON.stringify(updatePayload)
  });

  assert.strictEqual(status, 200);
  assert.strictEqual(data.data.court, 'Updated High Court');

  const Case = mongoose.model('Case');
  const dbCase = await Case.findById(testCaseId);
  assert.strictEqual(dbCase.court, 'Updated High Court');
  assert.strictEqual(dbCase.status, 'Inactive');
});

runTest('DELETE /api/cases/:id - Performs persistent soft delete', async () => {
  const { status } = await makeRequest(`/api/cases/${testCaseId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminTokens.accessToken}` }
  });
  assert.strictEqual(status, 200);

  const Case = mongoose.model('Case');
  const dbCaseClean = await Case.findById(testCaseId);
  assert.strictEqual(dbCaseClean, null);

  const dbCaseSoftDeleted = await Case.collection.findOne({ _id: new mongoose.Types.ObjectId(testCaseId) });
  assert.ok(dbCaseSoftDeleted);
  assert.strictEqual(dbCaseSoftDeleted.isDeleted, true);
  assert.ok(dbCaseSoftDeleted.deletedAt);
});

// ----------------------------------------------------------------------------
// 5. STATUTES CRUD OPERATIONS
// ----------------------------------------------------------------------------
runTest('POST /api/statutes - Admin creates statute', async () => {
  const payload = {
    srNumber: `audit_statute_${rand}`,
    law: 'Income Tax Ordinance, 2001',
    chapter: 'Part III',
    section: 'Part 12A',
    heading: 'Tax Assessments',
    blocks: [
      {
        sectionHeading: 'Assessments',
        fromDate: '2026-01-01',
        detail: 'Assessments detailed guidelines.'
      }
    ]
  };

  const { status, data } = await makeRequest('/api/statutes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(status, 201);
  assert.strictEqual(data.data.srNumber, payload.srNumber);
  testStatuteId = data.data.mongoId;
});

runTest('DELETE /api/statutes/:id - Performs persistent soft delete', async () => {
  const { status } = await makeRequest(`/api/statutes/${testStatuteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminTokens.accessToken}` }
  });
  assert.strictEqual(status, 200);

  const Statute = mongoose.model('Statute');
  const dbStatute = await Statute.collection.findOne({ _id: new mongoose.Types.ObjectId(testStatuteId) });
  assert.ok(dbStatute);
  assert.strictEqual(dbStatute.isDeleted, true);
});

// ----------------------------------------------------------------------------
// 6. NOTIFICATIONS CRUD OPERATIONS
// ----------------------------------------------------------------------------
runTest('POST /api/notifications - Admin creates notification', async () => {
  const payload = {
    srNumber: `audit_notif_${rand}`,
    number: 'SRO 123(I)/2026',
    year: 2026,
    sroNumber: '123',
    subject: 'Notification on Sales Tax exemptions',
    lawStatute: 'Sales Tax Act, 1990',
    section: 'Section 13',
    blocks: [{ date: '2026-08-27', detail: 'SRO contents' }]
  };

  const { status, data } = await makeRequest('/api/notifications', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(status, 201);
  assert.strictEqual(data.data.srNumber, payload.srNumber);
  testNotificationId = data.data.mongoId;
});

runTest('DELETE /api/notifications/:id - Performs persistent soft delete', async () => {
  const { status } = await makeRequest(`/api/notifications/${testNotificationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminTokens.accessToken}` }
  });
  assert.strictEqual(status, 200);

  const Notification = mongoose.model('Notification');
  const dbNotif = await Notification.collection.findOne({ _id: new mongoose.Types.ObjectId(testNotificationId) });
  assert.ok(dbNotif);
  assert.strictEqual(dbNotif.isDeleted, true);
});

// ----------------------------------------------------------------------------
// 7. DASHBOARD METRICS AND PROFILE SETTINGS
// ----------------------------------------------------------------------------
runTest('GET /api/dashboard/metrics - Calculates dynamic counts successfully', async () => {
  const { status, data } = await makeRequest('/api/dashboard/metrics', {
    headers: { Authorization: `Bearer ${adminTokens.accessToken}` }
  });
  assert.strictEqual(status, 200);
  assert.ok(data.data.totalCases);
  assert.ok(data.data.totalStatutes);
});

runTest('GET /api/dashboard/activities - Generates audit log timeline', async () => {
  const { status, data } = await makeRequest('/api/dashboard/activities', {
    headers: { Authorization: `Bearer ${adminTokens.accessToken}` }
  });
  assert.strictEqual(status, 200);
  assert.ok(Array.isArray(data.data));
});

runTest('POST /api/auth/refresh-token - Renews expired sessions', async () => {
  const { status, data } = await makeRequest('/api/auth/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ token: adminTokens.refreshToken })
  });
  assert.strictEqual(status, 200);
  assert.ok(data.accessToken);
});
