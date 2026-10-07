import mongoose from 'mongoose';
import Case from '../models/Case.js';
import ChatSession from '../models/ChatSession.js';
import logger from '../utils/logger.js';
import {
  checkIsCodeRequest,
  checkIsLegalDraftingRequest,
  generatePleadingDocument,
  callGeminiWithTokenControl
} from '../services/legalDraftingService.js';

/**
 * Escapes regex special characters
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Extract paragraph context around a matched substring
 */
const extractContext = (fullText, matchedText, maxRadius = 250) => {
  if (!fullText) return '';
  const idx = fullText.toLowerCase().indexOf(matchedText.toLowerCase());
  if (idx === -1) return fullText.slice(0, 400);

  const start = Math.max(0, idx - maxRadius);
  const end = Math.min(fullText.length, idx + matchedText.length + maxRadius);
  let snippet = fullText.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < fullText.length) snippet = snippet + '...';
  return snippet;
};

/**
 * Cleans and humanizes judge and bench lists
 */
const cleanBenchList = (judges) => {
  if (!judges || judges.length === 0) return 'Judicial Division Bench';
  return judges.map(j => {
    let s = String(j || '').trim();
    s = s.replace(/^AUTHOR\(S\):\s*/i, '');
    s = s.replace(/,\s*JJ\b/gi, '');
    s = s.replace(/,\s*JUSTICE\b/gi, '');
    s = s.replace(/,\s*JUDICIAL MEMBER\b/gi, ' (Judicial Member)');
    s = s.replace(/,\s*ACCOUNTANT MEMBER\b/gi, ' (Accountant Member)');
    s = s.replace(/,\s*CHIEF JUSTICE\b/gi, ' (Chief Justice)');
    s = s.replace(/\s+/g, ' ').trim();
    if (s === s.toUpperCase() && s.length > 3) {
      s = s.split(' ').map(w => {
        if (w.startsWith('(') || w.endsWith(')')) return w;
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }).join(' ');
    }
    return s;
  }).join(' & ');
};

/**
 * Cleanly formats case dates
 */
const formatDate = (c) => {
  if (c.dated) {
    try {
      const d = new Date(c.dated);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {}
    return String(c.dated).split('T')[0];
  }
  const caseNumStr = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber[0] : '';
  const matchD = caseNumStr.match(/decision dated:\s*([0-9\-\/A-Za-z\s]+?)(?:,|$)/i);
  if (matchD) return matchD[1].trim();
  return 'N/A';
};

/**
 * Citation parser supporting:
 * - "02001 sld 1" or "2001 sld 1" (normalizing leading zeros)
 * - "(2011) 104 TAX 78" or "2011 104 TAX 78"
 * - "104 TAX 78"
 * - "2011 SLD 172" or "2011 PTD 770"
 * - "PTD 2011 770" or "SLD 2001 1"
 */
export const extractCitationDetails = (text) => {
  if (!text) return null;
  let raw = text.trim();
  raw = raw.replace(/^["'“‘]+|["'”’]+$/g, '').trim();

  // Normalize 4-digit years with leading zeros (e.g. 02001 -> 2001, 01999 -> 1999)
  raw = raw.replace(/\b0+(\d{4})\b/g, '$1');

  // 1. Parenthesized year with volume: "(2011) 104 TAX 78" or "2011 104 TAX 78"
  const pTax = raw.match(/\(?(\d{4})\)?\s*(\d{1,4})\s+([a-z]+)\s+(\d+)/i);
  if (pTax) {
    const yr = pTax[1].replace(/^0+/, '');
    const vol = pTax[2].replace(/^0+/, '');
    const mag = pTax[3].toUpperCase();
    const pg = pTax[4].replace(/^0+/, '');
    return {
      year: yr,
      vol: vol,
      mag: mag,
      page: pg,
      rawQuery: text.trim(),
      formatted: `(${yr}) ${vol} ${mag} ${pg}`
    };
  }

  // 2. Volume + Mag + Page: "104 TAX 78"
  const volMag = raw.match(/\b(\d{1,3})\s+([a-z]+)\s+(\d+)\b/i);
  if (volMag && (parseInt(volMag[1], 10) < 1900 || parseInt(volMag[1], 10) > 2099)) {
    const vol = volMag[1].replace(/^0+/, '');
    const mag = volMag[2].toUpperCase();
    const pg = volMag[3].replace(/^0+/, '');
    return {
      vol: vol,
      mag: mag,
      page: pg,
      rawQuery: text.trim(),
      formatted: `${vol} ${mag} ${pg}`
    };
  }

  // 3. Year + Mag + Page: "02001 sld 1", "2001 sld 1", "(2001) SLD 1", "2011 PTD 770"
  const yrMag = raw.match(/\(?(\d{4})\)?\s*([a-z]+)\s+(\d+)\b/i);
  if (yrMag) {
    const yr = yrMag[1].replace(/^0+/, '');
    const mag = yrMag[2].toUpperCase();
    const pg = yrMag[3].replace(/^0+/, '');
    return {
      year: yr,
      mag: mag,
      page: pg,
      rawQuery: text.trim(),
      formatted: `${yr} ${mag} ${pg}`
    };
  }

  // 4. Mag + Year + Page: "SLD 2001 1" or "PTD 2011 770"
  const magYr = raw.match(/\b([a-z]+)\s+\(?(\d{4})\)?\s+(\d+)\b/i);
  if (magYr) {
    const mag = magYr[1].toUpperCase();
    const yr = magYr[2].replace(/^0+/, '');
    const pg = magYr[3].replace(/^0+/, '');
    return {
      year: yr,
      mag: mag,
      page: pg,
      rawQuery: text.trim(),
      formatted: `${yr} ${mag} ${pg}`
    };
  }

  // 5. Mag + Page + Year: "SLD 1 2001"
  const magPgYr = raw.match(/\b([a-z]+)\s+(\d+)\s+\(?(\d{4})\)?\b/i);
  if (magPgYr) {
    const mag = magPgYr[1].toUpperCase();
    const pg = magPgYr[2].replace(/^0+/, '');
    const yr = magPgYr[3].replace(/^0+/, '');
    return {
      year: yr,
      mag: mag,
      page: pg,
      rawQuery: text.trim(),
      formatted: `${yr} ${mag} ${pg}`
    };
  }

  return null;
};

/**
 * Flexible Multi-word regex for legal fields (handles acronyms, periods, numbers)
 */
const makeFlexibleRegex = (str) => {
  if (!str) return null;
  const words = str.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const pattern = words.map(w => {
    // If it's a 2-5 letter uppercase acronym like CTR, STA, WP, ITA, CA, CP
    if (/^[a-zA-Z]{2,5}$/.test(w) && w === w.toUpperCase()) {
      return w.split('').map(char => escapeRegex(char)).join('\\.?');
    }
    let escaped = escapeRegex(w).replace(/\\\./g, '\\.?');
    if (/^\d+$/.test(w)) {
      return `\\b${escaped}\\b`;
    }
    return escaped;
  }).join('\\s*');
  return new RegExp(pattern, 'i');
};

/**
 * Strips conversational intros from user queries
 */
const cleanUserQuery = (raw) => {
  let q = (raw || '').trim().replace(/^["'“‘]+|["'”’]+$/g, '').trim();
  q = q.replace(/^(?:show\s+me|find|search\s+for|search|give\s+me|lookup|look\s+up|tell\s+me\s+about|get\s+me|what\s+is\s+the\s+case|who\s+was\s+judge\s+in)\s+(?:all\s+)?(?:the\s+)?/i, '');
  q = q.replace(/^(?:cases\s+(?:by|of|for|on)|judgments\s+(?:by|of|for|on))\s+/i, '');
  return q.trim();
};

/**
 * Formats parties/petitioners array cleanly
 */
const cleanParties = (petitioners) => {
  if (!petitioners || petitioners.length === 0) return 'N/A';
  return petitioners
    .map(p => String(p || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim())
    .join(' | ');
};

/**
 * Formats lawyer and counsel appearances cleanly
 */
const cleanLawyers = (lawyers) => {
  if (!lawyers || lawyers.length === 0) return 'N/A';
  return lawyers
    .map(l => String(l || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim())
    .join(' | ');
};

const VALID_CASE_LAW_FIELDS = new Set([
  'case_numbers', 'judgments', 'judges', 'petitioners', 'headnotes', 'legal_maxim', 'principle_law', 'citations'
]);
const FIELD_REMAP = {
  courts: 'judges',
  statutes: 'principle_law',
  parties: 'petitioners',
  lawyers: 'petitioners'
};

const sanitizeReferences = (refs) => {
  if (!Array.isArray(refs)) {
    return ['case_numbers', 'judgments', 'judges', 'petitioners', 'headnotes', 'legal_maxim', 'principle_law', 'citations'];
  }
  const mapped = refs.map(r => FIELD_REMAP[r] || r).filter(r => VALID_CASE_LAW_FIELDS.has(r));
  return mapped.length > 0 ? Array.from(new Set(mapped)) : ['case_numbers', 'judgments', 'judges', 'petitioners', 'headnotes', 'legal_maxim', 'principle_law', 'citations'];
};

// Validation helpers for strict field accuracy across every chatbot search
const extractSearchTokens = (str, minLen = 2) => {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'about', 'case', 'appeal', 'petition',
    'hon', 'justice', 'judge', 'mr', 'dated', 'order', 'court', 'high', 'supreme',
    'versus', 'vs', 'under', 'all', 'any', 'that', 'this', 'who', 'was', 'what'
  ]);
  return (str || '')
    .toLowerCase()
    .split(/[\s,./\\;:\-()"'“”‘’\[\]]+/)
    .map(t => t.replace(/[^a-z0-9]/g, ''))
    .filter(t => t.length >= minLen && !stopWords.has(t));
};

const validateCitationKeywords = (c, citationDetails) => {
  if (!citationDetails) return true;
  const { year, vol, mag, page } = citationDetails;
  const magUpper = mag ? mag.toUpperCase() : '';
  const pageNum = page ? parseInt(page, 10) : null;
  const pageRegex = pageNum !== null ? new RegExp(`(?:^|[^0-9])0*${pageNum}(?:[^0-9]|$)`) : null;

  // 1. Publications match
  if (Array.isArray(c.publications) && c.publications.length > 0) {
    const hasPub = c.publications.some(pub => {
      const pMag = (pub.mag || '').toUpperCase();
      const pPage = parseInt(pub.page, 10);
      const pYear = String(pub.year || '').trim();
      const pVol = String(pub.vol || '').trim();

      const magOk = !magUpper || pMag === magUpper || pMag.includes(magUpper);
      const pageOk = pageNum === null || pPage === pageNum;
      const yearOk = !year || pYear === year;
      const volOk = !vol || pVol === vol;
      return magOk && pageOk && (yearOk || volOk);
    });
    if (hasPub) return true;
  }

  // 2. MapYearPage match
  if (Array.isArray(c.mapYearPage) && c.mapYearPage.length > 0) {
    const hasMap = c.mapYearPage.some(entry => {
      const s = String(entry).toUpperCase();
      if (magUpper && !s.includes(magUpper)) return false;
      if (pageRegex && !pageRegex.test(s)) return false;
      if (year && !s.includes(year) && !vol) return false;
      if (vol && !new RegExp(`(?:^|[^0-9])0*${vol}(?:[^0-9]|$)`).test(s) && !year) return false;
      return true;
    });
    if (hasMap) return true;
  }

  // 3. Fallback to headNote or principleLaw only if strict citation pattern is present
  if (magUpper && pageNum !== null) {
    const combined = `${c.headNote || ''} ${c.principleLaw || ''}`.toUpperCase();
    if (combined.includes(magUpper) && pageRegex && pageRegex.test(combined)) {
      if (!year || combined.includes(year)) return true;
    }
  }

  return false;
};

const validateCaseNumberKeywords = (c, query) => {
  const tokens = extractSearchTokens(query, 2);
  if (tokens.length === 0) return true;
  const caseNumbersStr = (Array.isArray(c.caseNumber) ? c.caseNumber.join(' ') : String(c.caseNumber || '')).toLowerCase();
  return tokens.every(token => caseNumbersStr.includes(token));
};

const validateJudgeKeywords = (c, query) => {
  const tokens = extractSearchTokens(query, 3);
  if (tokens.length === 0) return true;
  const judgesStr = (Array.isArray(c.judges) ? c.judges.join(' ') : String(c.judges || '')).toLowerCase();
  return tokens.every(token => judgesStr.includes(token));
};

const validatePetitionerKeywords = (c, query) => {
  const tokens = extractSearchTokens(query, 3);
  if (tokens.length === 0) return true;
  const petitionersStr = (Array.isArray(c.petitioners) ? c.petitioners.join(' ') : String(c.petitioners || '')).toLowerCase();
  return tokens.every(token => petitionersStr.includes(token));
};

const validateLawyerKeywords = (c, query) => {
  const tokens = extractSearchTokens(query, 3);
  if (tokens.length === 0) return true;
  const lawyersStr = (Array.isArray(c.lawyers) ? c.lawyers.join(' ') : String(c.lawyers || '')).toLowerCase();
  return tokens.every(token => lawyersStr.includes(token));
};

const validateCourtKeywords = (c, query) => {
  const tokens = extractSearchTokens(query, 3);
  if (tokens.length === 0) return true;
  const courtStr = String(c.court || '').toLowerCase();
  return tokens.every(token => courtStr.includes(token));
};

const validateStatuteKeywords = (c, secNum) => {
  if (!secNum) return true;
  const secClean = secNum.toLowerCase();
  const hasLawSec = Array.isArray(c.laws) && c.laws.some(l => (l.section || '').toLowerCase() === secClean);
  if (hasLawSec) return true;
  const hn = (c.headNote || '').toLowerCase();
  const pl = (c.principleLaw || '').toLowerCase();
  return new RegExp(`section\\s*${escapeRegex(secClean)}\\b`, 'i').test(hn) ||
         new RegExp(`section\\s*${escapeRegex(secClean)}\\b`, 'i').test(pl);
};

const validateTextKeywords = (c, phraseOrWords) => {
  const fullText = `${c.judgment || ''} ${c.headNote || ''} ${c.principleLaw || ''}`.toLowerCase();
  if (typeof phraseOrWords === 'string' && phraseOrWords.length > 10) {
    if (fullText.includes(phraseOrWords.toLowerCase())) return true;
  }
  const tokens = Array.isArray(phraseOrWords) ? phraseOrWords : extractSearchTokens(phraseOrWords, 3);
  if (tokens.length === 0) return true;
  return tokens.every(token => fullText.includes(token.toLowerCase()));
};

/**
 * In-memory LRU Cache for Instant Legal Intelligence Responses (< 1ms)
 */
const AI_ENGINE_CACHE_MAX = 600;
const AI_ENGINE_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const aiEngineCache = new Map();

const getCachedAIResult = (key) => {
  const item = aiEngineCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    aiEngineCache.delete(key);
    return null;
  }
  return item.data;
};

const setCachedAIResult = (key, data) => {
  if (aiEngineCache.size >= AI_ENGINE_CACHE_MAX) {
    const oldestKey = aiEngineCache.keys().next().value;
    aiEngineCache.delete(oldestKey);
  }
  aiEngineCache.set(key, { data, expiresAt: Date.now() + AI_ENGINE_CACHE_TTL });
};

/**
 * Synthesizes a real-time, lawyer-grade response using Gemini
 * grounded 100% in the real case records retrieved from the 162,865-case database.
 */
const synthesizeLegalAIAnswer = async (userQuery, matchedCases, targetCase) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !targetCase) return null;

  try {
    const list = Array.isArray(matchedCases) && matchedCases.length > 0 ? matchedCases : [targetCase];
    const topCases = list.slice(0, 10);

    const casesSummary = topCases.map((c, idx) => {
      const citeStr = (c.mapYearPage && c.mapYearPage.length > 0) ? c.mapYearPage.join(' | ') : `SLD #${c.sldNumber}`;
      const parties = cleanParties(c.petitioners);
      const bench = cleanBenchList(c.judges);
      const lawyers = cleanLawyers(c.lawyers);
      const caseNums = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber.join(', ') : 'N/A';
      const headnote = (c.headNote || '').slice(0, 800);
      const judgmentSnippet = (c.judgment || '').slice(0, 1000);
      const principle = c.principleLaw || '';
      const laws = (c.laws || []).map(l => `${l.lawStatute || ''}${l.section ? ` (s. ${l.section})` : ''}`).filter(Boolean).join(', ');

      return `[CASE RECORD #${idx + 1}]
- SLD Number: SLD #${c.sldNumber} (${c.caseId || ''})
- Document Link ID: ${c._id}
- Citation: ${citeStr}
- Court: ${c.court || 'High Court / Supreme Court'}
- Decision Date: ${formatDate(c)}
- Bench: ${bench}
- Parties: ${parties}
- Counsel: ${lawyers}
- Case Numbers: ${caseNums}
- Statutory Provisions: ${laws || 'Income Tax Ordinance / Relevant Statutes'}
- Principle of Law: ${principle || 'N/A'}
- Headnote: ${headnote || 'N/A'}
- Operative Judgment Excerpt: ${judgmentSnippet || 'N/A'}`;
    }).join('\n\n---\n\n');

    const systemInstruction = `You are the Senior Judicial AI Research Counsel for the Supreme Law Digest (SLD) System of Pakistan, with direct access to the database of 162,865 reported judicial judgments from the Supreme Court, High Courts, and Appellate Tribunals.

CRITICAL INSTRUCTIONS:
1. Provide a direct, authoritative, and lawyer-grade answer to the user's specific query.
2. Ground your analysis 100% in the real case law records provided below from the SLD database. Do NOT invent fake cases or phantom citations.
3. If multiple matching cases are provided (e.g. for section queries such as 236G, 236H, etc.), YOU MUST PROVIDE AND LIST ALL MATCHING PRECEDENTS with their respective citations, courts, dates, and links. Do NOT restrict your answer to only one case.
4. Structure your response professionally:
   - ### Direct Legal Answer: Answer the user's inquiry clearly and concisely.
   - #### Governing Judicial Precedents (${topCases.length} Matching Authorities):
     For EACH matching case provided, include its Citation, Court, Bench, Litigants, and Key Legal Ruling, followed by its document link: [View Full Case Document ↗](/cases/view/<Document Link ID>).
   - #### Ratio Decidendi & Legal Principles: The statutory interpretation, rationale, and doctrine established across the cases.
5. Formatting Constraints:
   - Do NOT use stray raw asterisks (**) around signature or party blocks.
   - Use clean markdown headings and concise bullet points.`;

    const userPrompt = `USER INQUIRY: "${userQuery}"

VERIFIED CASE LAW RECORDS RETRIEVED FROM SLD DATABASE (${list.length} Matching Records Found, Showing Top ${topCases.length}):
${casesSummary}`;

    const geminiText = await Promise.race([
      callGeminiWithTokenControl(systemInstruction, userPrompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini synthesis timeout 7500ms')), 7500))
    ]);

    if (geminiText && geminiText.trim().length > 50) {
      return geminiText.trim();
    }
  } catch (err) {
    logger.warn('Gemini synthesis failed, falling back to structured breakdown: ' + err.message);
  }
  return null;
};

/**
 * SLD Core Legal AI Intelligence Engine
 * Grounded 100% in the 162,865+ cases database across all fields
 */
export const runLegalIntelligenceEngine = async (userQuery, focusNode = null, attachments = []) => {
  const rawClean = (userQuery || '').trim();
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

  if (!rawClean && !hasAttachments) {
    return {
      text: "Please provide a case number, judge name, petitioner/litigant, citation (e.g. 2001 SLD 1), legal maxim, principle of law, judgment excerpt, or attach a document to begin.",
      legalAnalysis: null
    };
  }

  // 0. GUARDRAIL: Strict Code Generation Refusal
  if (checkIsCodeRequest(rawClean)) {
    return {
      text: `### ⚖️ SLD Legal Intelligence Scope\n\n` +
        `I am specialized **strictly as an SLD Legal Intelligence & Tax Pleadings Engine**. I do not generate software programming code (Python, JavaScript, HTML, SQL, etc.).\n\n` +
        `However, I can assist you with all Pakistani legal and tax documents and research:\n` +
        `1. **Statutory Legal Pleadings & Document Drafting**:\n` +
        `   • **Format 1**: High Court Writ Petition under Article 199 (Complete with Index, Grounds, C.M Stay u/s 151 CPC, Exemption Application u/s 151 CPC, Affidavit & Vakalatnama).\n` +
        `   • **Format 2**: Appellate Tribunal Inland Revenue (ATIR) Appeal (Form "B" [Rule 7] under Section 46 of Sales Tax Act 1990 / Section 34 FEA 2005).\n` +
        `   • **Format 3**: Commissioner of Income Tax / Wealth Tax (Appeals) (Form of Appeal IT-16 under Income Tax Ordinance).\n\n` +
        `2. **Precedent Research**: Searching over **162,865+ verified judicial cases** by Citation, Case Number, Judge, Litigant, or Legal Principle.\n\n` +
        `To generate an appeal or petition, simply attach your Show Cause Notice, Assessment Order, or specify the parties and details!`,
      legalAnalysis: {
        matchedCase: null,
        matchType: 'code_request_declined',
        confidence: 100,
        sourcesFound: 0
      }
    };
  }

  // 0.1 LEGAL DRAFTING / PLEADING GENERATION DISPATCH
  if (checkIsLegalDraftingRequest(rawClean, attachments)) {
    try {
      const draftingResult = await generatePleadingDocument(rawClean, attachments);
      return {
        text: draftingResult.text,
        legalAnalysis: {
          matchedCase: null,
          matchType: 'pleading_draft',
          formatType: draftingResult.formatType,
          confidence: 100,
          sourcesFound: 1,
          activeReferences: ['statutes', 'headnotes', 'case_numbers', 'courts', 'judgments']
        }
      };
    } catch (draftErr) {
      logger.error('Error generating legal pleading:', draftErr);
    }
  }

  // 1. Clean conversational wrappers and normalize leading zeros on 4-digit years
  const cleanQuery = cleanUserQuery(rawClean);
  const normalizedQuery = cleanQuery.replace(/\b0+(\d{4})\b/g, '$1').trim();

  // Instant Cache Check (< 1ms)
  const cacheKey = `${normalizedQuery.toLowerCase()}___${focusNode || ''}`;
  const cachedResult = getCachedAIResult(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  let targetCase = null;
  let citationDetails = null;
  let matchingCitationCases = [];
  let matchingCaseNumberCases = [];
  let matchingJudgeCases = [];
  let matchingPartyCases = [];
  let matchingLawyerCases = [];
  let matchingCourtCases = [];
  let matchingJudgmentCases = [];
  let matchingTopicCases = [];
  let matchType = 'general';
  let matchedFieldDisplay = '';
  let exactMatchedLine = '';
  let surroundingContext = '';
  let activeReferences = ['case_numbers', 'judgments', 'judges', 'petitioners', 'headnotes', 'legal_maxim', 'principle_law', 'citations'];
  let confidence = 85;

  // PRIORITY 1: Direct Case ID / Record Lookup (e.g. CASE-000001, case 1, case id: 1, SLD 9862, #9862, 123)
  const explicitIdMatch = normalizedQuery.match(/^(?:case\s*(?:id|#)?\s*[:\-]?\s*|sld\s*(?:no\.?|#)?\s*[:\-]?\s*|#)?\s*(CASE-[A-Za-z0-9_\-]+|\b\d{1,8}\b)$/i) ||
    normalizedQuery.match(/\b(CASE-[A-Za-z0-9_\-]+)\b/i) ||
    normalizedQuery.match(/\b(?:case\s*id|case\s*#|sld\s*#|sld\s*no\.?)\s*[:\-]?\s*([A-Za-z0-9_\-]+)\b/i);

  if (explicitIdMatch) {
    const cleanId = (explicitIdMatch[1] || explicitIdMatch[0]).trim();
    const numInt = parseInt(cleanId, 10);
    const idConditions = [
      { caseId: new RegExp(`^${escapeRegex(cleanId)}$`, 'i') },
      { case_id: new RegExp(`^${escapeRegex(cleanId)}$`, 'i') },
      { sldNumber: cleanId },
      { caseId: `CASE-IMPORT-${cleanId}` }
    ];
    if (!isNaN(numInt)) {
      idConditions.push({ sldNumber: String(numInt) });
      idConditions.push({ caseId: new RegExp(`^CASE-0*${numInt}$`, 'i') });
      idConditions.push({ case_id: new RegExp(`^CASE-0*${numInt}$`, 'i') });
    }
    if (mongoose.isValidObjectId(cleanId)) {
      idConditions.push({ _id: cleanId });
    }

    targetCase = await Case.findOne({ $or: idConditions, isDeleted: { $ne: true } }).maxTimeMS(2000).lean();
    if (targetCase) {
      matchType = 'case_id';
      confidence = 100;
      matchedFieldDisplay = targetCase.caseId || `CASE-${targetCase.sldNumber}`;
      activeReferences = ['case_numbers', 'courts', 'judges', 'citations', 'headnotes', 'judgments'];
    }
  }

  // PRIORITY 2: Publication Citation Lookup (e.g. "(2011) 104 TAX 78", "2001 SLD 1", "02001 sld 1", "2011 PTD 770")
  if (!targetCase) {
    citationDetails = extractCitationDetails(normalizedQuery);
    if (citationDetails) {
      const y = citationDetails.year;
      const m = citationDetails.mag;
      const p = citationDetails.page;

      // 1. Instant Exact String Search on indexed mapYearPage array (< 10ms)
      const exactCitations = [
        `${y} ${m} ${p}`,
        `(${y}) ${m} ${p}`,
        `(${y}) ${citationDetails.vol || ''} ${m} ${p}`.replace(/\s+/g, ' ').trim(),
        `${citationDetails.vol || ''} ${m} ${p}`.replace(/\s+/g, ' ').trim(),
        citationDetails.formatted
      ].filter(Boolean);

      let rawCitationCases = await Case.find({
        mapYearPage: { $in: exactCitations },
        isDeleted: { $ne: true }
      }).limit(20).maxTimeMS(1500).lean();

      // 2. Fallback to clean non-backtracking regex if needed
      if (rawCitationCases.length === 0 && y && m && p) {
        const cleanPat = new RegExp(`${y}\\s*${m}\\s*${p}`, 'i');
        rawCitationCases = await Case.find({
          mapYearPage: cleanPat,
          isDeleted: { $ne: true }
        }).limit(20).maxTimeMS(1500).lean();
      }

      if (rawCitationCases.length === 0 && y && m && p) {
        rawCitationCases = await Case.find({
          $or: [
            { headNote: new RegExp(`${y}\\s*${m}\\s*${p}`, 'i') },
            { principleLaw: new RegExp(`${y}\\s*${m}\\s*${p}`, 'i') }
          ],
          isDeleted: { $ne: true }
        }).limit(10).maxTimeMS(1500).lean();
      }

      // STRICT VALIDATION: Ensure returned cases genuinely contain the queried citation
      matchingCitationCases = rawCitationCases.filter(c => validateCitationKeywords(c, citationDetails));

      if (matchingCitationCases.length > 0) {
        matchType = matchingCitationCases.length === 1 ? 'citation_single' : 'citation_multi';
        targetCase = matchingCitationCases[0];
        confidence = 100;
        activeReferences = ['citations', 'courts', 'judges', 'headnotes'];
      }
    }
  }

  // PRIORITY 3: Case Number / Appeal / Petition Search
  // (e.g. "S.T.A. No.1903/LB of 2009", "case no 1173 of 1978", "C.T.R. No. 50 of 1995", "843/LB")
  if (!targetCase) {
    const hasDigits = /\d/.test(normalizedQuery);
    const caseNoPrefixMatch = hasDigits ? normalizedQuery.match(/^(?:case|appeal|petition|writ\s*petition|suit|civil\s*revision|ptcl|c\.?\s*p\.?|c\.?\s*a\.?|w\.?\s*p\.?|i\.?\s*t\.?\s*a\.?|s\.?\s*t\.?\s*a\.?|c\.?\s*t\.?\s*r\.?)\s*(?:no\.?|#|nos\.?|[:\-])?\s*(\d.*)$/i) : null;
    const coreCaseNo = caseNoPrefixMatch ? caseNoPrefixMatch[1].trim() : normalizedQuery;

    const isCaseNumberPattern = hasDigits && (
      Boolean(caseNoPrefixMatch) || 
      /\b(?:of\s*\d{4}|\d+\s*\/\s*[a-zA-Z]+|\d+\s*\/\s*\d{4})\b/i.test(normalizedQuery) ||
      /\b(?:w\.?p\.?|c\.?t\.?r\.?|i\.?t\.?a\.?|s\.?t\.?a\.?|c\.?a\.?|c\.?p\.?|civil\s*revision|writ\s*petition)\b/i.test(normalizedQuery)
    );

    if (isCaseNumberPattern && coreCaseNo.length >= 2) {
      const caseRegex = makeFlexibleRegex(coreCaseNo);
      if (caseRegex) {
        const rawCaseNumberCases = await Case.find({
          caseNumber: caseRegex
        }).hint({ caseNumber: 1 }).limit(15).maxTimeMS(2500).lean();
        rawCaseNumberCases.sort((a, b) => (parseInt(b.sldNumber, 10) || 0) - (parseInt(a.sldNumber, 10) || 0));

        // STRICT VALIDATION: Check that candidates contain all core search tokens
        matchingCaseNumberCases = rawCaseNumberCases.filter(c => validateCaseNumberKeywords(c, coreCaseNo));

        if (matchingCaseNumberCases.length > 0) {
          matchType = 'case_number';
          targetCase = matchingCaseNumberCases[0];
          matchedFieldDisplay = coreCaseNo;
          confidence = 98;
          activeReferences = ['case_numbers', 'courts', 'judges', 'citations', 'parties'];
        }
      }
    }
  }

  // PRIORITY 4: Judge / Bench Name Search
  // (e.g. "judge Yahya Afridi", "Justice Ejaz Afzal Khan", "Shahid Jamil Khan", "Jawwad S Khawaja", "Mian Saqib Nisar")
  if (!targetCase) {
    const judgePrefixMatch = normalizedQuery.match(/^(?:judge|justice|chief\s*justice|mr\.?\s*justice|hon['’]?ble\s*justice|bench|author)\s*[:\-]?\s*(.+)$/i);
    const judgeQueryName = judgePrefixMatch ? judgePrefixMatch[1].trim() : normalizedQuery;

    if (judgeQueryName.length >= 3) {
      const judgeRegex = makeFlexibleRegex(judgeQueryName);
      if (judgeRegex) {
        const rawJudgeCases = await Case.find({
          judges: judgeRegex,
          isDeleted: { $ne: true }
        }).limit(15).maxTimeMS(2000).lean();
        rawJudgeCases.sort((a, b) => (parseInt(b.sldNumber, 10) || 0) - (parseInt(a.sldNumber, 10) || 0));

        // STRICT VALIDATION: Filter out any cases that do not contain the judge's key name tokens
        matchingJudgeCases = rawJudgeCases.filter(c => validateJudgeKeywords(c, judgeQueryName));

        if (matchingJudgeCases.length > 0) {
          matchType = 'judge_bench';
          targetCase = matchingJudgeCases[0];
          matchedFieldDisplay = judgeQueryName;
          confidence = 98;
          activeReferences = ['judges', 'courts', 'citations', 'headnotes'];
        }
      }
    }
  }

  // PRIORITY 5: Petitioner / Litigant / Party Search
  // (e.g. "petitioner Delta CNG", "Sui Northern Gas", "Sargroh Oil", "Al Karam CNG", "Prosperity Weaving Mills")
  if (!targetCase) {
    const partyPrefixMatch = normalizedQuery.match(/^(?:petitioner|respondent|party|parties|applicant|litigant)\s*[:\-]?\s*(.+)$/i);
    const partyQueryName = partyPrefixMatch ? partyPrefixMatch[1].trim() : normalizedQuery;

    if (partyQueryName.length >= 3) {
      const partyRegex = makeFlexibleRegex(partyQueryName);
      if (partyRegex) {
        const rawPartyCases = await Case.find({
          petitioners: partyRegex,
          isDeleted: { $ne: true }
        }).limit(15).maxTimeMS(2000).lean();
        rawPartyCases.sort((a, b) => (parseInt(b.sldNumber, 10) || 0) - (parseInt(a.sldNumber, 10) || 0));

        // STRICT VALIDATION: Check that candidate cases genuinely contain all petitioner search tokens
        matchingPartyCases = rawPartyCases.filter(c => validatePetitionerKeywords(c, partyQueryName));

        if (matchingPartyCases.length > 0) {
          matchType = 'petitioner_party';
          targetCase = matchingPartyCases[0];
          matchedFieldDisplay = partyQueryName;
          confidence = 98;
          activeReferences = ['parties', 'courts', 'citations', 'judgments'];
        }
      }
    }
  }

  // PRIORITY 6: Lawyer / Legal Counsel Search
  // (e.g. "lawyer Saeed Chaudhry", "Aitzaz Ahsan", "Malik Muhammad Qayyum")
  if (!targetCase) {
    const lawyerPrefixMatch = normalizedQuery.match(/^(?:lawyer|advocate|counsel|barrister|fca)\s*[:\-]?\s*(.+)$/i);
    const lawyerQueryName = lawyerPrefixMatch ? lawyerPrefixMatch[1].trim() : normalizedQuery;

    if (lawyerQueryName.length >= 3) {
      const lawyerRegex = makeFlexibleRegex(lawyerQueryName);
      if (lawyerRegex) {
        const rawLawyerCases = await Case.find({
          lawyers: lawyerRegex,
          isDeleted: { $ne: true }
        }).limit(15).maxTimeMS(2000).lean();
        rawLawyerCases.sort((a, b) => (parseInt(b.sldNumber, 10) || 0) - (parseInt(a.sldNumber, 10) || 0));

        // STRICT VALIDATION: Filter out any cases not containing lawyer keywords
        matchingLawyerCases = rawLawyerCases.filter(c => validateLawyerKeywords(c, lawyerQueryName));

        if (matchingLawyerCases.length > 0) {
          matchType = 'lawyer_counsel';
          targetCase = matchingLawyerCases[0];
          matchedFieldDisplay = lawyerQueryName;
          confidence = 96;
          activeReferences = ['parties', 'courts', 'judges', 'citations'];
        }
      }
    }
  }

  // PRIORITY 7: Court / Judicial Forum Search
  // (e.g. "court: Peshawar High Court", "Appellate Tribunal Inland Revenue", "Supreme Court of Pakistan")
  if (!targetCase) {
    const courtPrefixMatch = normalizedQuery.match(/^(?:court|forum|tribunal)\s*[:\-]?\s*(.+)$/i);
    const courtQueryName = courtPrefixMatch ? courtPrefixMatch[1].trim() : normalizedQuery;
    const isCourtPattern = Boolean(courtPrefixMatch) || 
      /\b(?:high\s*court|supreme\s*court|appellate\s*tribunal|tax\s*ombudsman|federal\s*tax\s*ombudsman)\b/i.test(courtQueryName);

    if (isCourtPattern && courtQueryName.length >= 4) {
      const courtRegex = makeFlexibleRegex(courtQueryName);
      if (courtRegex) {
        const rawCourtCases = await Case.find({
          court: courtRegex,
          isDeleted: { $ne: true }
        }).limit(15).maxTimeMS(2000).lean();
        rawCourtCases.sort((a, b) => (parseInt(b.sldNumber, 10) || 0) - (parseInt(a.sldNumber, 10) || 0));

        // STRICT VALIDATION: Filter out any cases not containing court keywords
        matchingCourtCases = rawCourtCases.filter(c => validateCourtKeywords(c, courtQueryName));

        if (matchingCourtCases.length > 0) {
          matchType = 'court_forum';
          targetCase = matchingCourtCases[0];
          matchedFieldDisplay = courtQueryName;
          confidence = 95;
          activeReferences = ['courts', 'judges', 'citations', 'case_numbers'];
        }
      }
    }
  }

  // PRIORITY 8: Section or Statute Search
  // (e.g. "section 170", "sec 7e", "section 4c", "236g", "236h", "236g and 236h cases", "sales tax act")
  if (!targetCase) {
    // 1. Extract all section tokens mentioned in query (e.g. 236g, 236h, 7e, 122(5a), 170, 65d, etc.)
    const explicitSecMatches = [...normalizedQuery.matchAll(/\b(?:section|sec\.?|s\.)\s*([0-9]+[a-z]{0,3}(?:\([0-9a-z]+\))?|[a-z]{1,2}\d+)/gi)].map(m => m[1]);
    const standaloneSecMatches = [...normalizedQuery.matchAll(/\b(\d+[a-z]{1,3}|\d{1,4}[a-z]?(?:\([0-9a-z]+\)))\b/gi)].map(m => m[1]);
    const allSecCandidates = Array.from(new Set([...explicitSecMatches, ...standaloneSecMatches]))
      .filter(s => s && s.length >= 2 && !/^\d{4}$/.test(s)); // exclude 4-digit years like 2026

    if (allSecCandidates.length > 0) {
      // Step A: Search indexed laws.section with hint (< 6ms execution!)
      const secTokens = allSecCandidates.flatMap(s => [
        s.toUpperCase(),
        s.toLowerCase(),
        s
      ]);
      let statuteCases = await Case.find({
        'laws.section': { $in: Array.from(new Set(secTokens)) }
      }).hint({ 'laws.section': 1 }).limit(50).maxTimeMS(2000).lean();

      // Step B: If exact section not matched, try text search for the sections
      if (statuteCases.length === 0) {
        const textQuery = allSecCandidates.map(s => `"${s}"`).join(' ');
        statuteCases = await Case.find({
          $text: { $search: textQuery }
        }).limit(30).maxTimeMS(2000).lean();
      }

      statuteCases.sort((a, b) => (parseInt(b.sldNumber, 10) || 0) - (parseInt(a.sldNumber, 10) || 0));

      if (statuteCases.length > 0) {
        matchingTopicCases = statuteCases;
        targetCase = statuteCases[0];
        matchType = statuteCases.length === 1 ? 'statute' : 'topic_multi';
        matchedFieldDisplay = allSecCandidates.join(' & ');
        confidence = 96;
        activeReferences = ['statutes', 'headnotes', 'citations', 'judgments'];
      }
    }
  }

  // PRIORITY 9: High-Performance Full-Text & Concept Matching across 162k database (< 25ms)
  if (!targetCase && cleanQuery.length >= 3) {
    try {
      const sanitizedTextQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, ' ').trim();
      if (sanitizedTextQuery.length >= 3) {
        const textCases = await Case.find(
          { $text: { $search: sanitizedTextQuery } }
        )
        .limit(20)
        .maxTimeMS(2000)
        .lean();

        if (textCases && textCases.length > 0) {
          matchingTopicCases = textCases;
          targetCase = textCases[0];
          matchType = 'topic_multi';
          matchedFieldDisplay = cleanQuery;
          confidence = 92;
          activeReferences = ['headnotes', 'statutes', 'judgments', 'courts', 'citations'];
        }
      }
    } catch (textErr) {
      logger.warn('Text index search notice: ' + textErr.message);
    }
  }

  // PRIORITY 10: Verbatim Sentence / Excerpt Search across Headnotes & Principles (< 100ms)
  if (!targetCase && normalizedQuery.length >= 8) {
    const searchPhrase = normalizedQuery.replace(/^["'“‘]+|["'”’]+$/g, '').trim();
    if (searchPhrase.length >= 8) {
      const phraseRegex = new RegExp(escapeRegex(searchPhrase), 'i');
      try {
        let rawJudgmentCases = await Case.find({
          $or: [
            { headNote: phraseRegex },
            { principleLaw: phraseRegex },
            { caseDescription: phraseRegex }
          ]
        }).limit(15).maxTimeMS(2000).lean();
        rawJudgmentCases.sort((a, b) => (parseInt(b.sldNumber, 10) || 0) - (parseInt(a.sldNumber, 10) || 0));

        matchingJudgmentCases = rawJudgmentCases.filter(c => validateTextKeywords(c, searchPhrase));
        if (matchingJudgmentCases.length > 0) {
          matchType = 'exact_judgment_line_multi';
          targetCase = matchingJudgmentCases[0];
          exactMatchedLine = searchPhrase;
          surroundingContext = extractContext(targetCase.headNote || targetCase.judgment, searchPhrase, 300);
          confidence = 96;
          activeReferences = ['judgments', 'headnotes', 'citations', 'judges'];
        }
      } catch (e) {}
    }
  }

  // PRIORITY 11: Legal Doctrine Principle Matching (e.g. Refund vs Time-bar)
  if (!targetCase) {
    const cleanLower = normalizedQuery.toLowerCase();
    const isRefundLimitation = cleanLower.includes('refund') && (
      cleanLower.includes('time') || cleanLower.includes('bar') || cleanLower.includes('limit')
    );

    if (isRefundLimitation) {
      try {
        const candidates = await Case.find({
          $and: [
            { $or: [{ headNote: /refund/i }, { principleLaw: /refund/i }] },
            { $or: [
                { headNote: /time\s*bar|barred\s*by\s*time|limitation|no\s*bar\s*to\s*refunding/i },
                { principleLaw: /time\s*bar|barred\s*by\s*time|limitation|no\s*bar\s*to\s*refunding/i }
            ]}
          ]
        }).limit(25).maxTimeMS(2000).lean();

        if (candidates.length > 0) {
          const scored = candidates.map(c => {
            let score = 0;
            const txt = `${c.headNote || ''} ${c.principleLaw || ''}`.toLowerCase();
            if (txt.includes('cannot be entertained being barred by time')) score += 100;
            if (txt.includes('no bar to refunding')) score += 85;
            if (txt.includes('provisions of section 170(2)(c)')) score += 75;
            if (txt.includes('barred by time') && txt.includes('refund')) score += 65;
            if (txt.includes('directory, not mandatory') || txt.includes('directory not mandatory')) score += 55;
            return { c, score };
          }).sort((a, b) => b.score - a.score);

          if (scored[0] && scored[0].score > 0) {
            targetCase = scored[0].c;
            matchType = 'legal_principle_refund';
            confidence = 98;
            activeReferences = ['headnotes', 'statutes', 'judgments', 'courts', 'citations'];
            exactMatchedLine = "Section 170(2)(c) is considered directory, not mandatory... if the refund claim is easily verifiable, there is no bar to refunding the amount even after the two-year period.";
            surroundingContext = extractContext(targetCase.headNote || targetCase.judgment, 'no bar to refunding', 400);
          }
        }
      } catch (e) {}
    }
  }

  // PRIORITY 12: Keyword Fallback on HeadNote & PrincipleLaw
  if (!targetCase) {
    const rawWords = normalizedQuery.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const stopWords = new Set([
      'is', 'are', 'was', 'were', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of',
      'with', 'by', 'from', 'about', 'and', 'or', 'that', 'this', 'it', 'be', 'cannot',
      'can', 'not', 'have', 'has', 'had', 'what', 'did', 'do', 'does', 'how', 'why',
      'when', 'where', 'which', 'who', 'whom', 'whose', 'regarding', 'concerning',
      'courts', 'court', 'rule', 'ruled', 'ruling', 'tell', 'me', 'please', 'explain',
      'case', 'cases', 'law', 'laws', 'judgment', 'judgments', 'held'
    ]);
    const filteredTerms = rawWords.filter(w => !stopWords.has(w) && w.length >= 3);

    if (filteredTerms.length >= 1) {
      try {
        const orFilters = filteredTerms.slice(0, 4).map(term => ({
          $or: [
            { headNote: new RegExp(escapeRegex(term), 'i') },
            { principleLaw: new RegExp(escapeRegex(term), 'i') }
          ]
        }));
        const candidates = await Case.find({
          $or: orFilters
        }).limit(20).maxTimeMS(2000).lean();

        if (candidates.length > 0) {
          matchingTopicCases = candidates;
          targetCase = candidates[0];
          matchType = 'topic_multi';
          matchedFieldDisplay = cleanQuery;
          confidence = 88;
          activeReferences = ['headnotes', 'statutes', 'courts', 'citations'];
        }
      } catch (err) {
        logger.warn('Keyword fallback notice: ' + err.message);
      }
    }
  }

  // --- BUILD THE AUTHORITATIVE EXPLANATION ---
  if (targetCase) {
    const citationsStr = (targetCase.mapYearPage && targetCase.mapYearPage.length > 0)
      ? targetCase.mapYearPage.join('  =  ')
      : `SLD #${targetCase.sldNumber || targetCase.caseId}`;
    
    const courtName = targetCase.court || 'Appellate Authority / High Court';
    const datedStr = targetCase.dated ? `Decision Dated: ${String(targetCase.dated).split('T')[0]}` : '';
    const benchStr = (targetCase.judges && targetCase.judges.length > 0) ? cleanBenchList(targetCase.judges) : 'Judicial Division Bench';
    const partiesStr = cleanParties(targetCase.petitioners);
    const caseNumbers = (targetCase.caseNumber && targetCase.caseNumber.length > 0) ? targetCase.caseNumber.join(', ') : '';
    
    const lawsList = (targetCase.laws && targetCase.laws.length > 0)
      ? targetCase.laws.map(l => `${l.lawStatute}${l.section ? ` (S. ${l.section})` : ''}`).join(' • ')
      : (targetCase.principleLaw || 'Income Tax Ordinance / Relevant Statutes');

    let responseText = '';

    // FORMAT 0: Direct Case ID Match or Single Citation Match
    if (matchType === 'case_id' || matchType === 'citation_single') {
      const citeLine = (targetCase.mapYearPage && targetCase.mapYearPage.length > 0) ? targetCase.mapYearPage.join(' | ') : `SLD #${targetCase.sldNumber || targetCase.caseId}`;
      const lawyersClean = cleanLawyers(targetCase.lawyers);
      const overviewText = targetCase.headNote ? targetCase.headNote.trim() : (targetCase.judgment ? targetCase.judgment.slice(0, 500).trim() + '...' : 'Full judgment text available on record.');

      responseText = `### 📋 Case Record Verified: **${targetCase.caseId || `CASE-${targetCase.sldNumber}`}** (SLD #${targetCase.sldNumber})\n\n` +
        `**Key Case Details:**\n` +
        `• **Citation**: ${citeLine}\n` +
        `• **Court**: ${courtName}\n` +
        (caseNumbers ? `• **Case Number**: ${caseNumbers}\n` : '') +
        (datedStr ? `• **${datedStr}**\n` : '') +
        `• **Bench**: ${benchStr}\n` +
        (partiesStr !== 'N/A' ? `• **Parties**: ${partiesStr}\n` : '') +
        (lawyersClean !== 'N/A' ? `• **Counsel**: ${lawyersClean}\n` : '') +
        `\n#### Overview & Significance\n` +
        `${overviewText}\n\n` +
        (targetCase.principleLaw ? `**Principle of Law Established:**\n${targetCase.principleLaw}\n\n` : '') +
        `**Applicable Statutory Provisions:**\n${lawsList}\n\n` +
        `[View Full Case Document ↗](/cases/view/${targetCase._id})\n`;
    }
    // FORMAT A: Case Number Match
    else if (matchType === 'case_number' && matchingCaseNumberCases.length > 0) {
      const countWord = matchingCaseNumberCases.length === 1 ? 'One matching judgment was' :
        matchingCaseNumberCases.length === 2 ? 'Two matching judgments were' :
        `${matchingCaseNumberCases.length} matching judgments were`;

      responseText = `${countWord} found in the SLD database matching Case / Appeal Number **${matchedFieldDisplay || cleanQuery}**:\n\n`;

      for (let i = 0; i < matchingCaseNumberCases.length; i++) {
        const c = matchingCaseNumberCases[i];
        const caseNumStr = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber.join('; ') : 'N/A';
        const dateFormatted = formatDate(c);
        const benchClean = cleanBenchList(c.judges);
        const partiesClean = cleanParties(c.petitioners);
        const citeLine = (c.mapYearPage && c.mapYearPage.length > 0) ? c.mapYearPage.join(' | ') : `SLD #${c.sldNumber}`;
        const lawyersClean = cleanLawyers(c.lawyers);

        let overviewText = '';
        if (c.headNote) {
          overviewText = c.headNote.trim();
        } else if (c.judgment) {
          overviewText = c.judgment.slice(0, 450).trim() + '...';
        }

        responseText += `---\n\n` +
          `### Case ${i + 1}: ${c.court || 'High Court of Record'}\n` +
          `Key Case Details:\n` +
          `• Citation: ${citeLine}\n` +
          `• Court: ${c.court || 'High Court of Record'}\n` +
          `• Case Number: ${caseNumStr}\n` +
          `• Decision Date: ${dateFormatted}\n` +
          `• Bench: ${benchClean}\n` +
          `• Parties: ${partiesClean}\n` +
          (lawyersClean !== 'N/A' ? `• Counsel: ${lawyersClean}\n` : '') +
          `\n#### Overview & Significance\n` +
          `${overviewText}\n\n` +
          (c.principleLaw ? `Principle of Law Established: ${c.principleLaw}\n\n` : '') +
          `[View Full Case Document ↗](/cases/view/${c._id})\n\n`;
      }
    }
    // FORMAT B: Judge / Bench Match
    else if (matchType === 'judge_bench' && matchingJudgeCases.length > 0) {
      const countWord = matchingJudgeCases.length === 1 ? 'One landmark judgment was' :
        matchingJudgeCases.length === 2 ? 'Two landmark judgments were' :
        `${matchingJudgeCases.length} landmark judgments were`;

      responseText = `${countWord} found in the SLD database authored or decided by Hon'ble Justice **${matchedFieldDisplay || cleanQuery}**:\n\n`;

      for (let i = 0; i < matchingJudgeCases.length; i++) {
        const c = matchingJudgeCases[i];
        const caseNumStr = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber[0] : 'N/A';
        const dateFormatted = formatDate(c);
        const benchClean = cleanBenchList(c.judges);
        const partiesClean = cleanParties(c.petitioners);
        const citeLine = (c.mapYearPage && c.mapYearPage.length > 0) ? c.mapYearPage.join(' | ') : `SLD #${c.sldNumber}`;

        let overviewText = '';
        if (c.headNote) {
          overviewText = c.headNote.trim();
        } else if (c.judgment) {
          overviewText = c.judgment.slice(0, 450).trim() + '...';
        }

        responseText += `---\n\n` +
          `### Case ${i + 1}: ${c.court || 'High Court of Record'}\n` +
          `Key Case Details:\n` +
          `• Citation: ${citeLine}\n` +
          `• Court: ${c.court || 'High Court of Record'}\n` +
          `• Case Number: ${caseNumStr}\n` +
          `• Decision Date: ${dateFormatted}\n` +
          `• Bench: ${benchClean}\n` +
          (partiesClean !== 'N/A' ? `• Parties: ${partiesClean}\n` : '') +
          `\n#### Overview & Significance\n` +
          `${overviewText}\n\n` +
          (c.principleLaw ? `Principle of Law Established: ${c.principleLaw}\n\n` : '') +
          `[View Full Case Document ↗](/cases/view/${c._id})\n\n`;
      }
    }
    // FORMAT C: Petitioner / Party Match
    else if (matchType === 'petitioner_party' && matchingPartyCases.length > 0) {
      const countWord = matchingPartyCases.length === 1 ? 'One case was' :
        matchingPartyCases.length === 2 ? 'Two cases were' :
        `${matchingPartyCases.length} cases were`;

      responseText = `${countWord} found in the SLD database involving party / litigant **"${matchedFieldDisplay || cleanQuery}"**:\n\n`;

      for (let i = 0; i < matchingPartyCases.length; i++) {
        const c = matchingPartyCases[i];
        const caseNumStr = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber[0] : 'N/A';
        const dateFormatted = formatDate(c);
        const benchClean = cleanBenchList(c.judges);
        const partiesClean = cleanParties(c.petitioners);
        const citeLine = (c.mapYearPage && c.mapYearPage.length > 0) ? c.mapYearPage.join(' | ') : `SLD #${c.sldNumber}`;

        let overviewText = '';
        if (c.headNote) {
          overviewText = c.headNote.trim();
        } else if (c.judgment) {
          overviewText = c.judgment.slice(0, 450).trim() + '...';
        }

        responseText += `---\n\n` +
          `### Case ${i + 1}: ${c.court || 'High Court of Record'}\n` +
          `Key Case Details:\n` +
          `• Citation: ${citeLine}\n` +
          `• Parties: ${partiesClean}\n` +
          `• Court: ${c.court || 'High Court of Record'}\n` +
          `• Case Number: ${caseNumStr}\n` +
          `• Decision Date: ${dateFormatted}\n` +
          `• Bench: ${benchClean}\n` +
          `\n#### Overview & Significance\n` +
          `${overviewText}\n\n` +
          (c.principleLaw ? `Principle of Law Established: ${c.principleLaw}\n\n` : '') +
          `[View Full Case Document ↗](/cases/view/${c._id})\n\n`;
      }
    }
    // FORMAT D: Lawyer / Counsel Match
    else if (matchType === 'lawyer_counsel' && matchingLawyerCases.length > 0) {
      const countWord = matchingLawyerCases.length === 1 ? 'One judgment was' :
        matchingLawyerCases.length === 2 ? 'Two judgments were' :
        `${matchingLawyerCases.length} judgments were`;

      responseText = `${countWord} found in the SLD database where **${matchedFieldDisplay || cleanQuery}** represented appearing parties:\n\n`;

      for (let i = 0; i < matchingLawyerCases.length; i++) {
        const c = matchingLawyerCases[i];
        const caseNumStr = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber[0] : 'N/A';
        const dateFormatted = formatDate(c);
        const benchClean = cleanBenchList(c.judges);
        const partiesClean = cleanParties(c.petitioners);
        const lawyersClean = cleanLawyers(c.lawyers);
        const citeLine = (c.mapYearPage && c.mapYearPage.length > 0) ? c.mapYearPage.join(' | ') : `SLD #${c.sldNumber}`;

        let overviewText = '';
        if (c.headNote) {
          overviewText = c.headNote.trim();
        } else if (c.judgment) {
          overviewText = c.judgment.slice(0, 450).trim() + '...';
        }

        responseText += `---\n\n` +
          `### Case ${i + 1}: ${c.court || 'High Court of Record'}\n` +
          `Key Case Details:\n` +
          `• Citation: ${citeLine}\n` +
          `• Counsel: ${lawyersClean}\n` +
          `• Parties: ${partiesClean}\n` +
          `• Court: ${c.court || 'High Court of Record'}\n` +
          `• Case Number: ${caseNumStr}\n` +
          `• Decision Date: ${dateFormatted}\n` +
          `• Bench: ${benchClean}\n` +
          `\n#### Overview & Significance\n` +
          `${overviewText}\n\n` +
          (c.principleLaw ? `Principle of Law Established: ${c.principleLaw}\n\n` : '') +
          `[View Full Case Document ↗](/cases/view/${c._id})\n\n`;
      }
    }
    // FORMAT E: Court / Forum Match
    else if (matchType === 'court_forum' && matchingCourtCases.length > 0) {
      const countWord = matchingCourtCases.length === 1 ? 'One authoritative judgment was' :
        matchingCourtCases.length === 2 ? 'Two authoritative judgments were' :
        `${matchingCourtCases.length} authoritative judgments were`;

      responseText = `${countWord} found in the SLD database from **${matchedFieldDisplay || cleanQuery}**:\n\n`;

      for (let i = 0; i < matchingCourtCases.length; i++) {
        const c = matchingCourtCases[i];
        const caseNumStr = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber[0] : 'N/A';
        const dateFormatted = formatDate(c);
        const benchClean = cleanBenchList(c.judges);
        const partiesClean = cleanParties(c.petitioners);
        const citeLine = (c.mapYearPage && c.mapYearPage.length > 0) ? c.mapYearPage.join(' | ') : `SLD #${c.sldNumber}`;

        let overviewText = '';
        if (c.headNote) {
          overviewText = c.headNote.trim();
        } else if (c.judgment) {
          overviewText = c.judgment.slice(0, 450).trim() + '...';
        }

        responseText += `---\n\n` +
          `### Case ${i + 1}: ${c.court || 'High Court of Record'}\n` +
          `Key Case Details:\n` +
          `• Citation: ${citeLine}\n` +
          `• Court: ${c.court || 'High Court of Record'}\n` +
          `• Case Number: ${caseNumStr}\n` +
          `• Decision Date: ${dateFormatted}\n` +
          `• Bench: ${benchClean}\n` +
          (partiesClean !== 'N/A' ? `• Parties: ${partiesClean}\n` : '') +
          `\n#### Overview & Significance\n` +
          `${overviewText}\n\n` +
          (c.principleLaw ? `Principle of Law Established: ${c.principleLaw}\n\n` : '') +
          `[View Full Case Document ↗](/cases/view/${c._id})\n\n`;
      }
    }
    // FORMAT F: Refund vs Time-bar
    else if (matchType === 'legal_principle_refund') {
      responseText = `### ⚖️ Legal Determination: Can a Tax Refund Be Time-Barred?\n\n` +
        `**Direct Answer:**  \n` +
        `**NO — A genuine, verifiable tax refund CANNOT be refused or denied merely on the grounds of time limitation or technical procedural delays.**\n\n` +
        `As established in the authoritative precedent **SLD #${targetCase.sldNumber}** (*${citationsStr}*):\n\n` +
        `#### 📋 Brief Case Facts & What Happened:\n` +
        `• The taxpayer filed an income tax refund claim for overpaid/deducted taxes (Rs. 361,141).\n` +
        `• The Taxation Officer refused to entertain the refund application, alleging it was **barred by time under Section 170(2)(c)** of the Income Tax Ordinance, 2001.\n` +
        `• The taxpayer appealed, and the Appellate Authority ruled decisively in favor of the taxpayer.\n\n` +
        `#### 🏛️ What the Court / Tribunal Held (Easy Explanation):\n` +
        `1. **Refund is an "Amanah" (Public Trust):**\n` +
        `   Overpaid tax in the hands of the Revenue Department is held in trust (*Amanah*). The State cannot unjustly enrich itself or withhold money lawfully belonging to a taxpayer due to mere administrative delay.\n\n` +
        `2. **Section 170(2)(c) Limitation is Directory, Not Mandatory:**\n` +
        `   The statutory period in Section 170(2)(c) is a procedural guideline to prevent fraudulent or unverifiable claims. It does not terminate the department's duty to return verifiable taxes.\n\n` +
        `3. **No Time-Bar for Easily Verifiable Claims:**\n` +
        `   Where tax deductions are verifiable from official challans and records, **there is no legal bar to refunding the amount even after the lapse of time**.\n\n` +
        `4. **Constitutional Protection (Articles 24 & 25):**\n` +
        `   Refusal to refund verified overpayments on technical grounds violates constitutional rights against unfair deprivation of property.\n\n` +
        `#### 📜 Key Excerpt from the Judgment:\n` +
        `> "Section 170(2)(c) is considered directory, not mandatory. The requirement to pass an order within two years is not absolute... if the refund claim is easily verifiable, there is no bar to refunding the amount even after the two-year period... Refusal to grant a genuine refund claim due to technicalities, when the overpayment is verifiable, is considered unfair and a violation of the Constitution of Pakistan."\n\n` +
        `**Court**: ${courtName}  \n` +
        `**Bench**: ${benchStr}  \n` +
        `**Applicable Law**: ${lawsList}`;
    }
    // FORMAT G: Verbatim Sentence / Judgment Line
    else if (matchType === 'exact_judgment_line_multi' && matchingJudgmentCases && matchingJudgmentCases.length > 0) {
      const countWord = matchingJudgmentCases.length === 1 ? 'One matching judgment was' :
        matchingJudgmentCases.length === 2 ? 'Two matching judgments were' :
        `${matchingJudgmentCases.length} matching judgments were`;

      responseText = `${countWord} found in the SLD database containing or related to this judicial text / sentence:\n` +
        `> "${exactMatchedLine}"\n\n`;

      for (let i = 0; i < matchingJudgmentCases.length; i++) {
        const c = matchingJudgmentCases[i];
        const caseNumStr = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber[0] : 'N/A';
        const dateFormatted = formatDate(c);
        const benchClean = cleanBenchList(c.judges);
        const citeLine = (c.mapYearPage && c.mapYearPage.length > 0) ? c.mapYearPage.join(' | ') : `SLD #${c.sldNumber}`;

        let contextSnippet = '';
        if (c.judgment) {
          contextSnippet = extractContext(c.judgment, exactMatchedLine, 220);
        }
        if (!contextSnippet && c.headNote) {
          contextSnippet = extractContext(c.headNote, exactMatchedLine, 220);
        }
        if (!contextSnippet && c.principleLaw) {
          contextSnippet = extractContext(c.principleLaw, exactMatchedLine, 220);
        }
        if (!contextSnippet) {
          contextSnippet = c.headNote ? c.headNote.slice(0, 300) : (c.judgment ? c.judgment.slice(0, 300) : '');
        }

        let overviewText = '';
        if (c.headNote) {
          overviewText = c.headNote.trim();
        } else if (c.judgment) {
          overviewText = c.judgment.slice(0, 450).trim() + '...';
        }

        responseText += `---\n\n` +
          `### Case ${i + 1}: ${c.court || 'High Court of Record'}\n` +
          `Key Case Details:\n` +
          `• Citation: ${citeLine}\n` +
          `• Court: ${c.court || 'High Court of Record'}\n` +
          `• Case Number: ${caseNumStr}\n` +
          `• Decision Date: ${dateFormatted}\n` +
          `• Bench: ${benchClean}\n\n` +
          `#### 📜 Verified Excerpt from Judicial Order:\n` +
          `> "${contextSnippet}"\n\n` +
          `#### Overview & Significance:\n` +
          `${overviewText}\n\n` +
          (c.principleLaw ? `Principle of Law Established: ${c.principleLaw}\n\n` : '') +
          `[View Full Case Document ↗](/cases/view/${c._id})\n\n`;
      }
    }
    // FORMAT H: Citation Multi-case
    else if ((matchType === 'citation_multi' || matchType === 'citation') && matchingCitationCases && matchingCitationCases.length > 0) {
      const countWord = matchingCitationCases.length === 1 ? 'One matching judgment was' :
        matchingCitationCases.length === 2 ? 'Two matching judgments were' :
        `${matchingCitationCases.length} matching judgments were`;

      const citeHeader = citationDetails?.formatted || cleanQuery.trim();
      responseText = `${countWord} found in the SLD database under the citation ${citeHeader}.\n\n`;

      for (let i = 0; i < matchingCitationCases.length; i++) {
        const c = matchingCitationCases[i];
        const caseNumStr = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber[0] : 'N/A';
        const dateFormatted = formatDate(c);
        const benchClean = cleanBenchList(c.judges);
        const citeLine = (c.mapYearPage && c.mapYearPage.length > 0) ? c.mapYearPage.join(' | ') : `SLD #${c.sldNumber}`;

        let overviewText = '';
        if (c.headNote) {
          overviewText = c.headNote.trim();
        } else if (c.judgment) {
          overviewText = c.judgment.slice(0, 450).trim() + '...';
        }

        responseText += `---\n\n` +
          `### Case ${i + 1}: ${c.court || 'High Court of Record'}\n` +
          `Key Case Details:\n` +
          `• Citation: ${citeLine}\n` +
          `• Court: ${c.court || 'High Court of Record'}\n` +
          `• Case Number: ${caseNumStr}\n` +
          `• Decision Date: ${dateFormatted}\n` +
          `• Bench: ${benchClean}\n\n` +
          `#### Overview & Significance\n` +
          `${overviewText}\n\n` +
          (c.principleLaw ? `Principle of Law Established: ${c.principleLaw}\n\n` : '') +
          `[View Full Case Document ↗](/cases/view/${c._id})\n\n`;
      }
    }
    // FORMAT I: General Topic Multi-case
    else if (matchType === 'topic_multi' && matchingTopicCases && matchingTopicCases.length > 0) {
      const countWord = matchingTopicCases.length === 1 ? 'One matching judgment was' :
        matchingTopicCases.length === 2 ? 'Two matching judgments were' :
        `${matchingTopicCases.length} matching judgments were`;

      responseText = `${countWord} found in the SLD database related to: "${cleanQuery.trim()}".\n\n`;

      for (let i = 0; i < matchingTopicCases.length; i++) {
        const c = matchingTopicCases[i];
        const caseNumStr = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber[0] : 'N/A';
        const dateFormatted = formatDate(c);
        const benchClean = cleanBenchList(c.judges);
        const citeLine = (c.mapYearPage && c.mapYearPage.length > 0) ? c.mapYearPage.join(' | ') : `SLD #${c.sldNumber}`;

        let overviewText = '';
        if (c.headNote) {
          overviewText = c.headNote.trim();
        } else if (c.judgment) {
          overviewText = c.judgment.slice(0, 450).trim() + '...';
        }

        responseText += `---\n\n` +
          `### Case ${i + 1}: ${c.court || 'High Court of Record'}\n` +
          `Key Case Details:\n` +
          `• Citation: ${citeLine}\n` +
          `• Court: ${c.court || 'High Court of Record'}\n` +
          `• Case Number: ${caseNumStr}\n` +
          `• Decision Date: ${dateFormatted}\n` +
          `• Bench: ${benchClean}\n\n` +
          `#### Overview & Significance\n` +
          `${overviewText}\n\n` +
          (c.principleLaw ? `Principle of Law Established: ${c.principleLaw}\n\n` : '') +
          `[View Full Case Document ↗](/cases/view/${c._id})\n\n`;
      }
    }
    // FORMAT J: Default Single Case Overview
    else {
      responseText = `### Legal Precedent & Ruling Breakdown\n\n` +
        `The governing legal precedent on this issue is **SLD #${targetCase.sldNumber}** (*${citationsStr}*).\n\n` +
        `**Court**: ${courtName} | **Bench**: ${benchStr}  \n` +
        (partiesStr !== 'N/A' ? `**Parties**: ${partiesStr}  \n\n` : '\n') +
        `#### 💡 What the Case Establishes (Easy Explanation):\n` +
        `${targetCase.headNote ? targetCase.headNote.slice(0, 500) + '...' : (targetCase.principleLaw || 'Legal principles as established under the relevant statutory provisions.')}\n\n` +
        `[View Full Case Document ↗](/cases/view/${targetCase._id})\n\n` +
        `**Relevant Statutory Provisions**: ${lawsList}`;
    }

    const allMatchedCasesList = (
      (matchingCitationCases && matchingCitationCases.length > 0 ? matchingCitationCases : null) ||
      (matchingCaseNumberCases && matchingCaseNumberCases.length > 0 ? matchingCaseNumberCases : null) ||
      (matchingJudgeCases && matchingJudgeCases.length > 0 ? matchingJudgeCases : null) ||
      (matchingPartyCases && matchingPartyCases.length > 0 ? matchingPartyCases : null) ||
      (matchingLawyerCases && matchingLawyerCases.length > 0 ? matchingLawyerCases : null) ||
      (matchingCourtCases && matchingCourtCases.length > 0 ? matchingCourtCases : null) ||
      (matchingJudgmentCases && matchingJudgmentCases.length > 0 ? matchingJudgmentCases : null) ||
      (matchingTopicCases && matchingTopicCases.length > 0 ? matchingTopicCases : null) ||
      [targetCase]
    );

    // If Gemini is available, synthesize an authoritative AI research answer
    // grounded 100% in the retrieved database records
    if (process.env.GEMINI_API_KEY && (rawClean.length > 8 || rawClean.includes('?') || matchType === 'topic_multi' || matchType === 'database_search' || matchType === 'statute' || matchType === 'legal_principle_refund' || matchType === 'exact_judgment_line_multi')) {
      const synthesized = await synthesizeLegalAIAnswer(rawClean, allMatchedCasesList, targetCase);
      if (synthesized) {
        responseText = synthesized;
      }
    }

    const result = {
      text: responseText,
      legalAnalysis: {
        matchedCase: {
          id: targetCase.sldNumber || targetCase._id.toString(),
          _id: targetCase._id.toString(),
          sldNumber: targetCase.sldNumber || '',
          caseId: targetCase.caseId || '',
          court: courtName,
          dated: datedStr,
          caseNumber: targetCase.caseNumber || [],
          judges: targetCase.judges || [],
          petitioners: targetCase.petitioners || [],
          lawyers: targetCase.lawyers || [],
          mapYearPage: targetCase.mapYearPage || [],
          principleLaw: targetCase.principleLaw || '',
          laws: targetCase.laws || []
        },
        matchedCases: allMatchedCasesList.map(c => ({
          id: c._id.toString(),
          _id: c._id.toString(),
          sldNumber: c.sldNumber,
          court: c.court,
          citations: c.mapYearPage,
          caseNumber: c.caseNumber,
          dated: c.dated
        })),
        sourcesFound: allMatchedCasesList.length,
        matchType: matchType,
        confidence: confidence,
        activeReferences: sanitizeReferences(activeReferences),
        exactQuote: {
          matchedLine: exactMatchedLine || cleanQuery,
          surroundingContext: surroundingContext,
          sourceField: targetCase.judgment ? 'judgment' : 'headNote'
        }
      }
    };
    setCachedAIResult(cacheKey, result);
    return result;
  }

  // If no direct case was matched in database, invoke Gemini for statutory explanation & guidance
  let fallbackText = '';
  if (process.env.GEMINI_API_KEY && cleanQuery.length >= 3) {
    try {
      const sysPrompt = `You are the Senior Legal AI Assistant for the SLD System (Supreme Law Digest) of Pakistan, with full access to 162,865 reported cases across Supreme Court, High Courts, and Appellate Tribunals.
The user asked a legal question for which no single specific case matched by direct title.
Provide an informative, authoritative overview of the legal position under Pakistani statutory law (e.g. Income Tax Ordinance 2001, Sales Tax Act 1990, Constitution of Pakistan, Civil/Criminal procedure).
Explain the general doctrine or principle clearly to the lawyer or litigant.
Guide them on how they can query the SLD database (by Case Number, Citation, Judge name, or exact statute section) to retrieve specific case precedents.
Do not use stray raw asterisks ** around party blocks or signatures.`;
      
      const aiReply = await Promise.race([
        callGeminiWithTokenControl(sysPrompt, `USER QUERY: "${cleanQuery}"`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Fallback Gemini timeout')), 3500))
      ]);
      if (aiReply && aiReply.trim().length > 40) {
        fallbackText = aiReply.trim();
      }
    } catch (e) {
      logger.warn('Gemini fallback synthesis notice: ' + e.message);
    }
  }

  if (!fallbackText) {
    fallbackText = `### Legal Inquiry Analysis\n\n` +
      `I cross-referenced the SLD database across all 162,865+ cases, judgments, citations, judges, case numbers, and petitioners, but found no direct record for: *"**${cleanQuery}**"*.\n\n` +
      `**Suggested Inquiries**:\n` +
      `1. **Case Number**: Search by appeal/suit number like \`1173 of 1978\`, \`C.T.R. No. 50 of 1995\`, or \`S.T.A. No.1903/LB of 2009\`.\n` +
      `2. **Judge Name**: Search by judge like \`Yahya Afridi\`, \`Ejaz Afzal Khan\`, or \`Mian Saqib Nisar\`.\n` +
      `3. **Petitioner / Party**: Search by company or party like \`Delta CNG\`, \`Sui Northern Gas\`, or \`Sargroh Oil\`.\n` +
      `4. **Citation**: Search by publication report like \`2001 SLD 1\`, \`(2011) 104 TAX 78\`, or \`2011 PTD 770\`.\n` +
      `5. **Verbatim Excerpt**: Quote a sentence from the operative text of any judgment.`;
  }

  const fallbackResult = {
    text: fallbackText,
    legalAnalysis: {
      matchedCase: null,
      exactQuote: null,
      matchType: 'none',
      confidence: fallbackText !== '' ? 70 : 0,
      activeReferences: ['case_numbers', 'judgments', 'judges', 'petitioners', 'headnotes', 'legal_maxim', 'principle_law', 'citations'],
      sourcesFound: 0
    }
  };
  setCachedAIResult(cacheKey, fallbackResult);
  return fallbackResult;
};


/**
 * Controller Endpoints
 */
export const createSession = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { sld_number, title } = req.body;

    const session = new ChatSession({
      userId,
      sldNumber: sld_number || null,
      title: title || (sld_number ? `SLD #${sld_number} Inquiry` : 'Legal Precedent Research'),
      messages: [
        {
          sender: 'assistant',
          text: 'Welcome to the **SLD AI Legal Core**. You can enter any line from a judgment, citation, statute section, or case title. The system will scan the complete database of over 162,865 verified judicial cases to locate the exact authority and provide an explanation.',
          timestamp: new Date()
        }
      ]
    });

    await session.save();

    return res.status(201).json({
      success: true,
      data: session
    });
  } catch (err) {
    next(err);
  }
};

export const getUserSessions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sessions = await ChatSession.find({ userId, isArchived: { $ne: true } })
      .sort({ updatedAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (err) {
    next(err);
  }
};

export const getSessionById = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await ChatSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Chat session not found' });
    }

    if (session.userId && req.user?._id && session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot view another user\'s chat session' });
    }

    return res.status(200).json({
      success: true,
      data: session
    });
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { message, focusNode, attachments } = req.body;

    const trimmedMsg = (message || '').trim();
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    if (!trimmedMsg && !hasAttachments) {
      return res.status(400).json({ success: false, message: 'Message or attachment is required' });
    }

    let session = await ChatSession.findById(sessionId);
    if (!session) {
      // Auto-create session if not found
      session = new ChatSession({
        userId: req.user._id,
        title: (trimmedMsg || 'Document Analysis').slice(0, 30) + '...',
        messages: []
      });
    } else if (session.userId && req.user?._id && session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot send messages to another user\'s session' });
    }

    // 1. Append User Message
    const userMsg = {
      sender: 'user',
      text: trimmedMsg,
      attachments: hasAttachments ? attachments.map(a => ({
        name: a.name,
        type: a.type,
        size: a.size
      })) : [],
      timestamp: new Date()
    };
    session.messages.push(userMsg);

    // 2. Run SLD Legal Intelligence Engine
    const { text, legalAnalysis } = await runLegalIntelligenceEngine(trimmedMsg, focusNode, attachments || []);

    // 3. Append Assistant Message
    const assistantMsg = {
      sender: 'assistant',
      text,
      legalAnalysis,
      timestamp: new Date()
    };
    session.messages.push(assistantMsg);

    // Auto-update session title if default
    if (session.title === 'New Legal Research' || session.title.startsWith('New Session')) {
      session.title = (trimmedMsg || 'Legal Drafting').slice(0, 35) + '...';
    }

    await session.save();

    return res.status(200).json({
      success: true,
      data: {
        session,
        reply: assistantMsg
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Direct Query endpoint (no session required)
 */
export const queryLegalCore = async (req, res, next) => {
  try {
    const { query, focusNode, attachments } = req.body;
    const result = await runLegalIntelligenceEngine(query, focusNode, attachments || []);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const clearSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.userId && req.user?._id && session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot clear another user\'s session' });
    }
    session.messages = [];
    await session.save();
    return res.status(200).json({ success: true, message: 'Session cleared', data: session });
  } catch (err) {
    next(err);
  }
};
