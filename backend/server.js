import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dns from 'dns';

// Configure public DNS servers to resolve MongoDB Atlas SRV/TXT records securely
dns.setServers(['8.8.8.8', '1.1.1.1']);
import dotenv from 'dotenv';
import morgan from 'morgan';

// Configurations & Infrastructure
import connectDB from './src/config/db.js';
import errorHandler from './src/middleware/errorMiddleware.js';
import { globalLimiter } from './src/middleware/rateLimiter.js';
import logger from './src/utils/logger.js';

// Routers
import authRoutes from './src/routes/authRoutes.js';
import caseRoutes from './src/routes/caseRoutes.js';
import statuteRoutes from './src/routes/statuteRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';

// Services
import { sendAdminContactEmail } from './services/emailService.js';

dotenv.config({ override: true });

// Establish MongoDB connection
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Hardening Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading local resources if needed
}));

// CORS Configuration
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request parsers
app.use(express.json({ limit: '10mb' })); // Higher limit for base64 avatars
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging Request Traffic
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Global API rate limiting
app.use('/api', globalLimiter);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'SLD System API Portal'
  });
});

// Mount Specific Feature Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/statutes', statuteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Contact Us / Support Email Dispatch Endpoint
app.post('/api/contact', async (req, res, next) => {
  try {
    const { fullName, email, subject, message } = req.body;

    // Validation checks
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'fullName', message: 'Full name is required and must be at least 2 characters.' }]
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'email', message: 'A valid email address is required.' }]
      });
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'subject', message: 'Subject/Inquiry category is required.' }]
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'message', message: 'Message is required and must be at least 10 characters.' }]
      });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';

    // Dispatch email to admin via SMTP
    const result = await sendAdminContactEmail({
      fullName: fullName.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
      ipAddress: clientIp
    });

    return res.status(200).json({
      success: true,
      message: 'Your inquiry has been successfully transmitted to the administration team.',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// AI Support Chatbot Endpoint (Gemini Integration)
app.post('/api/chat', async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Gemini API Key is not configured.'
      });
    }

    const systemPrompt = `You are the official AI Support Assistant for the SLD System (Supreme Court & High Court Law Reports Portal).
Your primary role is to assist users with portal questions, cases, statutes, law reports, notifications, legal search tips, and account settings.

BOUNDARIES & SCOPE RESTRICTIONS:
1. You MUST ONLY answer questions related to the SLD System website, legal documents, case law records, statutes, notifications, legal portal features, and account/support issues.
2. If a user asks a general question that is not relevant to the website (such as "what is the weather outside?", "tell me a joke", "who is the president?", "how do I cook pasta?", etc.), you MUST politely decline to answer, stating that your scope is limited strictly to assisting with the SLD System legal portal.
3. Keep your answers concise, professional, helpful, and direct.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: systemPrompt + "\n\nUser Question: " + message.trim()
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      logger.error(`[Gemini API Error] Status: ${response.status}. Body: ${errText}`);
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I apologize, but I could not formulate a response. Please try again.";

    return res.status(200).json({
      success: true,
      reply: replyText.trim()
    });
  } catch (error) {
    next(error);
  }
});

// Centralized Error Interceptor (Must be loaded last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`[SLD System Backend] Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  logger.info(`[SLD System Backend] Server listening on port ${PORT}`);
});

// Watch reload trigger comment
