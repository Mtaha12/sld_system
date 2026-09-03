import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dns from 'dns';
import morgan from 'morgan';
import compression from 'compression';

// Configure public DNS servers to resolve MongoDB Atlas SRV/TXT records securely
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Configurations & Infrastructure
import connectDB from './src/config/db.js';
import errorHandler from './src/middleware/errorMiddleware.js';
import { globalLimiter, chatLimiter } from './src/middleware/rateLimiter.js';
import logger from './src/utils/logger.js';

// Routers
import authRoutes from './src/routes/authRoutes.js';
import caseRoutes from './src/routes/caseRoutes.js';
import statuteRoutes from './src/routes/statuteRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import paymentRoutes from './src/routes/paymentRoutes.js';
import aiChatRoutes from './src/routes/aiChatRoutes.js';

// Models
import mongoose from 'mongoose';
import Case from './src/models/Case.js';
import Statute from './src/models/Statute.js';
import Notification from './src/models/Notification.js';

// Services
import { sendAdminContactEmail } from './services/emailService.js';

// Establish MongoDB connection
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;
app.use(compression());

// Security & Hardening Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading local resources if needed
}));

// CORS Configuration
const allowedOrigins = new Set([
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS policy: origin not allowed'));
  },
  credentials: true,
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
app.use('/api/chat', chatLimiter);

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
app.use('/api/payment', paymentRoutes);
app.use('/api/ai-chat', aiChatRoutes);

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

// In-memory chatbot cache for instant responses
const chatCache = new Map();
let chatMetricsCache = null;
let chatMetricsCacheExpiresAt = 0;

const extractCitation = (text) => {
  const canonical = text.match(/\b([a-z]+)\s+(\d{4})\s+(\d+)\b/i);
  if (canonical) {
    return {
      magazine: canonical[1].toLowerCase(),
      year: canonical[2],
      page: canonical[3],
      value: `${canonical[1].toUpperCase()} ${canonical[2]} ${canonical[3]}`
    };
  }

  const reversed = text.match(/\b(\d{4})\s+([a-z]+)\s+(\d+)\b/i);
  if (reversed) {
    return {
      magazine: reversed[2].toLowerCase(),
      year: reversed[1],
      page: reversed[3],
      value: `${reversed[2].toUpperCase()} ${reversed[1]} ${reversed[3]}`
    };
  }

  return null;
};

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

    const cacheKey = message.trim().toLowerCase();
    if (chatCache.has(cacheKey)) {
      return res.status(200).json({
        success: true,
        reply: chatCache.get(cacheKey)
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Gemini API Key is not configured.'
      });
    }

    // Reuse metrics briefly so every question does not wait for three database queries.
    if (!chatMetricsCache || Date.now() >= chatMetricsCacheExpiresAt) {
      chatMetricsCache = await Promise.all([
        Case.countDocuments({ isDeleted: { $ne: true } }).catch(() => 0),
        Statute.countDocuments({ isDeleted: { $ne: true } }).catch(() => 0),
        Notification.countDocuments({ isDeleted: { $ne: true } }).catch(() => 0),
      ]);
      chatMetricsCacheExpiresAt = Date.now() + 30_000;
    }
    const [caseCount, statuteCount, notificationCount] = chatMetricsCache;

    // 2. Perform a text search of Case and Statute models if querying legal information
    let searchContext = "";
    const cleanQuery = cacheKey.replace(/(find|search|cases|by|about|show|me|the|statutes|statute)/g, '').trim();
    const citation = extractCitation(message);
    const isCitationQuery = Boolean(citation);
    
    if (cleanQuery.length > 2 && (isCitationQuery || cacheKey.includes('case') || cacheKey.includes('statute') || cacheKey.includes('judge') || cacheKey.includes('lawyer') || cacheKey.includes('find') || cacheKey.includes('search') || cacheKey.includes('rule') || cacheKey.includes('act'))) {
      try {
        const caseQuery = citation
          ? {
              isDeleted: { $ne: true },
              $or: [
                { mapYearPage: { $regex: `^${citation.magazine}\\s+${citation.year}\\s+${citation.page}$`, $options: 'i' } },
                { publications: { $elemMatch: {
                  mag: { $regex: `^${citation.magazine}$`, $options: 'i' },
                  year: citation.year,
                  page: citation.page
                } } }
              ]
            }
          : { $text: { $search: cleanQuery } };

        const [foundCases, foundStatutes] = await Promise.all([
          Case.find(caseQuery, citation ? {} : { score: { $meta: 'textScore' } })
          .sort(citation ? { createdAt: -1 } : { score: { $meta: 'textScore' } })
          .limit(3)
          .select('caseId sldNumber court caseNumber judges petitioners lawyers headNote principleLaw mapYearPage publications'),
          Statute.find(
            { $text: { $search: cleanQuery } }
          )
          .limit(3)
          .select('statuteId title category description')
        ]);

        if (foundCases && foundCases.length > 0) {
          searchContext += `\nTop matching cases found in database for "${citation?.value || cleanQuery}":\n` +
            foundCases.map(c => `- ID: ${c.caseId}, SLD No: ${c.sldNumber || c.caseId}, Publications: ${c.mapYearPage?.join(', ') || c.publications?.map(p => `${p.mag} ${p.year} ${p.page}`).join(', ') || 'N/A'}, Court: ${c.court || 'Supreme Court'}, Number: ${c.caseNumber?.join(', ') || 'N/A'}, Judges: ${c.judges?.join(', ') || 'N/A'}, Lawyers: ${c.lawyers?.join(', ') || 'N/A'}, Principle Law: ${c.principleLaw || 'N/A'}, Headnote excerpt: ${c.headNote?.substring(0, 200) || 'N/A'}...`).join('\n');
        }

        if (foundStatutes && foundStatutes.length > 0) {
          searchContext += `\nTop matching statutes found in database for "${cleanQuery}":\n` +
            foundStatutes.map(s => `- ID: ${s.statuteId}, Title: ${s.title}, Category: ${s.category}, Desc: ${s.description?.substring(0, 200)}...`).join('\n');
        }
      } catch (searchErr) {
        logger.error(`[Chatbot Search Error] ${searchErr.message}`);
      }
    }

    const systemPrompt = `You are the official AI Support Assistant for the SLD System (Supreme Court & High Court Law Reports Portal).
Your primary role is to assist users with portal questions, cases, statutes, law reports, notifications, legal search tips, and account settings.

CURRENT SYSTEM METRICS:
- Total Law Report Cases: ${caseCount}
- Total Statutes: ${statuteCount}
- Total Announcements/Notifications: ${notificationCount}

${searchContext ? `RELEVANT SEARCH RESULTS FROM DATABASE:\n${searchContext}\n(Note: Please use these real records to answer the user's specific query. Cite the case ID/SLD Number or Statute ID when referencing them.)` : ''}

BOUNDARIES & SCOPE RESTRICTIONS:
1. You MUST ONLY answer questions related to the SLD System website, legal documents, case law records, statutes, notifications, legal portal features, and account/support issues.
2. If a user asks a general question that is not relevant to the website (such as "what is the weather outside?", "tell me a joke", "who is the president?", "how do I cook pasta?", etc.), you MUST politely decline to answer, stating that your scope is limited strictly to assisting with the SLD System legal portal.
3. Keep your answers concise, professional, helpful, and direct.
4. Prioritize fast responses and provide the answer immediately without introductions, filler, or repeated questions.
5. Use only the information required to answer accurately. Use short bullet points only when they improve clarity.
6. Do not explain obvious concepts or provide examples unless the user asks for them.
7. If information is uncertain or unavailable, state that clearly instead of guessing.`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
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
    } catch (fetchError) {
      logger.error(`[Gemini API Request Error] ${fetchError.message}`);
      return res.status(504).json({
        success: false,
        message: 'The assistant timed out while processing your request. Please try again.'
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      logger.error(`[Gemini API Error] Status: ${response.status}. Body: ${errText}`);
      return res.status(503).json({
        success: false,
        message: 'The assistant is temporarily unavailable. Please try again in a moment.'
      });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I apologize, but I could not formulate a response. Please try again.";
    const cleanReply = replyText.trim();

    // Cache the response
    chatCache.set(cacheKey, cleanReply);
    if (chatCache.size > 200) {
      const firstKey = chatCache.keys().next().value;
      chatCache.delete(firstKey);
    }

    return res.status(200).json({
      success: true,
      reply: cleanReply
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
