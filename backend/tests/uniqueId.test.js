import { test, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

// Models
import Case from '../src/models/Case.js';
import Notification from '../src/models/Notification.js';
import Statute from '../src/models/Statute.js';
import User from '../src/models/User.js';
import Counter from '../src/models/Counter.js';

// Utilities
import { generateUniqueId, getNextSequence } from '../src/utils/uniqueIdGenerator.js';
import { backfillAllMissingUniqueIds } from '../src/utils/backfillUniqueIds.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ override: true });

const MONGODB_URI = process.env.MONGODB_URI;

before(async () => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }
  await mongoose.connect(MONGODB_URI);
  console.log('[Test Setup] Connected to MongoDB for Unique ID Test Suite.');
});

after(async () => {
  // Clean up any test records created with prefix / test marks
  await Case.deleteMany({ court: 'Unique ID Test Court' });
  await Notification.deleteMany({ subject: 'Unique ID Test Notification' });
  await Statute.deleteMany({ law: 'Unique ID Test Law' });
  await User.deleteMany({ email: /test_unique_id_.*@example\.com/ });
  await mongoose.disconnect();
  console.log('[Test Teardown] Cleaned up test records and disconnected.');
});

test('1. Concurrency-Safe Sequence Increment', async () => {
  const testEntity = `test_counter_${Date.now()}`;
  
  // Run 20 parallel sequence requests
  const promises = Array.from({ length: 20 }, () => getNextSequence(testEntity));
  const results = await Promise.all(promises);

  // Verify all 20 numbers are unique and range from 1 to 20
  const uniqueSet = new Set(results);
  assert.strictEqual(uniqueSet.size, 20, 'All 20 atomic sequence values must be unique');
  assert.strictEqual(Math.min(...results), 1, 'Minimum sequence should be 1');
  assert.strictEqual(Math.max(...results), 20, 'Maximum sequence should be 20');

  // Clean up counter doc
  await Counter.findByIdAndDelete(testEntity);
});

test('2. Case Law auto-generates CASE-xxxxxx unique ID on creation', async () => {
  const newCase = new Case({
    court: 'Unique ID Test Court',
    department: 'tax',
    status: 'Active'
  });

  await newCase.save();

  assert.ok(newCase.caseId, 'caseId must be populated');
  assert.ok(newCase.case_id, 'case_id alias must be populated');
  assert.strictEqual(newCase.caseId, newCase.case_id, 'caseId and case_id must match');
  assert.match(newCase.caseId, /^CASE-\d{6}$/, 'caseId must match CASE-000000 format');
  assert.ok(newCase.sldNumber, 'sldNumber should have fallback value if omitted');

  await Case.findByIdAndDelete(newCase._id);
});

test('3. Notification auto-generates NOTIF-xxxxxx unique ID on creation', async () => {
  const newNotif = new Notification({
    subject: 'Unique ID Test Notification',
    department: 'Notifications',
    subDepartment: 'federal'
  });

  await newNotif.save();

  assert.ok(newNotif.notificationId, 'notificationId must be populated');
  assert.ok(newNotif.notification_id, 'notification_id alias must be populated');
  assert.strictEqual(newNotif.notificationId, newNotif.notification_id, 'notificationId and notification_id must match');
  assert.match(newNotif.notificationId, /^NOTIF-\d{6}$/, 'notificationId must match NOTIF-000000 format');

  await Notification.findByIdAndDelete(newNotif._id);
});

test('4. Statute auto-generates STAT-xxxxxx unique ID on creation', async () => {
  const newStatute = new Statute({
    law: 'Unique ID Test Law',
    department: 'tax',
    chapter: 'CHAPTER-TEST'
  });

  await newStatute.save();

  assert.ok(newStatute.statuteId, 'statuteId must be populated');
  assert.ok(newStatute.statute_id, 'statute_id alias must be populated');
  assert.strictEqual(newStatute.statuteId, newStatute.statute_id, 'statuteId and statute_id must match');
  assert.match(newStatute.statuteId, /^STAT-\d{6}$/, 'statuteId must match STAT-000000 format');

  await Statute.findByIdAndDelete(newStatute._id);
});

test('5. User auto-generates USER-xxxxxx unique ID on creation', async () => {
  const rand = Math.floor(Math.random() * 1000000);
  const newUser = new User({
    fullName: 'Unique ID Test User',
    username: `unique_user_${rand}`,
    email: `test_unique_id_${rand}@example.com`,
    password: 'Password123!'
  });

  await newUser.save();

  assert.ok(newUser.userId, 'userId must be populated');
  assert.ok(newUser.user_id, 'user_id alias must be populated');
  assert.strictEqual(newUser.userId, newUser.user_id, 'userId and user_id must match');
  assert.match(newUser.userId, /^USER-\d{6}$/, 'userId must match USER-000000 format');

  await User.findByIdAndDelete(newUser._id);
});

test('6. High-concurrency record creation produces zero duplicate IDs', async () => {
  const CONCURRENT_COUNT = 25;
  
  const creationPromises = Array.from({ length: CONCURRENT_COUNT }, (_, i) => {
    const caseDoc = new Case({
      court: 'Unique ID Test Court',
      department: 'tax',
      headNote: `Concurrent Test Case ${i}`
    });
    return caseDoc.save();
  });

  const createdCases = await Promise.all(creationPromises);

  const ids = createdCases.map(c => c.caseId);
  const uniqueIds = new Set(ids);

  assert.strictEqual(uniqueIds.size, CONCURRENT_COUNT, `All ${CONCURRENT_COUNT} concurrent cases must have unique IDs`);

  for (const c of createdCases) {
    assert.match(c.caseId, /^CASE-\d{6}$/);
    await Case.findByIdAndDelete(c._id);
  }
});

test('7. System-wide backfill utility safely assigns IDs and syncs counters', async () => {
  const results = await backfillAllMissingUniqueIds();
  
  assert.ok(results.cases !== undefined, 'Cases backfill result should exist');
  assert.ok(results.notifications !== undefined, 'Notifications backfill result should exist');
  assert.ok(results.statutes !== undefined, 'Statutes backfill result should exist');
  assert.ok(results.users !== undefined, 'Users backfill result should exist');

  // Verify counter has non-zero or appropriate sequence
  const caseCounter = await Counter.findById('case');
  if (caseCounter) {
    assert.ok(caseCounter.seq >= results.cases.currentMaxSeq);
  }
});
