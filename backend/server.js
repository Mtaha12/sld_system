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
import newsRoutes from './src/routes/newsRoutes.js';
import whatsappRoutes from './src/routes/whatsappRoutes.js';
import updateRoutes from './src/routes/updateRoutes.js';
import downloadRoutes from './src/routes/downloadRoutes.js';
import youtubeRoutes from './src/routes/youtubeRoutes.js';
import settingRoutes from './src/routes/settingRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import activityRoutes from './src/routes/activityRoutes.js';
import magazineRoutes from './src/routes/magazineRoutes.js';
import courtRoutes from './src/routes/courtRoutes.js';
import ipBlockRoutes from './src/routes/ipBlockRoutes.js';
import replacementRoutes from './src/routes/replacementRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';

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
app.use('/api/news', newsRoutes);
app.use('/api/whatsapp-updates', whatsappRoutes);
app.use('/api/updates', updateRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/youtube-updates', youtubeRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/magazines', magazineRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/ip-blocks', ipBlockRoutes);
app.use('/api/replacement', replacementRoutes);
app.use('/api/admins', adminRoutes);

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

const escapeRegex = (str) => String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractCitation = (text) => {
  // Standard: MAG YEAR PAGE  e.g. "PTD 1999 2421"
  const canonical = text.match(/\b([a-z]+)\s+(\d{4})\s+(\d+)\b/i);
  if (canonical) {
    return {
      magazine: canonical[1].toLowerCase(),
      year: canonical[2],
      page: canonical[3],
      value: `${canonical[1].toUpperCase()} ${canonical[2]} ${canonical[3]}`
    };
  }

  // Reversed: YEAR MAG PAGE  e.g. "1999 PTD 2421"
  const reversed = text.match(/\b(\d{4})\s+([a-z]+)\s+(\d+)\b/i);
  if (reversed) {
    return {
      magazine: reversed[2].toLowerCase(),
      year: reversed[1],
      page: reversed[3],
      value: `${reversed[2].toUpperCase()} ${reversed[1]} ${reversed[3]}`
    };
  }

  // Volume-based (no year): MAG VOL PAGE  e.g. "103 TAX 253" or "TAX 103 253"
  const volumeBased = text.match(/\b([a-z]+)\s+(\d{1,3})\s+(\d+)\b/i);
  if (volumeBased) {
    return {
      magazine: volumeBased[1].toLowerCase(),
      year: volumeBased[2],    // treated as vol when no 4-digit year present
      page: volumeBased[3],
      value: `${volumeBased[1].toUpperCase()} ${volumeBased[2]} ${volumeBased[3]}`,
      isVolume: true
    };
  }

  // Volume reversed: VOL MAG PAGE  e.g. "103 TAX 253"
  const volumeReversed = text.match(/\b(\d{1,3})\s+([a-z]+)\s+(\d+)\b/i);
  if (volumeReversed) {
    return {
      magazine: volumeReversed[2].toLowerCase(),
      year: volumeReversed[1],
      page: volumeReversed[3],
      value: `${volumeReversed[2].toUpperCase()} ${volumeReversed[1]} ${volumeReversed[3]}`,
      isVolume: true
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
    
    // Search DB whenever we detect a citation OR any legal keyword in the message
    const shouldSearch = isCitationQuery
      || cacheKey.includes('case') || cacheKey.includes('statute')
      || cacheKey.includes('judge') || cacheKey.includes('lawyer')
      || cacheKey.includes('find') || cacheKey.includes('search')
      || cacheKey.includes('rule') || cacheKey.includes('act')
      || cacheKey.includes('explain') || cacheKey.includes('tell me')
      || cacheKey.includes('what is') || cacheKey.includes('about');

    if (cleanQuery.length > 0 && shouldSearch) {
      try {
        const caseQuery = citation
          ? {
              isDeleted: { $ne: true },
              $or: [
                { mapYearPage: { $regex: `${escapeRegex(citation.magazine)}\\s+${escapeRegex(citation.year)}\\s+${escapeRegex(citation.page)}`, $options: 'i' } },
                { publications: { $elemMatch: {
                  mag: { $regex: `^${escapeRegex(citation.magazine)}$`, $options: 'i' },
                  year: citation.year,
                  page: citation.page
                } } },
                ...(citation.isVolume ? [{ publications: { $elemMatch: {
                  mag: { $regex: `^${escapeRegex(citation.magazine)}$`, $options: 'i' },
                  vol: citation.year,
                  page: citation.page
                } } }] : [])
              ]
            }
          : { $text: { $search: cleanQuery } };

        const [foundCases, foundStatutes] = await Promise.all([
          Case.find(caseQuery, citation ? {} : { score: { $meta: 'textScore' } })
          .sort(citation ? { createdAt: -1 } : { score: { $meta: 'textScore' } })
          .limit(3)
          .select('_id caseId sldNumber court caseNumber judges petitioners lawyers headNote principleLaw mapYearPage publications'),
          Statute.find(
            { $text: { $search: cleanQuery } }
          )
          .limit(3)
          .select('statuteId title category description')
        ]);

        if (foundCases && foundCases.length > 0) {
          searchContext += `\nTop matching cases found in database for "${citation?.value || cleanQuery}":\n` +
            foundCases.map(c => {
              const docId = c._id?.toString() || c.caseId;
              return `- DOC_ID: ${docId}, SLD No: ${c.sldNumber || c.caseId}, Publications: ${c.mapYearPage?.join(', ') || c.publications?.map(p => `${p.mag} ${p.year} ${p.page}`).join(', ') || 'N/A'}, Court: ${c.court || 'Supreme Court'}, Number: ${c.caseNumber?.join(', ') || 'N/A'}, Judges: ${c.judges?.join(', ') || 'N/A'}, Lawyers: ${c.lawyers?.join(', ') || 'N/A'}, Principle Law: ${c.principleLaw || 'N/A'}, Headnote excerpt: ${c.headNote?.substring(0, 300) || 'N/A'}`;
            }).join('\n');
        }

        if (foundStatutes && foundStatutes.length > 0) {
          searchContext += `\nTop matching statutes found in database for "${cleanQuery}":\n` +
            foundStatutes.map(s => `- ID: ${s.statuteId}, Title: ${s.title}, Category: ${s.category}, Desc: ${s.description?.substring(0, 200)}...`).join('\n');
        }
      } catch (searchErr) {
        logger.error(`[Chatbot Search Error] ${searchErr.message}`);
      }
    }

    const systemPrompt = `You are the official AI Legal Assistant for the SLD System (Supreme Court & High Court Law Reports Portal of Pakistan).

Your role is to help users understand case law, statutes, and legal documents from the SLD database. When case or statute data is provided to you from the database, your job is to explain it in clear, plain language — like a legal expert explaining to a non-lawyer.

CURRENT SYSTEM METRICS:
- Total Law Report Cases: ${caseCount}
- Total Statutes: ${statuteCount}
- Total Announcements/Notifications: ${notificationCount}

${searchContext ? `CASE/STATUTE DATA FROM DATABASE:\n${searchContext}\n` : ''}

RESPONSE RULES — follow these strictly:

1. WHEN DATABASE DATA IS PROVIDED above:
   - ALWAYS write a proper explanation. Never just list raw fields.
   - Start with the citation and court, then explain what the case is about in 2-3 plain sentences.
   - Then cover: the legal question at the heart of the case, what the court decided and why, and what principle of law it establishes.
   - Use natural flowing paragraphs. You may use a short bullet list only for key facts (parties, date, judge). The main explanation must be in prose.
   - Write as if explaining to a lawyer who wants to quickly understand the case's significance.
   - IMPORTANT: At the very end of your explanation for each case, on its own line, include exactly this marker so the user can open the full document: [VIEW_CASE:DOC_ID] — replace DOC_ID with the actual DOC_ID value from the database data above. Do not add any text after this marker on the same line.

2. WHEN A CITATION IS GIVEN BUT NO DATA IS FOUND:
   - Say clearly that this citation was not found in the SLD database.
   - Do NOT give instructions on how to search the portal. The user is already using it.
   - Offer to help with a related query.

3. WHEN THE USER SENDS JUST A NUMBER OR SHORT CITATION (e.g. "103 tax 253", "PTD 1999 2421"):
   - Treat it as a case lookup request automatically. Explain the case if found.
   - Never ask the user what they want — assume they want an explanation.

4. PORTAL HELP QUESTIONS (navigation, features, account):
   - Answer directly and helpfully in a few sentences.

5. OUT OF SCOPE:
   - Politely decline anything unrelated to law, legal documents, or this portal.

6. TONE: Professional, clear, helpful. No filler phrases. No "Great question!". No "I hope this helps!".`;

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
