import dns from 'dns';
import dotenv from 'dotenv';
import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import XLSX from 'xlsx';
import Case from '../models/Case.js';
import Counter from '../models/Counter.js';

// Setup DNS for MongoDB Atlas
dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ override: true });

const excelPath = path.resolve(process.cwd(), '..', '1-15000.xlsx');
const judgmentPath = path.resolve(process.cwd(), '..', 'Judgment SLD # 1-500.txt');

const clean = (val) => String(val ?? '').replace(/\r/g, '').trim();

const asArray = (val) => {
  const text = clean(val);
  return text ? [text] : [];
};

/**
 * Extracts decision date from Case# string if available (e.g. "decision dated: 14-06-2005")
 */
const extractDate = (caseNumberStr) => {
  if (!caseNumberStr) return null;
  const match = String(caseNumberStr).match(/(?:decision\s+dated|dated)\s*[:\-]?\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/i);
  if (!match) return null;

  let day = match[1].padStart(2, '0');
  let month = match[2].padStart(2, '0');
  let year = match[3];
  if (year.length === 2) year = `20${year}`;

  // If first number is > 12, it's definitely day. Format as YYYY-MM-DD
  return `${year}-${month}-${day}`;
};

/**
 * Normalizes citation so that it follows "YEAR MAG PAGE" or "(YEAR) VOL MAG PAGE"
 * e.g. "SLD 2006 1" -> "2006 SLD 1"
 * e.g. "2006 SLD 1" -> "2006 SLD 1"
 * e.g. "(2005) 92 TAX 141" -> "(2005) 92 TAX 141"
 */
const normalizeCitation = (rawCitation) => {
  const text = clean(rawCitation);
  if (!text) return null;

  // Pattern 1: Parenthesized year, e.g. (2005) 92 TAX 141
  const parenMatch = text.match(/^\((\d{4})\)\s*(.*)$/);
  if (parenMatch) {
    const year = parenMatch[1];
    const rest = parenMatch[2].trim();
    const parts = rest.split(/\s+/);
    if (parts.length >= 3) {
      return {
        year,
        vol: parts[0],
        mag: parts[1],
        page: parts.slice(2).join(' '),
        formatted: `(${year}) ${parts[0]} ${parts[1].toUpperCase()} ${parts.slice(2).join(' ')}`
      };
    } else if (parts.length === 2) {
      return {
        year,
        vol: '',
        mag: parts[0],
        page: parts[1],
        formatted: `(${year}) ${parts[0].toUpperCase()} ${parts[1]}`
      };
    }
    return {
      year,
      vol: '',
      mag: parts[0] || '',
      page: parts.slice(1).join(' '),
      formatted: `(${year}) ${rest}`
    };
  }

  const parts = text.split(/\s+/);

  // Pattern 2: Starts with 4-digit year, e.g. "2006 SLD 1" or "2005 92 TAX 141"
  if (/^\d{4}$/.test(parts[0])) {
    const year = parts[0];
    if (parts.length >= 4 && /^\d+$/.test(parts[1])) {
      const vol = parts[1];
      const mag = parts[2];
      const page = parts.slice(3).join(' ');
      return {
        year,
        vol,
        mag,
        page,
        formatted: `${year} ${vol} ${mag.toUpperCase()} ${page}`
      };
    } else if (parts.length >= 3) {
      const mag = parts[1];
      const page = parts.slice(2).join(' ');
      return {
        year,
        vol: '',
        mag,
        page,
        formatted: `${year} ${mag.toUpperCase()} ${page}`
      };
    } else if (parts.length === 2) {
      return {
        year,
        vol: '',
        mag: parts[1],
        page: '',
        formatted: `${year} ${parts[1].toUpperCase()}`
      };
    }
  }

  // Pattern 3: Starts with magazine, e.g. "SLD 2006 1" -> convert to "2006 SLD 1"
  if (parts.length >= 3 && /^\d{4}$/.test(parts[1])) {
    const mag = parts[0];
    const year = parts[1];
    const page = parts.slice(2).join(' ');
    return {
      year,
      vol: '',
      mag,
      page,
      formatted: `${year} ${mag.toUpperCase()} ${page}`
    };
  }

  // Fallback
  return {
    year: '',
    vol: '',
    mag: parts[0] || '',
    page: parts.slice(1).join(' '),
    formatted: text
  };
};

/**
 * Parses the raw citation cell containing multiple citations separated by 2+ spaces or delimiters
 */
const parseRowCitations = (rawCell) => {
  if (!rawCell) return { mapYearPage: [], publications: [] };
  const rawParts = String(rawCell).split(/(?:\s{2,}|=|;|\r?\n)/).map(clean).filter(Boolean);

  const publications = [];
  const mapYearPage = [];
  const seenKeys = new Set();

  for (const part of rawParts) {
    const parsed = normalizeCitation(part);
    if (!parsed) continue;

    // Deduplication key: e.g. "2006|sld||1"
    const dedupKey = `${parsed.year}|${parsed.mag.toLowerCase()}|${parsed.vol}|${parsed.page}`.toLowerCase();
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    publications.push({
      year: parsed.year,
      vol: parsed.vol,
      mag: parsed.mag.toLowerCase(),
      page: parsed.page
    });
    mapYearPage.push(parsed.formatted);
  }

  return { mapYearPage, publications };
};

/**
 * Parses Laws & Sections string
 */
const parseLaws = (val) => {
  if (!val) return [];
  const text = String(val).trim();
  const lines = text.split(/(?:\r?\n|\s{2,})/).map(s => s.trim()).filter(Boolean);
  const results = [];

  for (const line of lines) {
    if (line.includes('=')) {
      const idx = line.indexOf('=');
      const lawStatute = line.slice(0, idx).trim();
      const sections = line.slice(idx + 1).split(',').map(s => s.trim()).filter(Boolean);
      for (const section of (sections.length ? sections : [''])) {
        results.push({ lawStatute, section });
      }
    } else {
      const match = line.match(/^(.+?,\s*\d{4}|\D+?)\s+([0-9A-Za-z(),._ -]+)$/);
      if (match) {
        const lawStatute = match[1].trim();
        const sections = match[2].split(',').map(s => s.trim()).filter(Boolean);
        for (const section of (sections.length ? sections : [''])) {
          results.push({ lawStatute, section });
        }
      } else {
        results.push({ lawStatute: line.trim(), section: '' });
      }
    }
  }
  return results;
};

/**
 * Reads and parses Judgment SLD # 1-500.txt into a Map (sldNumber -> judgmentText)
 */
const loadJudgments = () => {
  console.log(`[Judgments] Loading from: ${judgmentPath}`);
  if (!fs.existsSync(judgmentPath)) {
    console.warn(`[Judgments] Warning: ${judgmentPath} not found!`);
    return new Map();
  }

  const content = fs.readFileSync(judgmentPath, 'utf-8');
  const regex = /(?:^|\r?\n)SLD\s*#\s*:\s*(\d+)\r?\n/gi;
  let match;
  const judgmentMap = new Map();
  let lastIndex = 0;
  let lastSld = null;

  while ((match = regex.exec(content)) !== null) {
    if (lastSld !== null) {
      judgmentMap.set(String(lastSld), content.slice(lastIndex, match.index).trim());
    }
    lastSld = parseInt(match[1], 10);
    lastIndex = match.index + match[0].length;
  }

  if (lastSld !== null) {
    judgmentMap.set(String(lastSld), content.slice(lastIndex).trim());
  }

  console.log(`[Judgments] Parsed ${judgmentMap.size} judgments successfully.`);
  return judgmentMap;
};

/**
 * Main execution function
 */
export const wipeAndImport = async () => {
  console.log('--- STARTING COMPLETE CASE LAW DATA RESET AND IMPORT ---');

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured in .env');
  }

  console.log('[Database] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[Database] Connected successfully.');

  // STEP 1: Wipe all previous case data and reset counter
  console.log('[Wipe] Deleting all existing documents in cases collection...');
  const deleteResult = await Case.deleteMany({});
  console.log(`[Wipe] Deleted ${deleteResult.deletedCount} old cases.`);

  console.log('[Wipe] Resetting case counter in counters collection...');
  await Counter.deleteOne({ _id: 'case' });
  console.log('[Wipe] Counter reset done.');

  // STEP 2: Load judgments
  const judgmentMap = loadJudgments();

  // STEP 3: Load Excel workbook
  console.log(`[Excel] Loading workbook: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath, { cellDates: false });
  const sheet = workbook.Sheets['CASE DATA'];
  if (!sheet) {
    throw new Error('Worksheet "CASE DATA" not found in workbook.');
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`[Excel] Read ${rows.length} total rows (including header).`);

  const dataRows = rows.slice(1);
  const seenSldNumbers = new Set();
  const casesToInsert = [];

  for (const row of dataRows) {
    const rawSld = clean(row[0]);
    if (!rawSld) continue;

    const sldNumber = String(rawSld);
    if (seenSldNumbers.has(sldNumber)) continue;
    seenSldNumbers.add(sldNumber);

    const sldNumInt = parseInt(sldNumber, 10);
    const judgmentText = judgmentMap.get(sldNumber) || '';
    const citationData = parseRowCitations(row[1]);
    const dated = extractDate(row[4]);

    casesToInsert.push({
      caseId: `CASE-IMPORT-${sldNumber}`,
      case_id: `CASE-IMPORT-${sldNumber}`,
      sldNumber,
      dated: dated || null,
      department: 'tax',
      court: clean(row[2]),
      laws: parseLaws(row[3]),
      caseNumber: asArray(row[4]),
      judges: asArray(row[5]),
      lawyers: asArray(row[6]),
      petitioners: asArray(row[7]),
      headNote: clean(row[8]),
      references: '',
      principleLaw: '',
      legalMaxim: '',
      judgment: judgmentText,
      publications: citationData.publications,
      mapYearPage: citationData.mapYearPage,
      attachments: [],
      isDeleted: false,
    });
  }

  // STEP 4: Detect missing SLD numbers between 1 and 15000 and insert empty placeholder cases
  console.log('[Missing SLD Check] Scanning for missing numbers between 1 and 15000...');
  let missingCount = 0;
  for (let num = 1; num <= 15000; num++) {
    const sldStr = String(num);
    if (!seenSldNumbers.has(sldStr)) {
      missingCount++;
      const judgmentText = judgmentMap.get(sldStr) || '';
      casesToInsert.push({
        caseId: `CASE-IMPORT-${sldStr}`,
        case_id: `CASE-IMPORT-${sldStr}`,
        sldNumber: sldStr,
        dated: null,
        department: 'tax',
        court: '',
        laws: [],
        caseNumber: [],
        judges: [],
        lawyers: [],
        petitioners: [],
        headNote: '',
        references: '',
        principleLaw: '',
        legalMaxim: '',
        judgment: judgmentText,
        publications: [],
        mapYearPage: [],
        attachments: [],
        isDeleted: false,
      });
      seenSldNumbers.add(sldStr);
    }
  }

  console.log(`[Missing SLD Check] Added ${missingCount} missing placeholder cases with all fields empty.`);

  // Sort by sldNumber integer order before bulk insertion
  casesToInsert.sort((a, b) => parseInt(a.sldNumber, 10) - parseInt(b.sldNumber, 10));

  console.log(`[Insert] Total documents ready for insertion: ${casesToInsert.length}`);

  // Batch insert in chunks of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < casesToInsert.length; i += BATCH_SIZE) {
    const chunk = casesToInsert.slice(i, i + BATCH_SIZE);
    await Case.insertMany(chunk, { ordered: true });
    console.log(`[Insert] Inserted ${Math.min(i + BATCH_SIZE, casesToInsert.length)} / ${casesToInsert.length} cases`);
  }

  // Ensure indexes
  console.log('[Indexes] Creating database indexes...');
  try {
    await Case.collection.createIndex({ sldNumber: 1 });
  } catch (e) {
    // Index already exists
  }
  try {
    await Case.collection.createIndex({ isDeleted: 1, sldNumber: 1 });
  } catch (e) {
    // Index already exists
  }
  try {
    await Case.collection.createIndex({ isDeleted: 1, dated: -1 });
  } catch (e) {
    // Index already exists
  }

  console.log('--- CASE LAW WIPE AND IMPORT COMPLETED SUCCESSFULLY ---');
};

// If run directly via CLI
if (process.argv[1] && process.argv[1].endsWith('wipeAndImportCases.js')) {
  try {
    await wipeAndImport();
    process.exit(0);
  } catch (err) {
    console.error('[Migration Failed]', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}
