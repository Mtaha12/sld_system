import { test, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config({ override: true });

const API_URL = 'http://localhost:5000';
const MONGODB_URI = process.env.MONGODB_URI;

// Mock user tokens (we will sign them directly since we know JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_access_secret_key';

let userAToken = '';
let userBToken = '';
let userAId = new mongoose.Types.ObjectId().toString();
let userBId = new mongoose.Types.ObjectId().toString();

let sessionAId = '';

import User from '../src/models/User.js';

let createdUsers = [];

before(async () => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI env is not set.');
  }
  await mongoose.connect(MONGODB_URI);

  const rand = Math.random().toString(36).substring(7);
  
  const userA = new User({ _id: userAId, fullName: 'Test A', username: `usera_${rand}`, email: `usera_${rand}@test.com`, password: 'Password123!', role: 'User', status: 'ACTIVE', isVerified: true });
  const userB = new User({ _id: userBId, fullName: 'Test B', username: `userb_${rand}`, email: `userb_${rand}@test.com`, password: 'Password123!', role: 'User', status: 'ACTIVE', isVerified: true });
  
  await userA.save();
  await userB.save();
  createdUsers.push(userA, userB);

  userAToken = jwt.sign({ id: userAId }, JWT_SECRET, { expiresIn: '1h' });
  userBToken = jwt.sign({ id: userBId }, JWT_SECRET, { expiresIn: '1h' });
});

after(async () => {
  if (createdUsers.length > 0) {
    await User.deleteMany({ _id: { $in: createdUsers.map(u => u._id) } });
  }
  await mongoose.disconnect();
});

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

test('User A can create a session', async () => {
  const { status, data } = await makeRequest('/api/ai-chat/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}` },
    body: JSON.stringify({ sld_number: '99999' })
  });
  assert.strictEqual(status, 201, `Failed with ${status}: ${JSON.stringify(data)}`);
  assert.ok(data.id);
  sessionAId = data.id;
});

test('User A can retrieve their own session', async () => {
  const { status, data } = await makeRequest(`/api/ai-chat/sessions/${sessionAId}`, {
    headers: { Authorization: `Bearer ${userAToken}` }
  });
  assert.strictEqual(status, 200, `Failed with ${status}: ${JSON.stringify(data)}`);
  assert.strictEqual(data.id, sessionAId);
});

test('User B CANNOT retrieve User A session (Isolation Check)', async () => {
  const { status, data } = await makeRequest(`/api/ai-chat/sessions/${sessionAId}`, {
    headers: { Authorization: `Bearer ${userBToken}` }
  });
  assert.strictEqual(status, 404, `User B was incorrectly allowed to access User A session (got ${status})`);
});

test('User A can send a message', async () => {
  const { status, data } = await makeRequest(`/api/ai-chat/sessions/${sessionAId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}` },
    body: JSON.stringify({ message: "Hello AI!" })
  });
  assert.strictEqual(status, 200, `Failed to send message: ${JSON.stringify(data)}`);
  assert.ok(data.answer, 'Missing answer in response');
  assert.ok(data.sources !== undefined, 'Missing sources in response');
  assert.strictEqual(data.session_id, sessionAId);
  
  // Verify secrets are not exposed
  const strData = JSON.stringify(data);
  assert.ok(!strData.includes('testkey123'), 'API key exposed in response!');
  assert.ok(!strData.includes('mongodb+srv'), 'MongoDB URI exposed in response!');
});
