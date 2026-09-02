import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import aiChatRoutes from '../src/routes/aiChatRoutes.js';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { _id: 'test_user_id_123' };
  next();
});
app.use('/api/ai-chat', aiChatRoutes);

describe('AI Chat Proxy Routes', () => {
  const originalFetch = global.fetch;
  let server;
  let port;

  beforeEach(async () => {
    process.env.AI_CHATBOT_URL = 'http://mock-python-api.local';
    process.env.AI_CHATBOT_API_KEY = 'mock_api_key_456';
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await new Promise((resolve) => server.close(resolve));
  });

  it('POST /sessions forwards X-API-Key and X-User-ID safely', async () => {
    let capturedOptions;
    let capturedUrl;
    global.fetch = mock.fn(async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'session_999' })
      };
    });

    const response = await fetch(`http://localhost:${port}/api/ai-chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sld_number: '1234' })
    });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(capturedUrl, 'http://mock-python-api.local/api/v1/chat/sessions');
    assert.strictEqual(capturedOptions.headers['X-API-Key'], 'mock_api_key_456');
    assert.strictEqual(capturedOptions.headers['X-User-ID'], 'test_user_id_123');
    
    const responseData = await response.json();
    assert.strictEqual(responseData.id, 'session_999');
  });

  it('Handles Python API unreachability safely without leaking stack traces', async () => {
    global.fetch = mock.fn(async () => {
      throw new Error('ECONNREFUSED');
    });

    const response = await fetch(`http://localhost:${port}/api/ai-chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.strictEqual(response.status, 503);
    const responseData = await response.json();
    assert.strictEqual(responseData.success, false);
    assert.strictEqual(responseData.message, 'AI Chatbot service is unreachable');
  });

  it('Returns gracefully if AI_CHATBOT_API_KEY is missing', async () => {
    delete process.env.AI_CHATBOT_API_KEY;

    const response = await fetch(`http://localhost:${port}/api/ai-chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.strictEqual(response.status, 503);
    const responseData = await response.json();
    assert.strictEqual(responseData.success, false);
  });
});
