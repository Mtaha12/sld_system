import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dns from 'dns';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { detectContentTypeForFile, getCandidateUploadRoots, resolveUploadFilePath, sanitizeUploadRelPath } from './src/utils/attachmentStorage.js';
import { buildAttachmentPreview } from './src/utils/attachmentPreview.js';
import { protect } from './src/middleware/authMiddleware.js';

// Configure public DNS servers to resolve MongoDB Atlas SRV/TXT records securely
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Configurations & Infrastructure
import connectDB from './src/config/db.js';
import errorHandler from './src/middleware/errorMiddleware.js';
import { globalLimiter, chatLimiter } from './src/middleware/rateLimiter.js';
import { sanitizeNoSql } from './src/middleware/sanitizeMiddleware.js';
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
import taxCardRoutes from './src/routes/taxCardRoutes.js';
import dictionaryRoutes from './src/routes/dictionaryRoutes.js';
import newsletterRoutes from './src/routes/newsletterRoutes.js';
import customTariffRoutes from './src/routes/customTariffRoutes.js';
import invoiceRoutes from './src/routes/invoiceRoutes.js';
import otherCaseLawRoutes from './src/routes/otherCaseLawRoutes.js';

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

// Trust reverse proxy (Nginx, Caddy, Cloudflare on VPS) so rate-limiters & IP logging work accurately
app.set('trust proxy', 1);

// Gzip / Deflate payload compression for high-speed network delivery
app.use(compression({ threshold: 1024 }));

// Security & Hardening Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading local resources if needed
}));

// CORS Configuration - Supports Vercel deployments, custom domains, and local dev
const clientEnvUrls = (process.env.CLIENT_URL || '')
  .split(',')
  .map(url => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultAllowed = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:4173'
];

const allowedOriginsSet = new Set([...clientEnvUrls, ...defaultAllowed]);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // If wildcard allowed
    if (process.env.CLIENT_URL === '*') return callback(null, true);

    // Explicitly allowed origins
    if (allowedOriginsSet.has(origin)) return callback(null, true);

    // Allow all Vercel deployments (*.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Allow local network or local testing
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // Reject credentialed requests from origins outside the allowlist.
    callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Disposition', 'Content-Type']
}));

// Request parsers
app.use(express.json({ limit: '50mb' })); // Higher limit for base64 avatars
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Strip NoSQL operator injections from query, body, and params
app.use(sanitizeNoSql);

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
app.use('/api/ai-chat', chatLimiter);

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
app.use('/api/tax-cards', taxCardRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/newsletters', newsletterRoutes);
app.use('/api/custom-tariffs', customTariffRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/other-cases', otherCaseLawRoutes);
app.use('/api/other-caselaws', otherCaseLawRoutes);

const setInlineUploadHeaders = (res, filePath) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Disposition', 'inline');
  if (filePath) {
    let headBuf = null;
    try {
      const fd = fs.openSync(filePath, 'r');
      headBuf = Buffer.alloc(16);
      fs.readSync(fd, headBuf, 0, 16, 0);
      fs.closeSync(fd);
    } catch (_) {
      headBuf = null;
    }
    const contentType = detectContentTypeForFile(filePath, headBuf);
    if (contentType && contentType !== 'application/octet-stream') {
      res.setHeader('Content-Type', contentType);
    }
  }
};

// Static uploads serving
// High-speed static uploads serving across __dirname (backend/uploads) and process.cwd()
const __serverDir = path.dirname(fileURLToPath(import.meta.url));
const staticUploadOptions = {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => setInlineUploadHeaders(res, filePath)
};
for (const uploadRoot of getCandidateUploadRoots()) {
  app.use('/uploads', express.static(uploadRoot, staticUploadOptions));
  app.use('/uploads', express.static(path.join(uploadRoot, 'reference_views'), staticUploadOptions));
  app.use('/uploads/reference_views', express.static(path.join(uploadRoot, 'reference_views'), staticUploadOptions));
}
app.use('/uploads/reference_views', express.static(path.resolve(__serverDir, 'uploads/reference_views'), staticUploadOptions));

const LEGACY_PORTAL_UPLOAD_BASE = 'https://portal.sldsystem.com/uploads/';
const MAX_LEGACY_PROXY_BYTES = 30 * 1024 * 1024;

const escapeHtmlSafe = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const tryLegacyPortalUploadFallback = async (cleanRel) => {
  if (
    !cleanRel ||
    cleanRel.includes('..') ||
    !/^(?:newsletters|reference_views)\/[a-zA-Z0-9._\-\/ ()+,@&']+$/.test(cleanRel)
  ) {
    return null;
  }
  const encodedRel = cleanRel.split('/').map(seg => encodeURIComponent(seg)).join('/');
  const remoteUrl = `${LEGACY_PORTAL_UPLOAD_BASE}${encodedRel}`;
  try {
    const upstream = await fetch(remoteUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(6000)
    });
    if (!upstream.ok) return null;

    const declaredLen = Number(upstream.headers.get('content-length') || 0);
    if (declaredLen > MAX_LEGACY_PROXY_BYTES) return null;

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_LEGACY_PROXY_BYTES) return null;

    const upstreamType = (upstream.headers.get('content-type') || '').toLowerCase();
    if (upstreamType.includes('text/html') && /\.(pdf|docx?|xlsx?|csv|png|jpe?g|webp|gif)$/i.test(cleanRel)) {
      return null;
    }

    const detectedType = detectContentTypeForFile(cleanRel, buf);
    const contentType = detectedType !== 'application/octet-stream'
      ? detectedType
      : (upstreamType || 'application/octet-stream');

    return { buf, contentType };
  } catch {
    return null;
  }
};

// Resilient fallback for any nested /uploads/* attachment path regardless of PM2 CWD
app.get(/^\/uploads\/(.+)$/, async (req, res) => {
  const matchedPath = resolveUploadFilePath(req.params[0]);
  if (matchedPath) {
    setInlineUploadHeaders(res, matchedPath);
    return res.sendFile(matchedPath);
  }

  const cleanRel = sanitizeUploadRelPath(req.params[0]);
  const legacyAsset = await tryLegacyPortalUploadFallback(cleanRel);
  if (legacyAsset) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Type', legacyAsset.contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800');
    return res.status(200).send(legacyAsset.buf);
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  const acceptHeader = String(req.headers.accept || '').toLowerCase();
  const prefersHtml = acceptHeader.includes('text/html') && !acceptHeader.startsWith('application/json');
  if (prefersHtml) {
    const safeName = escapeHtmlSafe(path.basename(cleanRel || req.params[0] || 'document'));
    const safeRel = escapeHtmlSafe(cleanRel || req.params[0] || '');
    return res.status(404).type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Document Not Found - ${safeName}</title>
  <style>
    body { margin: 0; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { max-width: 520px; width: 100%; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 28px; box-shadow: 0 10px 25px rgba(15,23,42,0.06); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #fef2f2; color: #b91c1c; font-size: 12px; font-weight: 700; margin-bottom: 12px; border: 1px solid #fecaca; }
    h1 { font-size: 18px; margin: 0 0 8px; color: #1e293b; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 12px; }
    .path { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: #f1f5f9; padding: 8px 10px; border-radius: 8px; color: #334155; word-break: break-all; margin-bottom: 16px; }
    button { background: #3d4a7a; color: #fff; border: none; padding: 9px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    button:hover { background: #2c375e; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">HTTP 404 · Attachment Not Found</div>
    <h1>Unable to open "${safeName}"</h1>
    <p>This attachment file is not currently stored on the server disk. If the link came from an archive import or draft row, please re-upload the PDF via Admin Panel &rarr; Manage Emails.</p>
    <div class="path">/uploads/${safeRel}</div>
    <button onclick="window.close()">Close Tab</button>
  </div>
</body>
</html>`);
  }

  return res.status(404).json({ success: false, message: 'Uploaded attachment file not found.' });
});

// Protected inline document preview endpoint for spreadsheets (.xlsx/.xls/.csv) and Word (.docx/.doc)
const handleAttachmentPreview = async (req, res, next) => {
  try {
    const rawPath = (req.body?.path || req.query?.path || '').toString().trim();
    const rawBase64 = (req.body?.base64 || '').toString().trim();
    const filename = (req.body?.filename || req.query?.filename || 'Document').toString().trim();
    const mimeHint = (req.body?.mimeType || req.query?.mimeType || '').toString().trim();

    let buffer = null;
    let resolvedName = filename;

    if (rawPath) {
      let cleanPath = rawPath;
      if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
        try {
          cleanPath = new URL(cleanPath).pathname;
        } catch (_) {
          return res.status(400).json({ success: false, message: 'Invalid attachment path.' });
        }
      }
      const matched = resolveUploadFilePath(cleanPath);
      if (!matched) {
        return res.status(404).json({ success: false, message: 'Attachment file not found.' });
      }
      buffer = await fs.promises.readFile(matched);
      if (!resolvedName || resolvedName === 'Document') {
        resolvedName = path.basename(matched);
      }
    } else if (rawBase64) {
      const b64Payload = rawBase64.includes(',') ? rawBase64.split(',').slice(1).join(',') : rawBase64;
      buffer = Buffer.from(b64Payload, 'base64');
    } else {
      return res.status(400).json({ success: false, message: 'Attachment path or base64 content is required.' });
    }

    const preview = buildAttachmentPreview(buffer, resolvedName, mimeHint);
    return res.status(200).json({ success: true, data: preview });
  } catch (err) {
    next(err);
  }
};
app.get('/api/attachment-preview', protect, handleAttachmentPreview);
app.post('/api/attachment-preview', protect, handleAttachmentPreview);

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

    // Reuse metrics for 5 minutes so every question does not wait for database collection scans.
    if (!chatMetricsCache || Date.now() >= chatMetricsCacheExpiresAt) {
      chatMetricsCache = await Promise.all([
        Case.estimatedDocumentCount().catch(() => Case.countDocuments({ isDeleted: false }).catch(() => 165122)),
        Statute.estimatedDocumentCount().catch(() => Statute.countDocuments({ isDeleted: false }).catch(() => 500)),
        Notification.estimatedDocumentCount().catch(() => Notification.countDocuments({ isDeleted: false }).catch(() => 11618)),
      ]);
      chatMetricsCacheExpiresAt = Date.now() + 5 * 60_000;
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
        let foundCases = [];
        const sldNumMatch = message.match(/\b(?:sld\s*(?:no\.?|#)?|case\s*(?:no\.?|#)?)\s*[:\-]?\s*(\d{1,6})\b/i) ||
          message.match(/\bCASE-(\d{1,6})\b/i) ||
          cleanQuery.match(/^(\d{1,6})$/);

        if (sldNumMatch) {
          const numStr = String(parseInt(sldNumMatch[1], 10));
          foundCases = await Case.find({
            isDeleted: false,
            $or: [
              { sldNumber: numStr },
              { sldNumberInt: parseInt(numStr, 10) },
              { caseId: new RegExp(`^CASE-0*${numStr}$`, 'i') },
              { case_id: new RegExp(`^CASE-0*${numStr}$`, 'i') }
            ]
          }).limit(5).select('_id caseId sldNumber court dated caseNumber judges petitioners lawyers headNote principleLaw mapYearPage publications judgment').lean();
        }

        if (foundCases.length === 0 && citation) {
          foundCases = await Case.find({
            isDeleted: false,
            'publications.page': String(citation.page).trim(),
            $or: [
              { mapYearPage: { $regex: `${escapeRegex(citation.magazine)}\\s+${escapeRegex(citation.year)}\\s+${escapeRegex(citation.page)}`, $options: 'i' } },
              { publications: { $elemMatch: {
                mag: { $regex: `^${escapeRegex(citation.magazine)}$`, $options: 'i' },
                year: citation.year,
                page: String(citation.page).trim()
              } } },
              ...(citation.isVolume ? [{ publications: { $elemMatch: {
                mag: { $regex: `^${escapeRegex(citation.magazine)}$`, $options: 'i' },
                vol: citation.year,
                page: String(citation.page).trim()
              } } }] : [])
            ]
          }).sort({ sldNumberInt: -1 }).limit(5).select('_id caseId sldNumber court dated caseNumber judges petitioners lawyers headNote principleLaw mapYearPage publications judgment').lean();
        }

        if (foundCases.length === 0) {
          try {
            foundCases = await Case.find(
              { $text: { $search: cleanQuery }, isDeleted: { $ne: true } },
              { score: { $meta: 'textScore' } }
            )
            .sort({ score: { $meta: 'textScore' } })
            .limit(5)
            .select('_id caseId sldNumber court dated caseNumber judges petitioners lawyers headNote principleLaw mapYearPage publications judgment')
            .lean();
          } catch (tErr) {
            // Regex search fallback
            const reg = new RegExp(escapeRegex(cleanQuery.slice(0, 30)), 'i');
            foundCases = await Case.find({
              isDeleted: { $ne: true },
              $or: [
                { caseNumber: reg },
                { judges: reg },
                { petitioners: reg },
                { headNote: reg },
                { principleLaw: reg }
              ]
            }).limit(5).select('_id caseId sldNumber court dated caseNumber judges petitioners lawyers headNote principleLaw mapYearPage publications judgment').lean();
          }
        }

        const foundStatutes = await Statute.find({ $text: { $search: cleanQuery }, isDeleted: { $ne: true } })
          .limit(3)
          .select('statuteId title category description')
          .lean()
          .catch(() => []);

        if (foundCases && foundCases.length > 0) {
          searchContext += `\nTop matching verified cases found in database (162,865 cases total) for "${citation?.value || cleanQuery}":\n` +
            foundCases.map(c => {
              const docId = c._id?.toString() || c.caseId;
              const cite = c.mapYearPage?.join(', ') || c.publications?.map(p => `${p.mag} ${p.year} ${p.page}`).join(', ') || 'N/A';
              const headSnippet = c.headNote ? c.headNote.substring(0, 450) : 'N/A';
              const judgSnippet = c.judgment ? c.judgment.substring(0, 600) : 'N/A';
              return `- SLD No: ${c.sldNumber || c.caseId}, Case ID: ${c.caseId || docId}, Publications: ${cite}, Court: ${c.court || 'Court of Record'}, Date: ${c.dated || 'N/A'}, Case Number: ${c.caseNumber?.join(', ') || 'N/A'}, Bench: ${c.judges?.join(' & ') || 'N/A'}, Parties: ${c.petitioners?.join(' vs ') || 'N/A'}, Counsel: ${c.lawyers?.join(', ') || 'N/A'}, Principle Law: ${c.principleLaw || 'N/A'}\n  Headnote: ${headSnippet}\n  Judgment Excerpt: ${judgSnippet}`;
            }).join('\n\n');
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

    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.8-flash'
    ].filter(Boolean);

    let replyText = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(12000),
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

        if (response.ok) {
          const data = await response.json();
          replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) break;
        } else {
          const errText = await response.text();
          logger.warn(`[Gemini Model ${modelName} Warning] Status: ${response.status}. Body: ${errText.slice(0, 100)}`);
        }
      } catch (err) {
        logger.warn(`[Gemini Model ${modelName} Error] ${err.message}`);
        lastError = err;
      }
    }

    if (!replyText) {
      return res.status(503).json({
        success: false,
        message: 'The assistant is temporarily unavailable. Please try again in a moment.'
      });
    }

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

// Global unhandled error resilience
process.on('uncaughtException', (err) => {
  logger.error(`[Uncaught Exception]: ${err?.message || err}`, { stack: err?.stack });
  console.error(`[Uncaught Exception]:`, err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`[Unhandled Rejection]: ${reason?.message || reason}`);
  console.error(`[Unhandled Rejection]:`, reason);
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`[SLD System Backend] Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  logger.info(`[SLD System Backend] Server listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    logger.info('Process terminated gracefully on SIGTERM');
    process.exit(0);
  });
});
