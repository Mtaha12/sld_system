import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Ensure required environment variables are set
const AI_CHATBOT_URL = process.env.AI_CHATBOT_URL || 'http://127.0.0.1:8000';
const AI_CHATBOT_API_KEY = process.env.AI_CHATBOT_API_KEY;

// Base configuration for forwarding requests
const createFetchOptions = (method, req, body = null) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': AI_CHATBOT_API_KEY || '',
    'X-User-ID': req.user._id.toString()
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return options;
};

// Handle proxying the fetch response safely
const handleFetchResponse = async (response, res) => {
  if (!response.ok) {
    let errorMessage = 'AI Chatbot error';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      // Ignore parsing error for plain text responses
    }
    logger.error(`[AI Chatbot Proxy Error] Status: ${response.status}, Detail: ${errorMessage}`);
    
    // Safely forward known error statuses, generic 500 for others
    const status = response.status >= 400 && response.status < 500 ? response.status : 500;
    return res.status(status).json({
      success: false,
      message: errorMessage
    });
  }

  const data = await response.json();
  return res.status(response.status).json(data);
};

// POST /api/ai-chat/sessions
router.post('/sessions', protect, async (req, res) => {
  if (!AI_CHATBOT_API_KEY) {
    logger.error('AI Chatbot API Key is not configured');
    return res.status(503).json({ success: false, message: 'AI Chatbot service is unavailable' });
  }

  try {
    const url = `${AI_CHATBOT_URL}/api/v1/chat/sessions`;
    const response = await fetch(url, createFetchOptions('POST', req, req.body));
    await handleFetchResponse(response, res);
  } catch (error) {
    logger.error(`[AI Chatbot Proxy Exception] ${error.message}`);
    return res.status(503).json({ success: false, message: 'AI Chatbot service is unreachable' });
  }
});

// GET /api/ai-chat/sessions
router.get('/sessions', protect, async (req, res) => {
  if (!AI_CHATBOT_API_KEY) {
    return res.status(503).json({ success: false, message: 'AI Chatbot service is unavailable' });
  }

  try {
    const url = `${AI_CHATBOT_URL}/api/v1/chat/sessions`;
    const response = await fetch(url, createFetchOptions('GET', req));
    await handleFetchResponse(response, res);
  } catch (error) {
    logger.error(`[AI Chatbot Proxy Exception] ${error.message}`);
    return res.status(503).json({ success: false, message: 'AI Chatbot service is unreachable' });
  }
});

// GET /api/ai-chat/sessions/:sessionId
router.get('/sessions/:sessionId', protect, async (req, res) => {
  if (!AI_CHATBOT_API_KEY) {
    return res.status(503).json({ success: false, message: 'AI Chatbot service is unavailable' });
  }

  try {
    const url = `${AI_CHATBOT_URL}/api/v1/chat/sessions/${req.params.sessionId}`;
    const response = await fetch(url, createFetchOptions('GET', req));
    await handleFetchResponse(response, res);
  } catch (error) {
    logger.error(`[AI Chatbot Proxy Exception] ${error.message}`);
    return res.status(503).json({ success: false, message: 'AI Chatbot service is unreachable' });
  }
});

// POST /api/ai-chat/sessions/:sessionId/messages
router.post('/sessions/:sessionId/messages', protect, async (req, res) => {
  if (!AI_CHATBOT_API_KEY) {
    return res.status(503).json({ success: false, message: 'AI Chatbot service is unavailable' });
  }

  try {
    const url = `${AI_CHATBOT_URL}/api/v1/chat/sessions/${req.params.sessionId}/messages`;
    const response = await fetch(url, createFetchOptions('POST', req, req.body));
    await handleFetchResponse(response, res);
  } catch (error) {
    logger.error(`[AI Chatbot Proxy Exception] ${error.message}`);
    return res.status(503).json({ success: false, message: 'AI Chatbot service is unreachable' });
  }
});

export default router;
