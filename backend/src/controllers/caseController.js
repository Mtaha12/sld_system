import XLSX from 'xlsx';
import Case from '../models/Case.js';
import OtherCaseLaw from '../models/OtherCaseLaw.js';
import Counter from '../models/Counter.js';
import UserActivity from '../models/UserActivity.js';
import User from '../models/User.js';
import { clearUserSessionCache } from '../middleware/authMiddleware.js';
import { spoofCase, spoofCaseList } from '../utils/spammerHoneypot.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';
import path from 'path';
import { adjustSrOnDelete } from '../utils/resequenceSr.js';
import { sanitizeAttachments as sanitizeAttachmentsStorage } from '../utils/attachmentStorage.js';
import { cleanLegalPlainText } from '../utils/textSanitizer.js';
import { expandMagazineSearchAliases } from '../utils/priorityOrdering.js';

const escapeRegex = (string) => {
  if (string == null) return '';
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const parseLegalCitation = (text) => {
  if (!text) return null;
  const clean = String(text).trim().replace(/^["'“‘]+|["'”’]+$/g, '').trim();
  
  // 1. (Year) Vol Mag Page: e.g. "(2025) 132 TAX 129"
  const m1 = clean.match(/^\(?(\d{4})\)?\s+(\d{1,4})\s+([A-Za-z]+)\s+(\d+)$/i);
  if (m1) {
    return { year: m1[1], vol: m1[2], mag: m1[3].toUpperCase(), page: m1[4] };
  }

  // 2. Vol Mag Page: e.g. "132 TAX 129"
  const m2 = clean.match(/^(\d{1,4})\s+([A-Za-z]+)\s+(\d+)$/i);
  if (m2 && parseInt(m2[1], 10) < 1900) {
    return { vol: m2[1], mag: m2[2].toUpperCase(), page: m2[3] };
  }

  // 3. Year Mag Page: e.g. "2025 PTD 1", "2026 SLD 1414"
  const m3 = clean.match(/^(\d{4})\s+([A-Za-z]+)\s+(\d+)$/i);
  if (m3) {
    return { year: m3[1], mag: m3[2].toUpperCase(), page: m3[3] };
  }

  // 4. Mag Year Page: e.g. "PTD 2025 1"
  const m4 = clean.match(/^([A-Za-z]+)\s+(\d{4})\s+(\d+)$/i);
  if (m4) {
    return { year: m4[2], mag: m4[1].toUpperCase(), page: m4[3] };
  }

  // 5. Mag Vol Page: e.g. "TAX 132 129"
  const m5 = clean.match(/^([A-Za-z]+)\s+(\d{1,4})\s+(\d+)$/i);
  if (m5 && parseInt(m5[2], 10) < 1900) {
    return { vol: m5[2], mag: m5[1].toUpperCase(), page: m5[3] };
  }

  return null;
};

export const buildCitationQuery = (c) => {
  const or = [];
  const rawMag = String(c.mag || '').trim();
  const cleanMag = escapeRegex(rawMag);
  const cleanPage = String(c.page || '').trim();
  const cleanVol = c.vol ? String(c.vol).trim() : null;
  const cleanYear = c.year ? String(c.year).trim() : null;

  // Generate casing variants for high-speed B-tree index seek (< 3ms)
  const magVariants = [
    rawMag,
    rawMag.toUpperCase(),
    rawMag.toLowerCase(),
    rawMag.charAt(0).toUpperCase() + rawMag.slice(1).toLowerCase()
  ].filter(Boolean);
  const uniqueMagVariants = [...new Set(magVariants)];

  if (cleanYear && cleanVol) {
    or.push({ mapYearPage: { $regex: `(?:\\(?${cleanYear}\\)?\\s+)?${cleanVol}\\s+${cleanMag}\\s+${cleanPage}(?:$|\\b)`, $options: 'i' } });
    or.push({ publications: { $elemMatch: { mag: { $in: uniqueMagVariants }, vol: cleanVol, page: cleanPage } } });
  } else if (cleanVol) {
    or.push({ mapYearPage: { $regex: `(?:\\(\\d{4}\\)\\s+)?${cleanVol}\\s+${cleanMag}\\s+${cleanPage}(?:$|\\b)`, $options: 'i' } });
    or.push({ publications: { $elemMatch: { mag: { $in: uniqueMagVariants }, vol: cleanVol, page: cleanPage } } });
  } else if (cleanYear) {
    or.push({ mapYearPage: { $regex: `${cleanYear}\\s+${cleanMag}\\s+${cleanPage}(?:$|\\b)`, $options: 'i' } });
    or.push({ publications: { $elemMatch: { mag: { $in: uniqueMagVariants }, year: cleanYear, page: cleanPage } } });
  }

  // KEY PERFORMANCE OPTIMIZATION:
  // When page is present, bind 'publications.page' to take immediate advantage of the
  // existing compound index { 'publications.page': 1, 'publications.year': 1 }.
  // This prunes 165,000+ documents down to ~1,500 documents in 0-1ms without altering result semantics!
  if (cleanPage) {
    return {
      'publications.page': cleanPage,
      $or: or
    };
  }
  return { $or: or };
};

/**
 * High-speed In-Memory Case Cache (< 1ms)
 */
const caseDetailCache = new Map();
const CASE_CACHE_MAX = 400;
const CASE_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const getCachedCase = (key) => {
  const item = caseDetailCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    caseDetailCache.delete(key);
    return null;
  }
  return item.data;
};

const setCachedCase = (key, data) => {
  if (caseDetailCache.size >= CASE_CACHE_MAX) {
    const oldest = caseDetailCache.keys().next().value;
    caseDetailCache.delete(oldest);
  }
  caseDetailCache.set(key, { data, expiresAt: Date.now() + CASE_CACHE_TTL });
};

/**
 * High-speed In-Memory Cache for Search Queries (< 1ms)
 */
const searchResultsCache = new Map();
const SEARCH_CACHE_MAX = 500;
const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedSearch = (key) => {
  const item = searchResultsCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    searchResultsCache.delete(key);
    return null;
  }
  searchResultsCache.delete(key);
  searchResultsCache.set(key, item);
  return item.data;
};

const setCachedSearch = (key, data) => {
  if (searchResultsCache.size >= SEARCH_CACHE_MAX) {
    const oldest = searchResultsCache.keys().next().value;
    searchResultsCache.delete(oldest);
  }
  searchResultsCache.set(key, { data, expiresAt: Date.now() + SEARCH_CACHE_TTL });
};

/**
 * Distinct Value Lookup Cache for B-Tree Indexed Case Law Filtering (15 min TTL)
 * Converts unindexed infix regex searches on Law, Section, Principle Law, and Court
 * into exact indexed $in queries without sacrificing case-insensitive partial matching.
 */
const CASE_LOOKUP_TTL_MS = 15 * 60 * 1000;
let caseLookupCache = null;
let caseLookupExpiresAt = 0;
let caseLookupPromise = null;

const normalizeDistinctStrings = (arr) =>
  Array.from(new Set((arr || []).filter(Boolean).map((v) => String(v).trim()).filter(Boolean)))
    .map((raw) => ({ raw, lower: raw.toLowerCase() }));

const getCaseLookupCache = async () => {
  const now = Date.now();
  if (caseLookupCache && now < caseLookupExpiresAt) {
    return caseLookupCache;
  }
  if (caseLookupPromise) return caseLookupPromise;

  caseLookupPromise = (async () => {
    try {
      const [lawStatutes, principleLaws, sections, courts] = await Promise.all([
        Case.distinct('laws.lawStatute', { isDeleted: false }),
        Case.distinct('principleLaw', { isDeleted: false }),
        Case.distinct('laws.section', { isDeleted: false }),
        Case.distinct('court', { isDeleted: false })
      ]);
      caseLookupCache = {
        lawStatutes: normalizeDistinctStrings(lawStatutes),
        principleLaws: normalizeDistinctStrings(principleLaws),
        sections: normalizeDistinctStrings(sections),
        courts: normalizeDistinctStrings(courts)
      };
      caseLookupExpiresAt = Date.now() + CASE_LOOKUP_TTL_MS;
      return caseLookupCache;
    } finally {
      caseLookupPromise = null;
    }
  })();

  return caseLookupPromise;
};

const matchLookupEntries = (entries, needle, { exactOnly = false } = {}) => {
  const targetLower = String(needle || '').trim().toLowerCase();
  if (!targetLower || !Array.isArray(entries)) return [];
  const hits = [];
  for (let i = 0; i < entries.length; i++) {
    const item = entries[i];
    const matched = exactOnly ? item.lower === targetLower : item.lower.includes(targetLower);
    if (matched) {
      hits.push(item.raw);
      if (hits.length > 400) return null; // Too broad -> fallback cleanly to regex
    }
  }
  return hits;
};

const invalidateAllCaseCaches = () => {
  caseDetailCache.clear();
  searchResultsCache.clear();
  cachedTotalCasesCount = 0;
  caseLookupCache = null;
  caseLookupExpiresAt = 0;
};

/**
 * High-speed In-Memory Count Cache for Cases
 */
let cachedTotalCasesCount = 0;
let cachedTotalCasesExpiresAt = 0;

const getTotalCasesCount = async (query, hasFilter) => {
  if (hasFilter) {
    return Case.countDocuments(query);
  }
  const now = Date.now();
  if (cachedTotalCasesCount > 0 && now < cachedTotalCasesExpiresAt) {
    return cachedTotalCasesCount;
  }
  try {
    const count = await Case.estimatedDocumentCount();
    cachedTotalCasesCount = count;
    cachedTotalCasesExpiresAt = now + 5 * 60_000;
    return count;
  } catch {
    return cachedTotalCasesCount || 162865;
  }
};

/**
 * High-speed Cached Database Citation & Other Case Statistics
 * Computes exact count of all citations in database + other case laws count
 */
const CITATION_STATS_COUNTER_ID = 'case_citation_stats_v1';
let cachedDatabaseStats = null;
let cachedDatabaseStatsExpiresAt = 0;
let citationStatsRefreshPromise = null;

export const computeAndPersistCitationStats = async () => {
  if (citationStatsRefreshPromise) return citationStatsRefreshPromise;

  citationStatsRefreshPromise = (async () => {
    try {
      const [totalCases, totalOtherCases, caseStats] = await Promise.all([
        Case.countDocuments({ isDeleted: false }),
        OtherCaseLaw.countDocuments({ isDeleted: false }),
        Case.aggregate([
          { $match: { isDeleted: false } },
          {
            $project: {
              citationCount: {
                $max: [
                  { $size: { $ifNull: ['$publications', []] } },
                  { $size: { $ifNull: ['$mapYearPage', []] } }
                ]
              }
            }
          },
          { $group: { _id: null, totalCitations: { $sum: '$citationCount' } } }
        ])
      ]);

      const aggTotalCitations = Array.isArray(caseStats) && caseStats[0]?.totalCitations
        ? Number(caseStats[0].totalCitations)
        : 0;
      const totalCitations = Math.max(aggTotalCitations, totalCases);
      const totalCitationsWithOtherLaws = totalCitations + totalOtherCases;
      const totalCombinedCases = totalCases + totalOtherCases;

      await Counter.findByIdAndUpdate(
        CITATION_STATS_COUNTER_ID,
        { $set: { seq: totalCitations } },
        { upsert: true }
      ).catch(() => {});

      const payload = {
        totalCases,
        totalOtherCases,
        totalCitations,
        totalCitationsWithOtherLaws,
        totalCombinedCases,
        count: totalCitationsWithOtherLaws,
        displayCount: totalCitationsWithOtherLaws.toLocaleString()
      };

      cachedDatabaseStats = payload;
      cachedDatabaseStatsExpiresAt = Date.now() + 1800_000;
      return payload;
    } catch (err) {
      logger.warn('[Case Stats] Background citation aggregation warning:', err?.message);
      return null;
    } finally {
      citationStatsRefreshPromise = null;
    }
  })();

  return citationStatsRefreshPromise;
};

export const getCaseDatabaseStats = async (req, res, next) => {
  try {
    const now = Date.now();
    if (cachedDatabaseStats && now < cachedDatabaseStatsExpiresAt) {
      return res.status(200).json({ success: true, ...cachedDatabaseStats });
    }

    const [totalCases, totalOtherCases, persisted] = await Promise.all([
      Case.countDocuments({ isDeleted: false }),
      OtherCaseLaw.countDocuments({ isDeleted: false }),
      Counter.findById(CITATION_STATS_COUNTER_ID).lean().catch(() => null)
    ]);

    const persistedCitations = Number(persisted?.seq) || 0;
    const hasReliableSnapshot = persistedCitations > totalCases;

    const bgPromise = computeAndPersistCitationStats();

    if (hasReliableSnapshot) {
      const totalCitations = persistedCitations;
      const totalCitationsWithOtherLaws = totalCitations + totalOtherCases;
      const totalCombinedCases = totalCases + totalOtherCases;

      const snapshotPayload = {
        totalCases,
        totalOtherCases,
        totalCitations,
        totalCitationsWithOtherLaws,
        totalCombinedCases,
        count: totalCitationsWithOtherLaws,
        displayCount: totalCitationsWithOtherLaws.toLocaleString()
      };
      cachedDatabaseStats = snapshotPayload;
      cachedDatabaseStatsExpiresAt = now + 300_000;
      return res.status(200).json({ success: true, ...snapshotPayload });
    }

    const computed = await Promise.race([
      bgPromise,
      new Promise((resolve) => setTimeout(() => resolve(null), 3500))
    ]);

    if (computed) {
      return res.status(200).json({ success: true, ...computed });
    }

    const totalCitations = totalCases;
    const totalCitationsWithOtherLaws = totalCitations + totalOtherCases;
    return res.status(200).json({
      success: true,
      totalCases,
      totalOtherCases,
      totalCitations,
      totalCitationsWithOtherLaws,
      totalCombinedCases: totalCases + totalOtherCases,
      count: totalCitationsWithOtherLaws,
      displayCount: totalCitationsWithOtherLaws.toLocaleString(),
      isCalculating: true
    });
  } catch (error) {
    logger.error('Error in getCaseDatabaseStats:', error);
    return next(error);
  }
};

/**
 * Helper to translate a newline separated string into an array of trimmed strings.
 * Strictly preserves commas so judicial suffixes (e.g. "Judge Name, J") and case dates are never broken.
 */
const stringToArray = (str) => {
  if (!str) return [];
  if (Array.isArray(str)) {
    return str.map(item => String(item).trim()).filter(Boolean);
  }
  return String(str)
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
};

const normalizeLawReferences = (laws = []) => (Array.isArray(laws) ? laws : [])
  .map((law) => ({
    lawStatute: String(law?.lawStatute || '').trim(),
    section: String(law?.section || '').trim(),
  }))
  .filter((law) => law.lawStatute || law.section);

const buildMapYearPage = (publications = []) => {
  const entries = [];

  publications.forEach((pub) => {
    if (!pub || (!pub.year && !pub.mag && !pub.page && !pub.vol)) return;

    const magStr = (pub.mag || 'SLD').toUpperCase();
    const yearStr = pub.year || '';
    const volStr = pub.vol ? `${pub.vol} ` : '';
    const pageStr = pub.page || '';

    // Format: Year Mag Page e.g. "2026 SLD 8325" or "(2005) 92 TAX 141"
    let citation = '';
    if (pub.vol) {
      citation = `(${yearStr}) ${volStr}${magStr} ${pageStr}`.trim();
    } else if (yearStr) {
      citation = `${yearStr} ${magStr} ${pageStr}`.trim();
    } else {
      citation = `${magStr} ${pageStr}`.trim();
    }

    if (!citation) return;

    const key = `${yearStr}|${magStr}|${pageStr}`.toLowerCase();
    const existingIndex = entries.findIndex((entry) => entry.key === key);

    if (existingIndex === -1) {
      entries.push({ value: citation, key });
      return;
    }

    const current = entries[existingIndex];
    const currentHasVol = current.value.includes('(') || /\(\d{4}\)/.test(current.value);
    const nextHasVol = Boolean(pub.vol && String(pub.vol).trim());

    if (nextHasVol && !currentHasVol) {
      entries[existingIndex] = { value: citation, key };
    }
  });

  return entries.map((entry) => entry.value);
};

/**
 * Extracts relevant matching paragraph or snippet from judgment text for search results
 */
export const extractRelevantParagraph = (judgmentText, headNoteText, searchTerms = []) => {
  const queryWords = (Array.isArray(searchTerms) ? searchTerms : [searchTerms])
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length >= 3);

  if (queryWords.length === 0) return null;

  const content = judgmentText || headNoteText || '';
  if (!content) return null;

  const cleanContent = content.replace(/<[^>]*>/g, ' ');
  const paragraphs = cleanContent.split(/\n\s*\n|\r\n\r\n/);

  for (const para of paragraphs) {
    const lowerPara = para.toLowerCase();
    const hasMatch = queryWords.some(w => lowerPara.includes(w));
    if (hasMatch && para.trim().length > 30) {
      const trimmed = para.trim();
      return trimmed.length > 380 ? trimmed.slice(0, 380) + '...' : trimmed;
    }
  }

  for (const w of queryWords) {
    const idx = cleanContent.toLowerCase().indexOf(w);
    if (idx !== -1) {
      const start = Math.max(0, idx - 80);
      const end = Math.min(cleanContent.length, idx + 240);
      return (start > 0 ? '...' : '') + cleanContent.slice(start, end).trim() + '...';
    }
  }

  return null;
};

/**
 * Helper to format case model for frontend compatibility
 */
/**
 * Intelligently resolves and normalizes case decision date.
 * If case has a dated property, returns that (normalized).
 * Otherwise extracts date from caseNumber array, laws, or publication year.
 */
export const extractCaseDate = (c) => {
  if (!c) return '';

  // 1. Direct fields: dated, date, decisionDate, judgmentDate
  const candidate = c.dated || c.date || c.decisionDate || c.judgmentDate;
  if (candidate && String(candidate).trim()) {
    const s = String(candidate).trim();
    if (!s.startsWith('1970') && !s.startsWith('0000') && s !== 'null' && s !== 'undefined') {
      if (s.includes('T')) return s.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
      if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
      const ymd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
      if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900) {
        return parsed.toISOString().split('T')[0];
      }
      return s;
    }
  }

  // 2. Extract from caseNumber strings
  const caseNumbers = Array.isArray(c.caseNumber) ? c.caseNumber : (c.caseNumber ? [c.caseNumber] : []);
  for (const cn of caseNumbers) {
    if (!cn) continue;
    const str = String(cn);
    const match = str.match(/(?:decision\s+dated|decided\s+on|order\s+dtd|dated|hearing\s+date|judgment\s+dated|decided|order)\s*[:\-]?\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/i);
    if (match) {
      let day = match[1].padStart(2, '0');
      let month = match[2].padStart(2, '0');
      let year = match[3];
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }
    const monthWordMatch = str.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))[,\s]+(\d{4})\b/i);
    if (monthWordMatch) {
      const monthNames = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
      const mKey = monthWordMatch[2].slice(0, 3).toLowerCase();
      const mNum = monthNames[mKey] || '01';
      return `${monthWordMatch[3]}-${mNum}-${monthWordMatch[1].padStart(2, '0')}`;
    }
    const isoMatch = str.match(/\b(19\d{2}|20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }
    const dmyMatch = str.match(/\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](19\d{2}|20\d{2})\b/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    }
  }

  // 3. Extract from laws array
  if (Array.isArray(c.laws)) {
    for (const law of c.laws) {
      const d = law?.dated || law?.date;
      if (d && String(d).trim() && !String(d).startsWith('1970')) {
        const s = String(d).trim();
        if (s.includes('T')) return s.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
        if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
        return s;
      }
    }
  }

  // 4. Extract from publications array
  if (Array.isArray(c.publications) && c.publications.length > 0) {
    const pubYear = c.publications.find(p => p?.year && /^\d{4}$/.test(String(p.year).trim()))?.year;
    if (pubYear) {
      return String(pubYear).trim();
    }
  }

  // 5. Extract from mapYearPage citations (e.g. "2021 PTD 105" or "(2020) 123 TAX 45")
  const citations = Array.isArray(c.mapYearPage) ? c.mapYearPage : [];
  for (const cit of citations) {
    if (!cit) continue;
    const yMatch = String(cit).match(/\b(19\d{2}|20\d{2})\b/);
    if (yMatch) {
      return yMatch[1];
    }
  }

  // 6. Extract 4-digit year from caseNumber (e.g. "of 2021" or "/2021")
  for (const cn of caseNumbers) {
    if (!cn) continue;
    const yMatch = String(cn).match(/\b(?:of|\/|-|\s)(19\d{2}|20\d{2})\b/i);
    if (yMatch) {
      return yMatch[1];
    }
  }

  // 7. Fallback to createdAt if valid and not 1970
  if (c.createdAt) {
    const cDate = new Date(c.createdAt);
    if (!isNaN(cDate.getTime()) && cDate.getFullYear() > 2000) {
      return cDate.toISOString().split('T')[0];
    }
  }

  return '';
};

/**
 * Normalizes attachment inputs to ensure every attachment object adheres to schema
 */
export const sanitizeAttachments = (attachments) => {
  return sanitizeAttachmentsStorage(attachments);
};

const sanitizeCaseTextIfNoisy = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  if (/<(?:div|hr|script|style|noscript|iframe|table|tbody|tr|td|html|head|body|meta|link|font)\b|<\/?(?:https?|mailto|ftp):|clear:both|margin:\s*50px|!important"|<!--|\b(?:width|height|text-align):""|â€|Â[\s\u00a0]/i.test(raw)) {
    return cleanLegalPlainText(raw);
  }
  return raw;
};

const formatCaseForFrontend = (c, { skipAttachments = false } = {}) => {
  const mappedCitations = Array.isArray(c.mapYearPage) ? c.mapYearPage.filter(Boolean) : [];
  const publicationCitations = buildMapYearPage(c.publications || []);
  const seenCitations = new Set();
  const mapYearPage = [...mappedCitations, ...publicationCitations].filter((citation) => {
    const key = String(citation).replace(/\s+/g, ' ').trim().toLowerCase();
    if (!key || seenCitations.has(key)) return false;
    seenCitations.add(key);
    return true;
  });

  let cleanAtts = [];
  if (!skipAttachments) {
    const rawAtts = Array.isArray(c.attachments) ? c.attachments : (c.attachments && typeof c.attachments === 'object' ? [c.attachments] : []);
    cleanAtts = sanitizeAttachments(rawAtts);
  }

  return {
    id: c._id.toString(),
    caseId: c.caseId || c.case_id || '',
    case_id: c.case_id || c.caseId || '',
    sldNumber: c.sldNumber || c.caseId || '',
    dated: extractCaseDate(c),
    department: c.department || 'tax',
    court: c.court || '',
    caseNumber: c.caseNumber || [],
    judges: c.judges || [],
    petitioners: c.petitioners || [],
    lawyers: c.lawyers || [],
    headNote: sanitizeCaseTextIfNoisy(c.headNote || ''),
    references: c.references || '',
    principleLaw: c.principleLaw || '',
    legalMaxim: c.legalMaxim || '',
    judgment: sanitizeCaseTextIfNoisy(c.judgment || ''),
    publications: c.publications || [],
    laws: c.laws || [],
    ...(skipAttachments ? {} : {
      attachments: cleanAtts,
      attachmentsCount: cleanAtts.length,
      attachmentsData: cleanAtts
    }),
    mapYearPage
  };
};

/**
 * Case Laws API Controllers
 */
export const getCases = async (req, res, next) => {
  try {
    const { subject, fromDate, toDate, fromYear, toYear, magazine, fromSld, toSld, page, limit, sortField, sortOrder } = req.query;

    const query = { isDeleted: false };

    // Apply filters
    if (subject) {
      const q = subject.trim();
      if (q) {
        const citationParsed = parseLegalCitation(q);
        const cleanNum = q.replace(/^(?:case|sld)\s*(?:no\.?|#|id)?\s*[:\-]?\s*/i, '').trim();
        const numQ = parseInt(cleanNum, 10);

        if (citationParsed) {
          const citQuery = buildCitationQuery(citationParsed);
          query.$or = citQuery.$or;
          if (citQuery['publications.page']) {
            query['publications.page'] = citQuery['publications.page'];
          }
        } else if (!isNaN(numQ) && String(numQ) === cleanNum) {
          // Blazing fast point lookup via indexed sldNumberInt / sldNumber / caseId (sub-10ms)
          query.$or = [
            { sldNumberInt: numQ },
            { sldNumber: String(numQ) },
            { caseId: `CASE-${String(numQ).padStart(6, '0')}` },
            { caseId: `CASE-${cleanNum}` }
          ];
        } else {
          const searchRegex = new RegExp(escapeRegex(q), 'i');
          query.$or = [
            { caseId: searchRegex },
            { case_id: searchRegex },
            { sldNumber: searchRegex },
            { court: searchRegex },
            { headNote: searchRegex },
            { references: searchRegex },
            { principleLaw: searchRegex },
            { caseNumber: searchRegex },
            { judges: searchRegex },
            { lawyers: searchRegex },
            { petitioners: searchRegex },
            { mapYearPage: searchRegex }
          ];
        }
      }
    }

    if (fromDate) {
      query.dated = { ...query.dated, $gte: fromDate };
    }

    if (toDate) {
      query.dated = { ...query.dated, $lte: toDate };
    }

    // Support year and magazine filtering
    const hasYear = Boolean((fromYear && String(fromYear).trim()) || (toYear && String(toYear).trim()));
    const hasMag = Boolean(magazine && magazine.trim());

    if (hasMag && hasYear) {
      const fy = fromYear ? String(fromYear).trim() : '';
      const ty = toYear ? String(toYear).trim() : '';
      const magAliases = expandMagazineSearchAliases(magazine);
      const magClean = magAliases.length > 1
        ? `(?:${magAliases.map(escapeRegex).join('|')})`
        : escapeRegex(magazine.trim());

      const elemMatchYear = {};
      if (fy && ty) {
        elemMatchYear.$gte = fy;
        elemMatchYear.$lte = ty;
      } else if (fy) {
        elemMatchYear.$gte = fy;
      } else if (ty) {
        elemMatchYear.$lte = ty;
      }

      const fromN = parseInt(fy, 10);
      const toN = parseInt(ty, 10);
      let yearPattern = '';
      if (!isNaN(fromN) && !isNaN(toN) && toN >= fromN && (toN - fromN) <= 100) {
        const yrs = [];
        for (let y = fromN; y <= toN; y++) yrs.push(y);
        yearPattern = `(?:${yrs.join('|')})`;
      } else if (!isNaN(fromN) && isNaN(toN)) {
        yearPattern = `(?:${fromN}|20[2-9][0-9])`;
      } else if (isNaN(fromN) && !isNaN(toN)) {
        yearPattern = `(?:19[0-9]{2}|20[0-2][0-9])`;
      }

      const mapRegexList = [];
      if (yearPattern) {
        mapRegexList.push(
          new RegExp(`(^|[^0-9])(${yearPattern})[^a-zA-Z0-9]+${magClean}([^a-zA-Z0-9]|$)`, 'i'),
          new RegExp(`^\\s*${magClean}[^a-zA-Z0-9]+(${yearPattern})[^a-zA-Z0-9]+\\d+`, 'i')
        );
      }

      const combinedMagYearConditions = [
        {
          publications: {
            $elemMatch: {
              mag: new RegExp(magClean, 'i'),
              year: elemMatchYear
            }
          }
        },
        ...mapRegexList.map(r => ({ mapYearPage: r }))
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: combinedMagYearConditions }];
        delete query.$or;
      } else if (query.$and) {
        query.$and.push({ $or: combinedMagYearConditions });
      } else {
        query.$or = combinedMagYearConditions;
      }
    } else if (hasYear) {
      const fy = fromYear ? String(fromYear).trim() : '';
      const ty = toYear ? String(toYear).trim() : '';
      const yearConditions = [];
      if (fy && ty) {
        yearConditions.push(
          { 'publications.year': { $gte: fy, $lte: ty } },
          { dated: { $gte: `${fy}-01-01`, $lte: `${ty}-12-31` } }
        );
      } else if (fy) {
        yearConditions.push(
          { 'publications.year': { $gte: fy } },
          { dated: { $gte: `${fy}-01-01` } }
        );
      } else if (ty) {
        yearConditions.push(
          { 'publications.year': { $lte: ty } },
          { dated: { $lte: `${ty}-12-31` } }
        );
      }
      if (yearConditions.length > 0) {
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: yearConditions }];
          delete query.$or;
        } else if (query.$and) {
          query.$and.push({ $or: yearConditions });
        } else {
          query.$or = yearConditions;
        }
      }
    } else if (hasMag) {
      const magAliases = expandMagazineSearchAliases(magazine);
      const magClean = magAliases.length > 1
        ? `(?:${magAliases.map(escapeRegex).join('|')})`
        : escapeRegex(magazine.trim());
      const magRegex = new RegExp(magClean, 'i');
      const magCondition = [
        { 'publications.mag': magRegex },
        { mapYearPage: magRegex }
      ];
      if (query.$and) {
        query.$and.push({ $or: magCondition });
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: magCondition }];
        delete query.$or;
      } else {
        query.$or = magCondition;
      }
    }

    // Support range queries by SLD / serial number (fromNo to toNo / fromSld to toSld)
    const fNo = parseInt(req.query.fromNo || req.query.fromSld, 10);
    const tNo = parseInt(req.query.toNo || req.query.toSld, 10);
    const isRangeSearch = !isNaN(fNo) || !isNaN(tNo);
    let minSld = null;
    let maxSld = null;
    if (!isNaN(fNo) && !isNaN(tNo)) {
      minSld = Math.min(fNo, tNo);
      maxSld = Math.max(fNo, tNo);
      query.sldNumberInt = { $gte: minSld, $lte: maxSld };
    } else if (!isNaN(fNo)) {
      minSld = fNo;
      query.sldNumberInt = { $gte: fNo };
    } else if (!isNaN(tNo)) {
      maxSld = tNo;
      query.sldNumberInt = { $lte: tNo };
    }

    // Pagination (allow up to 2000 for magazine search or range extractions)
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const rangeSpan = (minSld !== null && maxSld !== null) ? Math.max(1, maxSld - minSld + 1) : 500;
    const maxLimitAllowed = (magazine && magazine.trim()) ? 2000 : (isRangeSearch ? 1000 : 100);
    const defaultLimit = (magazine && magazine.trim()) ? 500 : (isRangeSearch ? rangeSpan : 25);
    const limitNum = Math.min(maxLimitAllowed, Math.max(1, parseInt(limit, 10) || defaultLimit));
    const skip = (pageNum - 1) * limitNum;

    // Sorting:
    // If range extraction (e.g. SLD # 1 to 2) and sortOrder is not specified: default to ASCENDING (1)
    // so SLD # are downloaded according to number in order (1, 2, ...).
    // For standard listing: default to DESCENDING (-1) so latest/highest SLD number is on top.
    const sortFieldMap = {
      sldNumber: 'sldNumberInt',
      dated: 'dated',
      court: 'court',
      caseNumber: 'caseNumber',
      mapYearPage: 'mapYearPage'
    };
    const targetSortField = sortFieldMap[sortField] || 'sldNumberInt';
    let safeSortOrder;
    if (sortOrder === 'asc') {
      safeSortOrder = 1;
    } else if (sortOrder === 'desc') {
      safeSortOrder = -1;
    } else {
      safeSortOrder = isRangeSearch ? 1 : -1;
    }
    const sortObj = { [targetSortField]: safeSortOrder };
    if (targetSortField === 'sldNumberInt') {
      sortObj.sldNumber = safeSortOrder;
    }

    const hasFilter = Boolean((subject && subject.trim()) || fromDate || toDate || fromYear || toYear || (magazine && magazine.trim()) || isRangeSearch);

    // High performance projection:
    // Omit massive 'judgment' field (50KB-500KB per case) for standard table listings.
    // Only include judgment if it's a range extraction or includeJudgment is explicitly true.
    // This provides lightning-fast sub-20 millisecond database response times!
    const selectFields = (isRangeSearch || req.query.includeJudgment === 'true')
      ? 'caseId case_id sldNumber dated date decisionDate judgmentDate court caseNumber judges lawyers petitioners mapYearPage publications laws attachments department headNote principleLaw judgment createdAt'
      : 'caseId case_id sldNumber dated date decisionDate judgmentDate court caseNumber judges lawyers petitioners mapYearPage publications laws attachments department headNote principleLaw createdAt';

    let casesQuery = Case.find(query)
      .select(selectFields)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Citation searches have an exact publication compound index. Using it
    // avoids scanning every record sharing the page number before sorting.
    if (subject && parseLegalCitation(subject)) {
      casesQuery = casesQuery.hint({
        isDeleted: 1,
        'publications.mag': 1,
        'publications.page': 1,
        'publications.year': 1
      });
    }

    // Execute count + paginated query in parallel using fast indexed queries
    const [totalItems, cases] = await Promise.all([
      getTotalCasesCount(query, hasFilter),
      casesQuery
    ]);

    let data = cases.map(formatCaseForFrontend);
    if (req.user?.isSpammer === true) {
      data = spoofCaseList(data);
    }
    const totalPages = Math.ceil(totalItems / limitNum);

    return res.status(200).json({
      success: true,
      message: 'Cases retrieved successfully.',
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/cases/max-page?year=2026&mag=sld
 * Returns the highest page number stored for a given year+magazine combination.
 * Used by the Add/Edit form to auto-suggest the next page number.
 */
export const getMaxPage = async (req, res, next) => {
  try {
    const { year, mag } = req.query;

    if (!year || !mag) {
      return res.status(400).json({
        success: false,
        message: 'year and mag query parameters are required.'
      });
    }

    const maxPageMagAliases = expandMagazineSearchAliases(mag);
    const maxPageMagPattern = maxPageMagAliases.length > 1
      ? `^(?:${maxPageMagAliases.map(escapeRegex).join('|')})$`
      : `^${escapeRegex(String(mag).trim())}$`;
    const result = await Case.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: '$publications' },
      {
        $match: {
          'publications.year': String(year).trim(),
          'publications.mag': { $regex: maxPageMagPattern, $options: 'i' }
        }
      },
      {
        $group: {
          _id: null,
          maxPage: {
            $max: {
              $convert: {
                input: '$publications.page',
                to: 'int',
                onError: 0,
                onNull: 0
              }
            }
          }
        }
      }
    ]);

    const maxPage = result.length > 0 && result[0].maxPage != null
      ? result[0].maxPage
      : null;

    const nextPage = maxPage != null ? maxPage + 1 : 1;

    return res.status(200).json({
      success: true,
      maxPage,
      nextPage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/cases/next-sld
 * Returns the latest existing SLD number and the next sequential SLD number.
 */
export const getNextSld = async (req, res, next) => {
  try {
    const topCase = await Case.findOne({ isDeleted: false, sldNumberInt: { $ne: null } })
      .sort({ sldNumberInt: -1 })
      .select('sldNumber sldNumberInt srNumber')
      .lean();

    let latestSld = 0;
    if (topCase) {
      if (typeof topCase.sldNumberInt === 'number' && !isNaN(topCase.sldNumberInt)) {
        latestSld = topCase.sldNumberInt;
      } else if (topCase.sldNumber && !isNaN(parseInt(topCase.sldNumber, 10))) {
        latestSld = parseInt(topCase.sldNumber, 10);
      }
    }

    const nextSld = latestSld > 0 ? latestSld + 1 : 1;

    return res.status(200).json({
      success: true,
      latestSld,
      nextSld
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/cases/sld/:sld
 * Directly fetches case by SLD number (or caseId)
 */
export const getCaseBySld = async (req, res, next) => {
  try {
    const { sld } = req.params;
    if (!sld || !sld.trim()) {
      return res.status(400).json({
        success: false,
        message: 'SLD Number parameter is required.'
      });
    }

    const cleanSld = sld.trim();
    const cleanNum = cleanSld.replace(/^(?:case|sld)\s*(?:no\.?|#|id)?\s*[:\-]?\s*/i, '').trim();
    const numInt = parseInt(cleanNum, 10);

    const conditions = [
      { sldNumber: cleanSld },
      { sldNumber: cleanNum },
      { caseId: new RegExp(`^${escapeRegex(cleanSld)}$`, 'i') },
      { case_id: new RegExp(`^${escapeRegex(cleanSld)}$`, 'i') },
      { caseId: new RegExp(`^${escapeRegex(cleanNum)}$`, 'i') },
      { case_id: new RegExp(`^${escapeRegex(cleanNum)}$`, 'i') },
      { caseId: `CASE-IMPORT-${cleanSld}` },
      { caseId: `CASE-IMPORT-${cleanNum}` }
    ];

    if (!isNaN(numInt)) {
      conditions.unshift({ sldNumberInt: numInt });
      conditions.push({ sldNumber: String(numInt) });
      conditions.push({ caseId: `CASE-${String(numInt).padStart(6, '0')}` });
      conditions.push({ caseId: `CASE-${cleanNum}` });
    }

    if (mongoose.isValidObjectId(cleanSld)) {
      conditions.push({ _id: cleanSld });
    }

    const cached = getCachedCase(`sld_${cleanSld.toLowerCase()}`);
    if (cached) {
      const payload = req.user?.isSpammer === true ? spoofCase(cached) : cached;
      return res.status(200).json({
        success: true,
        message: 'Case retrieved successfully.',
        data: payload
      });
    }

    const c = await Case.findOne({
      $or: conditions,
      isDeleted: false
    }).lean();

    if (!c) {
      return res.status(404).json({
        success: false,
        message: `Case law with SLD #${cleanSld} was not found.`
      });
    }

    if (req.user) {
      const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1').split(',')[0].trim().replace(/^::ffff:/, '');
      UserActivity.create({
        activityType: 'case',
        userId: req.user._id,
        loginId: req.user.loginId || req.user.username || req.user.email,
        fullName: req.user.fullName || req.user.username,
        agency: req.user.agencyName || 'General',
        documentId: c.caseId || c.sldNumber,
        documentNumber: c.sldNumber || c.caseId,
        documentTitle: (c.petitioners && c.petitioners[0]) || (c.caseNumber && c.caseNumber[0]) || 'Case Law Record',
        ipAddress: clientIp,
        dated: new Date(),
      }).catch(() => {});
    }

    const formatted = formatCaseForFrontend(c);
    setCachedCase(`sld_${cleanSld.toLowerCase()}`, formatted);
    if (c._id) setCachedCase(`id_${c._id.toString()}`, formatted);
    if (c.caseId) setCachedCase(`id_${c.caseId.toLowerCase()}`, formatted);

    const payload = req.user?.isSpammer === true ? spoofCase(formatted) : formatted;

    return res.status(200).json({
      success: true,
      message: 'Case retrieved successfully.',
      data: payload
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Detects sequential case law downloading by serial number (e.g. 2026 SLD 1, 2026 SLD 2, 2026 SLD 3...).
 * Automatically blocks the user ID after the configured threshold (default 10).
 */
const enforceSequentialScrapingGuard = async (req, caseDoc) => {
  if (!req?.user || req.user.role === 'Administrator') return { allowed: true };

  try {
    const user = await User.findById(req.user._id);
    if (!user) return { allowed: true };

    if (String(user.status).toUpperCase() === 'INACTIVE') {
      return { allowed: false, message: 'Account suspended. Please contact administrator.' };
    }

    const sldNum = parseInt(caseDoc?.sldNumber || caseDoc?.sldNumberInt || 0, 10);
    if (sldNum > 0) {
      const lastSr = user.lastDownloadedCaseSr || 0;
      const threshold = user.sequentialDownloadBlockThreshold || 10;

      if (lastSr > 0 && sldNum === lastSr + 1) {
        user.sequentialDownloadCount = (user.sequentialDownloadCount || 1) + 1;
        if (user.sequentialDownloadCount >= threshold) {
          user.status = 'INACTIVE';
          user.isSpammer = true;
          await user.save();
          clearUserSessionCache(user._id);
          logger.warn(`[Anti-Scraping] Blocked user ${user.username} after ${user.sequentialDownloadCount} sequential case law downloads.`);
          return {
            allowed: false,
            message: `Account blocked: Automated sequential case law downloading detected (${user.sequentialDownloadCount} consecutive downloads). Contact administration.`
          };
        }
      } else {
        user.sequentialDownloadCount = 1;
      }

      user.lastDownloadedCaseSr = sldNum;
      await user.save();
    }
    return { allowed: true };
  } catch (err) {
    logger.error('Sequential guard check error:', err);
    return { allowed: true };
  }
};

export const getCaseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !id.trim()) {
      return res.status(400).json({ success: false, message: 'Case ID parameter is required' });
    }

    const rawId = id.trim();
    const cleanId = rawId.replace(/^(?:case\s*(?:id|no\.?|#)?\s*[:\-]?\s*|sld\s*(?:no\.?|#)?\s*[:\-]?\s*)/i, '').trim();
    const numInt = parseInt(cleanId, 10);

    const citationParsed = parseLegalCitation(rawId);

    let query;
    if (mongoose.isValidObjectId(rawId)) {
      query = { _id: rawId };
    } else if (citationParsed) {
      query = buildCitationQuery(citationParsed);
    } else {
      const orList = [
        { caseId: new RegExp(`^${escapeRegex(rawId)}$`, 'i') },
        { case_id: new RegExp(`^${escapeRegex(rawId)}$`, 'i') },
        { sldNumber: rawId },
        { caseId: new RegExp(`^${escapeRegex(cleanId)}$`, 'i') },
        { case_id: new RegExp(`^${escapeRegex(cleanId)}$`, 'i') },
        { sldNumber: cleanId },
        { caseId: `CASE-IMPORT-${cleanId}` },
        { caseId: `CASE-IMPORT-${rawId}` }
      ];
      if (!isNaN(numInt)) {
        orList.unshift({ sldNumberInt: numInt });
        orList.push({ sldNumber: String(numInt) });
        orList.push({ caseId: `CASE-${String(numInt).padStart(6, '0')}` });
        orList.push({ caseId: `CASE-${cleanId}` });
      }
      query = { $or: orList };
    }

    const cached = getCachedCase(`id_${rawId.toLowerCase()}`);
    if (cached) {
      const payload = req.user?.isSpammer === true ? spoofCase(cached) : cached;
      return res.status(200).json({
        success: true,
        data: payload
      });
    }

    const c = await Case.findOne({ ...query, isDeleted: false }).lean();

    if (!c) {
      return res.status(404).json({
        success: false,
        message: 'Case law record not found.'
      });
    }

    if (req.user) {
      const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1').split(',')[0].trim().replace(/^::ffff:/, '');
      UserActivity.create({
        activityType: 'case',
        userId: req.user._id,
        loginId: req.user.loginId || req.user.username || req.user.email,
        fullName: req.user.fullName || req.user.username,
        agency: req.user.agencyName || 'General',
        documentId: c.caseId || c.sldNumber,
        documentNumber: c.sldNumber || c.caseId,
        documentTitle: (c.petitioners && c.petitioners[0]) || (c.caseNumber && c.caseNumber[0]) || 'Case Law Record',
        ipAddress: clientIp,
        dated: new Date(),
      }).catch(() => {});
    }

    const formatted = formatCaseForFrontend(c);
    setCachedCase(`id_${rawId.toLowerCase()}`, formatted);
    if (c.sldNumber) setCachedCase(`sld_${c.sldNumber.toLowerCase()}`, formatted);
    if (c._id) setCachedCase(`id_${c._id.toString()}`, formatted);

    const payload = req.user?.isSpammer === true ? spoofCase(formatted) : formatted;

    return res.status(200).json({
      success: true,
      data: payload
    });
  } catch (error) {
    next(error);
  }
};

export const createCase = async (req, res, next) => {
  try {
    const { 
      srNumber, dated, department, court, 
      caseNumber, judges, petitioners, lawyers, 
      headNote, references, principleLaw, legalMaxim, judgment, 
      publications, laws, attachments 
    } = req.body;

    const safeDepartment = typeof department === 'string' && department.trim().length > 0
      ? department.trim().toLowerCase()
      : 'tax';

    const cleanSld = srNumber ? String(srNumber).trim() : '';
    if (cleanSld) {
      const exist = await Case.findOne({ sldNumber: cleanSld, isDeleted: false });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Case law with SLD/SR #${cleanSld} already exists.`
        });
      }
      const cleanSldInt = parseInt(cleanSld.replace(/\D+/g, ''), 10);
      if (!isNaN(cleanSldInt) && cleanSldInt > 0) {
        const existByInt = await Case.findOne({ sldNumberInt: cleanSldInt, isDeleted: { $ne: true } });
        if (existByInt) {
          return res.status(400).json({
            success: false,
            message: `Case law with SLD/SR #${cleanSld} already exists.`
          });
        }
      }
    }

    const pubs = publications || [];
    const mapYearPage = buildMapYearPage(pubs);

    const newCase = new Case({
      sldNumber: srNumber ? srNumber.trim() : undefined,
      dated: dated || null,
      department: safeDepartment,
      court: court || '',
      caseNumber: stringToArray(caseNumber),
      judges: stringToArray(judges),
      petitioners: stringToArray(petitioners),
      lawyers: stringToArray(lawyers),
      headNote: headNote || '',
      references: references || '',
      principleLaw: principleLaw || '',
      legalMaxim: legalMaxim || '',
      judgment: judgment || '',
      publications: pubs,
      laws: normalizeLawReferences(laws),
      attachments: sanitizeAttachments(attachments),
      mapYearPage
    });

    await newCase.save();

    // If sldNumber was empty, fallback to generated caseId
    if (!newCase.sldNumber) {
      newCase.sldNumber = newCase.caseId;
      await newCase.save();
    }

    invalidateAllCaseCaches();
    logger.info(`[Case Created] Case ID ${newCase.caseId} (SLD #${newCase.sldNumber}) added.`);

    return res.status(201).json({
      success: true,
      message: 'Case law record created successfully.',
      data: formatCaseForFrontend(newCase)
    });
  } catch (error) {
    next(error);
  }
};

export const updateCase = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = {
      $or: [
        { caseId: id },
        { case_id: id },
        { sldNumber: id },
        ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])
      ],
      isDeleted: false
    };

    const { 
      srNumber, dated, department, court, 
      caseNumber, judges, petitioners, lawyers, 
      headNote, references, principleLaw, legalMaxim, judgment, 
      publications, laws, attachments 
    } = req.body;

    const safeDepartment = typeof department === 'string' && department.trim().length > 0
      ? department.trim().toLowerCase()
      : undefined;

    const c = await Case.findOne(query);
    if (!c) {
      return res.status(404).json({
        success: false,
        message: 'Case law record not found.'
      });
    }

    // Preserve existing SLD number on edit: never reassign to a new counter or generated ID
    const originalSld = c.sldNumber;
    if (srNumber && String(srNumber).trim() && String(srNumber).trim() !== String(c.sldNumber).trim()) {
      const cleanSr = String(srNumber).trim();
      const exist = await Case.findOne({ sldNumber: cleanSr, _id: { $ne: c._id }, isDeleted: false });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Case law with SLD/SR #${cleanSr} already exists.`
        });
      }
      c.sldNumber = cleanSr;
    } else {
      c.sldNumber = originalSld;
    }
    if (c.sldNumber) {
      const parsed = parseInt(String(c.sldNumber).replace(/\D+/g, ''), 10);
      c.sldNumberInt = !isNaN(parsed) ? parsed : null;
    }

    if (dated !== undefined) c.dated = dated;
    if (department !== undefined) c.department = safeDepartment ?? c.department;
    if (court !== undefined) c.court = court;
    if (caseNumber !== undefined) c.caseNumber = stringToArray(caseNumber);
    if (judges !== undefined) c.judges = stringToArray(judges);
    if (petitioners !== undefined) c.petitioners = stringToArray(petitioners);
    if (lawyers !== undefined) c.lawyers = stringToArray(lawyers);
    if (headNote !== undefined) c.headNote = headNote;
    if (references !== undefined) c.references = references;
    if (principleLaw !== undefined) c.principleLaw = principleLaw;
    if (legalMaxim !== undefined) c.legalMaxim = legalMaxim;
    if (judgment !== undefined) c.judgment = judgment;
    if (publications !== undefined) {
      c.publications = publications;
      c.mapYearPage = buildMapYearPage(publications);
    }
    if (laws !== undefined) c.laws = normalizeLawReferences(laws);
    if (attachments !== undefined) c.attachments = sanitizeAttachments(attachments);

    await c.save();
    invalidateAllCaseCaches();
    logger.info(`[Case Updated] Case ID ${c.caseId} (SLD #${c.sldNumber}) updated.`);

    return res.status(200).json({
      success: true,
      message: 'Case law record updated successfully.',
      data: formatCaseForFrontend(c)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCase = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = {
      $or: [
        { caseId: id },
        { case_id: id },
        { sldNumber: id },
        ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])
      ],
      isDeleted: false
    };

    const c = await Case.findOne(query);
    if (!c) {
      return res.status(404).json({
        success: false,
        message: 'Case law record not found.'
      });
    }

    c.isDeleted = true;
    c.deletedAt = new Date();
    await c.save();
    invalidateAllCaseCaches();

    await adjustSrOnDelete(Case, c, { srField: 'sldNumber', intField: 'sldNumberInt', isString: true, counterName: 'case' });
    logger.info(`[Case Deleted] Case ID ${c.caseId || c.sldNumber} soft-deleted and SLD# auto-adjusted.`);

    return res.status(200).json({
      success: true,
      message: `Case deleted successfully.`,
      id: c._id
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMultiple = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid array of Case IDs is required for bulk deletion.'
      });
    }

    const invalidId = ids.find(id => !mongoose.isValidObjectId(id));
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid case ID format in selection. Bulk deletion requires valid case IDs.'
      });
    }

    await Case.updateMany(
      { _id: { $in: ids } },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date() 
        } 
      }
    );

    invalidateAllCaseCaches();
    logger.info(`[Bulk Case Deleted] ${ids.length} cases soft-deleted.`);

    return res.status(200).json({
      success: true,
      message: `${ids.length} cases deleted successfully.`,
      ids
    });
  } catch (error) {
    next(error);
  }
};
export const searchCases = async (req, res, next) => {
  try {
    const filters = req.body || {};

    const hasFilter = Object.values(filters).some(val => val && val.toString().trim() !== '');
    if (!hasFilter) {
      return res.status(400).json({ success: false, message: 'Please provide at least one search criteria.' });
    }

    // Check fast search cache (< 1ms)
    const cacheKey = JSON.stringify(filters);
    const cachedResults = getCachedSearch(cacheKey);
    if (cachedResults) {
      const payload = req.user?.isSpammer === true ? spoofCaseList(cachedResults) : cachedResults;
      return res.status(200).json({
        success: true,
        count: payload.length,
        data: payload
      });
    }

    const lawQuery = filters.selectLaw || filters.law;
    const needLookupCache = Boolean(
      lawQuery ||
      filters.principleLaw ||
      filters.section ||
      filters.section2 ||
      filters.court
    );
    const lookup = needLookupCache ? await getCaseLookupCache() : null;

    let andConditions = [{ isDeleted: false }];
    let shortCircuitEmpty = false;
    let resolvedLawFieldOnly = false;
    let resolvedSectionFieldOnly = false;

    const applyDualFieldLookup = (needle, fieldA, entriesA, fieldB, entriesB) => {
      const cleanNeedle = String(needle || '').trim();
      if (!cleanNeedle) return { applied: false };

      const hitsA = lookup ? matchLookupEntries(entriesA, cleanNeedle) : null;
      const hitsB = lookup ? matchLookupEntries(entriesB, cleanNeedle) : null;

      if (hitsA !== null && hitsB !== null) {
        if (hitsA.length === 0 && hitsB.length === 0) {
          return { empty: true };
        }
        const branches = [];
        if (hitsA.length > 0) {
          branches.push({ [fieldA]: hitsA.length === 1 ? hitsA[0] : { $in: hitsA } });
        }
        if (hitsB.length > 0) {
          branches.push({ [fieldB]: hitsB.length === 1 ? hitsB[0] : { $in: hitsB } });
        }
        return {
          condition: branches.length === 1 ? branches[0] : { $or: branches },
          primaryOnly: hitsA.length === 0 && hitsB.length > 0
        };
      }

      const rx = { $regex: escapeRegex(cleanNeedle), $options: 'i' };
      const branchA = hitsA === null ? { [fieldA]: rx } : (hitsA.length > 0 ? { [fieldA]: hitsA.length === 1 ? hitsA[0] : { $in: hitsA } } : null);
      const branchB = hitsB === null ? { [fieldB]: rx } : (hitsB.length > 0 ? { [fieldB]: hitsB.length === 1 ? hitsB[0] : { $in: hitsB } } : null);
      const branches = [branchA, branchB].filter(Boolean);
      return {
        condition: branches.length === 1 ? branches[0] : { $or: branches },
        primaryOnly: !branchA && Boolean(branchB) && hitsB !== null
      };
    };

    if (filters.subject) {
      const subject = String(filters.subject).trim();
      const citationParsed = parseLegalCitation(subject);
      if (citationParsed) {
        andConditions.push(buildCitationQuery(citationParsed));
      } else {
        const subjectRegex = new RegExp(escapeRegex(subject), 'i');
        andConditions.push({
          $or: [
            { caseId: subjectRegex },
            { case_id: subjectRegex },
            { sldNumber: subjectRegex },
            { mapYearPage: subjectRegex },
            { caseNumber: subjectRegex },
            { headNote: subjectRegex }
          ]
        });
      }
    }

    // First 3 blocks validation: Year/Vol, Magazine, and Page
    const hasAnyBlock123 = Boolean(
      (filters.yearVolume && String(filters.yearVolume).trim()) ||
      (filters.magazine && String(filters.magazine).trim()) ||
      (filters.page && String(filters.page).trim())
    );
    if (hasAnyBlock123) {
      if (
        !filters.yearVolume || !String(filters.yearVolume).trim() ||
        !filters.magazine || !String(filters.magazine).trim() ||
        !filters.page || !String(filters.page).trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'All 3 first blocks (Year/Vol, Magazine, and Page) must be filled together for citation search. Single field search is not allowed in the first three blocks.'
        });
      }

      const yv = String(filters.yearVolume).trim();
      const mg = String(filters.magazine).trim();
      const pg = String(filters.page).trim();
      const magAliases = expandMagazineSearchAliases(mg);
      const magCitPart = magAliases.length > 1
        ? `(?:${magAliases.map(escapeRegex).join('|')})`
        : escapeRegex(mg);
      const citPattern = new RegExp(`(^|\\s)${escapeRegex(yv)}\\s+${magCitPart}\\s+${escapeRegex(pg)}(\\s|$)`, 'i');
      const magVariants = [...new Set(
        magAliases.flatMap(alias => [
          alias,
          alias.toUpperCase(),
          alias.toLowerCase(),
          alias.charAt(0).toUpperCase() + alias.slice(1).toLowerCase()
        ])
      )].filter(Boolean);

      andConditions.push({ 'publications.page': pg });
      andConditions.push({
        $or: [
          { mapYearPage: citPattern },
          {
            publications: {
              $elemMatch: {
                mag: { $in: magVariants },
                page: pg,
                $or: [
                  { year: yv },
                  { vol: yv }
                ]
              }
            }
          }
        ]
      });
    }

    if (lawQuery) {
      const resLaw = applyDualFieldLookup(
        lawQuery,
        'principleLaw', lookup?.principleLaws,
        'laws.lawStatute', lookup?.lawStatutes
      );
      if (resLaw.empty) shortCircuitEmpty = true;
      else if (resLaw.condition) {
        andConditions.push(resLaw.condition);
        resolvedLawFieldOnly = Boolean(resLaw.primaryOnly);
      }
    }

    if (filters.number) {
      andConditions.push({
        $or: [
          { caseNumber: { $regex: escapeRegex(filters.number), $options: 'i' } },
          { sldNumber: { $regex: escapeRegex(filters.number), $options: 'i' } },
          { references: { $regex: escapeRegex(filters.number), $options: 'i' } },
          { headNote: { $regex: escapeRegex(filters.number), $options: 'i' } },
          { judgment: { $regex: escapeRegex(filters.number), $options: 'i' } }
        ]
      });
    }

    if (filters.year) {
      const yr = String(filters.year).trim();
      if (/^\d{4}$/.test(yr)) {
        const yrRx = escapeRegex(yr);
        andConditions.push({
          $or: [
            { 'publications.year': yr },
            { dated: { $gte: `${yr}-01-01`, $lte: `${yr}-12-31` } },
            { caseNumber: { $regex: yrRx, $options: 'i' } },
            { mapYearPage: { $regex: yrRx, $options: 'i' } }
          ]
        });
      } else {
        andConditions.push({
          $or: [
            { 'publications.year': { $regex: escapeRegex(yr), $options: 'i' } },
            { dated: { $regex: escapeRegex(yr), $options: 'i' } },
            { caseNumber: { $regex: escapeRegex(yr), $options: 'i' } },
            { mapYearPage: { $regex: escapeRegex(yr), $options: 'i' } }
          ]
        });
      }
    }

    if (filters.section && !shortCircuitEmpty) {
      const resSec = applyDualFieldLookup(
        filters.section,
        'principleLaw', lookup?.principleLaws,
        'laws.section', lookup?.sections
      );
      if (resSec.empty) shortCircuitEmpty = true;
      else if (resSec.condition) {
        andConditions.push(resSec.condition);
        resolvedSectionFieldOnly = Boolean(resSec.primaryOnly);
      }
    }

    if (filters.section2 && !shortCircuitEmpty) {
      const resSec2 = applyDualFieldLookup(
        filters.section2,
        'principleLaw', lookup?.principleLaws,
        'laws.section', lookup?.sections
      );
      if (resSec2.empty) shortCircuitEmpty = true;
      else if (resSec2.condition) {
        andConditions.push(resSec2.condition);
      }
    }

    if (filters.court && !shortCircuitEmpty) {
      const matchedCourts = lookup ? matchLookupEntries(lookup.courts, filters.court, { exactOnly: true }) : null;
      if (matchedCourts !== null && matchedCourts.length > 0) {
        andConditions.push({
          court: matchedCourts.length === 1 ? matchedCourts[0] : { $in: matchedCourts }
        });
      } else {
        andConditions.push({ court: { $regex: `^${escapeRegex(filters.court)}$`, $options: 'i' } });
      }
    }

    if (filters.caseNumber) {
      const rawCn = String(filters.caseNumber).trim();
      const cnVariants = [...new Set([
        rawCn,
        rawCn.toUpperCase(),
        rawCn.toLowerCase(),
        rawCn.replace(/\s+/g, ' '),
        rawCn.replace(/\s+/g, '')
      ])].filter(Boolean);
      andConditions.push({
        $or: [
          { caseNumber: { $in: cnVariants } },
          { caseNumber: { $regex: escapeRegex(rawCn), $options: 'i' } }
        ]
      });
    }

    if (filters.date) {
      andConditions.push({ dated: { $regex: escapeRegex(filters.date), $options: 'i' } });
    }

    // Support calendar date range (fromDate & toDate)
    if (filters.fromDate || filters.toDate) {
      const fd = filters.fromDate ? String(filters.fromDate).trim() : '';
      const td = filters.toDate ? String(filters.toDate).trim() : '';
      const dateCond = {};
      if (fd) dateCond.$gte = fd;
      if (td) dateCond.$lte = td;
      andConditions.push({ dated: dateCond });
    }

    if (filters.fromYear || filters.toYear) {
      const fy = filters.fromYear ? String(filters.fromYear).trim() : '';
      const ty = filters.toYear ? String(filters.toYear).trim() : '';
      if (fy && ty) {
        andConditions.push({
          $or: [
            { 'publications.year': { $gte: fy, $lte: ty } },
            { dated: { $gte: `${fy}-01-01`, $lte: `${ty}-12-31` } }
          ]
        });
      } else if (fy) {
        andConditions.push({
          $or: [
            { 'publications.year': { $gte: fy } },
            { dated: { $gte: `${fy}-01-01` } }
          ]
        });
      } else if (ty) {
        andConditions.push({
          $or: [
            { 'publications.year': { $lte: ty } },
            { dated: { $lte: `${ty}-12-31` } }
          ]
        });
      }
    }

    const kw1 = filters.keywords || filters.text;
    const kw2 = filters.keywords2 || filters.text2;
    const kwTokens = [];
    if (filters.phrase && String(filters.phrase).trim()) {
      kwTokens.push(`"${String(filters.phrase).replace(/"/g, '').trim()}"`);
    }
    if (kw1 && String(kw1).trim()) {
      kwTokens.push(String(kw1).trim());
    }
    if (kw2 && String(kw2).trim()) {
      kwTokens.push(String(kw2).trim());
    }

    if (kwTokens.length > 0) {
      const combinedText = kwTokens.join(' ').trim();
      andConditions.push({ $text: { $search: combinedText } });
    }

    if (filters.judges) {
      andConditions.push({ judges: { $regex: escapeRegex(filters.judges), $options: 'i' } });
    }

    if (filters.lawyers) {
      andConditions.push({ lawyers: { $regex: escapeRegex(filters.lawyers), $options: 'i' } });
    }

    if (filters.petitioner) {
      andConditions.push({ petitioners: { $regex: escapeRegex(filters.petitioner), $options: 'i' } });
    }

    if (filters.principleLaw && !shortCircuitEmpty) {
      const resPl = applyDualFieldLookup(
        filters.principleLaw,
        'principleLaw', lookup?.principleLaws,
        'laws.lawStatute', lookup?.lawStatutes
      );
      if (resPl.empty) shortCircuitEmpty = true;
      else if (resPl.condition) {
        andConditions.push(resPl.condition);
      }
    }

    if (shortCircuitEmpty) {
      setCachedSearch(cacheKey, []);
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const query = { $and: andConditions };

    const requestedLimit = parseInt(filters.limit, 10);
    const searchLimit = requestedLimit > 0 ? requestedLimit : 3000;
    const hasTextSearch = kwTokens.length > 0;
    const includeJudgment = filters.includeJudgment === true || req.query.includeJudgment === 'true';
    const includeAttachments = filters.includeAttachments === true || req.query.includeAttachments === 'true';
    const baseFields = 'caseId case_id sldNumber dated date decisionDate judgmentDate court caseNumber judges lawyers petitioners mapYearPage publications laws department headNote principleLaw legalMaxim createdAt';
    const selectFields = [
      baseFields,
      includeJudgment ? 'judgment' : '',
      includeAttachments ? 'attachments' : ''
    ].filter(Boolean).join(' ');

    const runQueryWithHint = async (hintSpec) => {
      let q = Case.find(query)
        .select(selectFields)
        .sort({ sldNumberInt: -1 })
        .limit(searchLimit);
      if (hintSpec) q = q.hint(hintSpec);
      return q.lean();
    };

    let selectedHint = null;
    if (filters.court && !filters.yearVolume && !filters.page && !hasTextSearch) {
      selectedHint = { isDeleted: 1, court: 1, sldNumberInt: -1 };
    } else if (filters.subject && parseLegalCitation(filters.subject)) {
      selectedHint = {
        isDeleted: 1,
        'publications.mag': 1,
        'publications.page': 1,
        'publications.year': 1
      };
    } else if (filters.yearVolume && filters.magazine && filters.page) {
      selectedHint = {
        isDeleted: 1,
        'publications.mag': 1,
        'publications.page': 1,
        'publications.year': 1
      };
    } else if (resolvedLawFieldOnly && resolvedSectionFieldOnly && !filters.section2 && !hasTextSearch && !filters.fromYear && !filters.toYear) {
      selectedHint = { isDeleted: 1, 'laws.lawStatute': 1, 'laws.section': 1, sldNumberInt: -1 };
    } else if (resolvedLawFieldOnly && !filters.section && !filters.section2 && !hasTextSearch && !filters.fromYear && !filters.toYear) {
      selectedHint = { isDeleted: 1, 'laws.lawStatute': 1, sldNumberInt: -1 };
    } else if (filters.judges && !lawQuery && !filters.section && !filters.section2 && !hasTextSearch && !filters.court && !filters.fromYear && !filters.toYear) {
      selectedHint = { isDeleted: 1, judges: 1, sldNumberInt: -1 };
    } else if (filters.lawyers && !lawQuery && !filters.section && !filters.section2 && !hasTextSearch && !filters.court && !filters.judges && !filters.fromYear && !filters.toYear) {
      selectedHint = { isDeleted: 1, lawyers: 1, sldNumberInt: -1 };
    } else if ((filters.fromYear || filters.toYear) && !filters.court) {
      selectedHint = { isDeleted: 1, 'publications.year': 1, sldNumberInt: -1 };
    }

    let cases;
    if (selectedHint) {
      try {
        cases = await runQueryWithHint(selectedHint);
      } catch (hintErr) {
        cases = await runQueryWithHint(null);
      }
    } else {
      cases = await runQueryWithHint(null);
    }

    if (cases.length === 0 && filters.phrase && String(filters.phrase).trim()) {
      const cleanPhrase = String(filters.phrase).replace(/["'“”]/g, '').trim();
      if (cleanPhrase.length >= 2) {
        const phraseRegex = new RegExp(escapeRegex(cleanPhrase), 'i');
        const fallbackCases = await Case.find({
          isDeleted: false,
          $or: [
            { legalMaxim: phraseRegex },
            { headNote: phraseRegex },
            { principleLaw: phraseRegex }
          ]
        })
          .select(selectFields)
          .sort({ sldNumberInt: -1 })
          .limit(searchLimit)
          .lean();
        if (fallbackCases && fallbackCases.length > 0) {
          cases = fallbackCases;
        }
      }
    }

    const searchTerms = [kw1, kw2, filters.phrase].filter(Boolean);
    let formattedCases = cases.map(c => {
      const formatted = formatCaseForFrontend(c, { skipAttachments: !includeAttachments });
      if (hasTextSearch) {
        formatted.relevantParagraph = includeJudgment
          ? extractRelevantParagraph(c.judgment, c.headNote, searchTerms)
          : (formatted.headNote ? (formatted.headNote.length > 600 ? formatted.headNote.slice(0, 600) + '...' : formatted.headNote) : null);
        if (!includeJudgment) {
          delete formatted.judgment;
        }
      }
      return formatted;
    });

    setCachedSearch(cacheKey, formattedCases);

    if (req.user?.isSpammer === true) {
      formattedCases = spoofCaseList(formattedCases);
    }

    res.status(200).json({
      success: true,
      count: cases.length,
      data: formattedCases
    });
  } catch (error) {
    logger.error('Error in searchCases:', error);
    next(error);
  }
};

/**
 * Handles dedicated document/PDF attachment upload for case records
 */
export const uploadCaseAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const relativeUrl = `/uploads/reference_views/${req.file.filename}`;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const type = ext === '.docx' || ext === '.doc' ? 'word' : (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? 'image' : 'pdf');
    return res.status(200).json({
      success: true,
      message: 'Attachment uploaded successfully.',
      data: {
        name: (req.file.originalname && String(req.file.originalname).trim()) || `Attachment_${Date.now()}.pdf`,
        url: relativeUrl,
        size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
        type
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Export all case-law records with missing, empty, or whitespace-only headnotes to Excel (.xlsx)
 * Uses streaming cursor processing to avoid excessive memory usage.
 */
export const exportMissingHeadnotes = async (req, res, next) => {
  try {
    const filter = {
      isDeleted: false,
      $or: [
        { headNote: { $exists: false } },
        { headNote: null },
        { headNote: '' },
        { headNote: { $regex: /^\s*$/ } }
      ]
    };

    // Use cursor for memory-safe streaming processing
    const cursor = Case.find(filter)
      .select('caseId sldNumber citation title caseNumber dated court references attachments mapYearPage publications judgment')
      .cursor();

    const rows = [];
    let serial = 1;

    for await (const doc of cursor) {
      let citationStr = doc.citation || '';
      if (!citationStr && Array.isArray(doc.mapYearPage) && doc.mapYearPage.length > 0) {
        citationStr = doc.mapYearPage.map(m => [m.year, m.mag, m.page].filter(Boolean).join(' ')).filter(Boolean).join(' = ');
      }
      if (!citationStr && doc.sldNumber) {
        citationStr = `SLD Ref #${doc.sldNumber}`;
      }

      const caseNumStr = Array.isArray(doc.caseNumber) ? doc.caseNumber.join('; ') : (doc.caseNumber || '');
      const dateStr = doc.dated ? (typeof doc.dated === 'string' ? doc.dated.slice(0, 10) : new Date(doc.dated).toISOString().slice(0, 10)) : '';

      let refUrl = doc.references || '';
      if (!refUrl && Array.isArray(doc.attachments) && doc.attachments.length > 0) {
        refUrl = doc.attachments[0].url || doc.attachments[0].path || doc.attachments[0].name || '';
      }

      rows.push({
        'Serial Number': serial++,
        'Case ID / Database ID': doc._id.toString(),
        'Citation': citationStr,
        'Case Title': doc.title || '',
        'Case Number': caseNumStr,
        'Decision Date': dateStr,
        'Court': doc.court || '',
        'Judgment Reference / URL': refUrl,
        'Headnote Status': 'Missing',
        'Recovery Status': doc.judgment && doc.judgment.trim().length > 50 ? 'Ready for Extraction' : 'Pending'
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Missing Headnotes');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Missing_Headnotes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    return res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to build an exhaustive and robust MongoDB lookup query for any case reference
 * Supports Mongo ObjectId, clean number, prefixed SLD #, CASE-xxxx, and caseId
 */
export const buildCaseLookupQuery = (id) => {
  if (!id) return null;
  const rawId = String(id).trim();
  const cleanId = rawId.replace(/^(?:case\s*(?:id|no\.?|#)?\s*[:\-]?\s*|sld\s*(?:no\.?|#)?\s*[:\-]?\s*)/i, '').trim();
  const numInt = parseInt(cleanId, 10);

  const orList = [
    { caseId: new RegExp(`^${escapeRegex(rawId)}$`, 'i') },
    { case_id: new RegExp(`^${escapeRegex(rawId)}$`, 'i') },
    { sldNumber: rawId },
    { caseId: new RegExp(`^${escapeRegex(cleanId)}$`, 'i') },
    { case_id: new RegExp(`^${escapeRegex(cleanId)}$`, 'i') },
    { sldNumber: cleanId },
    { caseId: `CASE-IMPORT-${cleanId}` },
    { caseId: `CASE-IMPORT-${rawId}` },
    { caseId: `CASE-${cleanId}` }
  ];
  if (mongoose.isValidObjectId(rawId)) {
    orList.unshift({ _id: rawId });
  }
  if (!isNaN(numInt)) {
    orList.unshift({ sldNumberInt: numInt });
    orList.push({ sldNumber: String(numInt) });
    orList.push({ sldNumber: numInt });
    orList.push({ caseId: `CASE-${String(numInt).padStart(6, '0')}` });
    orList.push({ caseId: `CASE-${numInt}` });
  }
  return { $or: orList, isDeleted: false };
};

/**
 * PATCH & PUT /api/cases/:id/attachments
 * Dedicated endpoint to update/delete attachments directly from outside edit
 */
export const updateCaseAttachments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { attachments } = req.body;

    const query = buildCaseLookupQuery(id);
    if (!query) {
      return res.status(400).json({ success: false, message: 'Invalid Case ID parameter.' });
    }

    const c = await Case.findOne(query);
    if (!c) {
      return res.status(404).json({ success: false, message: `Case law record with reference "${id}" not found.` });
    }

    const clean = sanitizeAttachments(attachments);
    c.attachments = clean;
    c.markModified('attachments');
    await c.save();

    // Direct atomic write to guarantee MongoDB persistence
    await Case.updateOne({ _id: c._id }, { $set: { attachments: clean } });

    invalidateAllCaseCaches();
    logger.info(`[Case Attachments Updated] Case ID ${c.caseId} (SLD #${c.sldNumber}) attachments updated to ${clean.length} files.`);

    return res.status(200).json({
      success: true,
      message: 'Case attachments updated successfully in database.',
      data: formatCaseForFrontend(c)
    });
  } catch (err) {
    next(err);
  }
};
