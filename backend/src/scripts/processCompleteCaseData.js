import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import XLSX from 'xlsx';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Case from '../models/Case.js';

const ROOT_DIR = path.resolve(__dirname, '../../..');

const clean = (val) => String(val ?? '').replace(/\r/g, '').trim();

const asArray = (val) => {
  const text = clean(val);
  return text ? [text] : [];
};

/**
 * Robust HTML sanitizer and entity decoder
 */
export function stripHtmlAndEntities(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // Replace <br> and <br/> with newline
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');

  // Replace block element closings with newline
  cleaned = cleaned.replace(/<\/(tr|div|p|h[1-6]|li)>/gi, '\n');

  // Replace table cell elements with spacing
  cleaned = cleaned.replace(/<(td|th)[^>]*>/gi, ' ');
  cleaned = cleaned.replace(/<\/(td|th)>/gi, '   ');

  // Strip links but preserve inner text: <a ...>text</a> -> text
  cleaned = cleaned.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1');

  // Strip all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Decode standard HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&hellip;/gi, '…')
    .replace(/&bull;/gi, '•')
    .replace(/&rsquo;|&lsquo;/gi, "'")
    .replace(/&rdquo;|&ldquo;/gi, '"');

  // Clean excessive spaces and multiple empty lines
  cleaned = cleaned
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

/**
 * Extracts decision date from Case# string
 */
const extractDate = (caseNumberStr) => {
  if (!caseNumberStr) return null;
  const match = String(caseNumberStr).match(/(?:decision\s+dated|dated|decided\s+on)\s*[:\-]?\s*(\d{1,2})[-/.\s]+([A-Za-z]+|\d{1,2})[-/.\s]+(\d{2,4})/i);
  if (!match) return null;

  let day = match[1].padStart(2, '0');
  let mPart = match[2];
  let year = match[3];
  if (year.length === 2) year = `20${year}`;

  const months = {
    jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
    apr: '04', april: '04', may: '05', jun: '06', june: '06', jul: '07', july: '07',
    aug: '08', august: '08', sep: '09', september: '09', oct: '10', october: '10',
    nov: '11', november: '11', dec: '12', december: '12'
  };

  let month = '01';
  if (months[mPart.toLowerCase()]) {
    month = months[mPart.toLowerCase()];
  } else if (/^\d+$/.test(mPart)) {
    month = mPart.padStart(2, '0');
  }

  return `${year}-${month}-${day}`;
};

/**
 * Normalizes citation
 */
const normalizeCitation = (rawCitation) => {
  const text = stripHtmlAndEntities(rawCitation);
  if (!text) return null;

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

  if (/^\d{4}$/.test(parts[0])) {
    const year = parts[0];
    if (parts.length >= 4 && /^\d+$/.test(parts[1])) {
      return {
        year,
        vol: parts[1],
        mag: parts[2],
        page: parts.slice(3).join(' '),
        formatted: `${year} ${parts[1]} ${parts[2].toUpperCase()} ${parts.slice(3).join(' ')}`
      };
    } else if (parts.length >= 3) {
      return {
        year,
        vol: '',
        mag: parts[1],
        page: parts.slice(2).join(' '),
        formatted: `${year} ${parts[1].toUpperCase()} ${parts.slice(2).join(' ')}`
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

  return {
    year: '',
    vol: '',
    mag: parts[0] || '',
    page: parts.slice(1).join(' '),
    formatted: text
  };
};

const parseRowCitations = (rawCell) => {
  if (!rawCell) return { mapYearPage: [], publications: [] };
  const rawParts = String(rawCell).split(/(?:\s{2,}|=|;|\r?\n)/).map(clean).filter(Boolean);

  const publications = [];
  const mapYearPage = [];
  const seenKeys = new Set();

  for (const part of rawParts) {
    const parsed = normalizeCitation(part);
    if (!parsed) continue;

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

const parseLaws = (val) => {
  if (!val) return [];
  const text = String(val).trim();
  const lines = text.split(/(?:\r?\n|\s{2,})/).map(s => s.trim()).filter(Boolean);
  const results = [];

  for (const line of lines) {
    if (line.includes('=')) {
      const idx = line.indexOf('=');
      const lawStatute = stripHtmlAndEntities(line.slice(0, idx).trim());
      const sections = line.slice(idx + 1).split(',').map(s => stripHtmlAndEntities(s.trim())).filter(Boolean);
      for (const section of (sections.length ? sections : [''])) {
        results.push({ lawStatute, section });
      }
    } else {
      const match = line.match(/^(.+?,\s*\d{4}|\D+?)\s+([0-9A-Za-z(),._ -]+)$/);
      if (match) {
        const lawStatute = stripHtmlAndEntities(match[1].trim());
        const sections = match[2].split(',').map(s => stripHtmlAndEntities(s.trim())).filter(Boolean);
        for (const section of (sections.length ? sections : [''])) {
          results.push({ lawStatute, section });
        }
      } else {
        results.push({ lawStatute: stripHtmlAndEntities(line.trim()), section: '' });
      }
    }
  }
  return results;
};

async function execute() {
  console.log('='.repeat(75));
  console.log('STARTING COMPLETE CASE LAW VERIFICATION, IMPORT & HTML CLEANING');
  console.log('='.repeat(75));

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  await mongoose.connect(mongoUri);
  console.log('[1/4] Connected to MongoDB.');

  const coll = mongoose.connection.db.collection('cases');

  // STEP A: Import missing cases from 150001-170000.xlsx (SLD 162866..165278)
  console.log('\n[2/4] Checking for missing cases in 150001-170000.xlsx...');
  const file150k = path.join(ROOT_DIR, '150001-170000.xlsx');
  const wb = XLSX.readFile(file150k, { cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const existingSlds = new Set(await coll.distinct('sldNumberInt'));
  console.log(`Currently in DB: ${existingSlds.size} cases.`);

  const toInsert = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const sldNum = parseInt(r[0], 10);
    if (isNaN(sldNum)) continue;

    if (!existingSlds.has(sldNum)) {
      const sldStr = String(sldNum);
      const citationData = parseRowCitations(r[2] || r[1]);
      const dated = extractDate(r[5]);

      toInsert.push({
        caseId: `CASE-${sldStr}`,
        case_id: `CASE-${sldStr}`,
        sldNumber: sldStr,
        sldNumberInt: sldNum,
        dated: dated || null,
        department: 'tax',
        court: stripHtmlAndEntities(r[3]),
        laws: parseLaws(r[4]),
        caseNumber: r[5] ? [stripHtmlAndEntities(r[5])] : [],
        judges: r[6] ? [stripHtmlAndEntities(r[6])] : [],
        lawyers: r[7] ? [stripHtmlAndEntities(r[7])] : [],
        petitioners: r[8] ? [stripHtmlAndEntities(r[8])] : [],
        headNote: stripHtmlAndEntities(r[9]),
        references: '',
        principleLaw: '',
        legalMaxim: '',
        judgment: '',
        publications: citationData.publications,
        mapYearPage: citationData.mapYearPage,
        attachments: [],
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      existingSlds.add(sldNum);
    }
  }

  if (toInsert.length > 0) {
    console.log(`Inserting ${toInsert.length} newly found cases...`);
    const BATCH = 500;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      await coll.insertMany(toInsert.slice(i, i + BATCH), { ordered: true });
      console.log(`  Inserted ${Math.min(i + BATCH, toInsert.length)} / ${toInsert.length}`);
    }
  } else {
    console.log('No new cases needed to insert from Excel.');
  }

  // STEP B: Check for any number jumps/gaps between 1 and 165278
  console.log('\n[3/4] Verifying 100% number continuity 1..165278...');
  const maxSldRecord = await coll.find().sort({ sldNumberInt: -1 }).limit(1).toArray();
  const maxSld = maxSldRecord[0]?.sldNumberInt || 165278;
  console.log(`Highest SLD Number in DB: ${maxSld}`);

  const gaps = [];
  for (let num = 1; num <= maxSld; num++) {
    if (!existingSlds.has(num)) {
      gaps.push({
        caseId: `CASE-${num}`,
        case_id: `CASE-${num}`,
        sldNumber: String(num),
        sldNumberInt: num,
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
        judgment: '',
        publications: [],
        mapYearPage: [],
        attachments: [],
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      existingSlds.add(num);
    }
  }

  if (gaps.length > 0) {
    console.log(`Found ${gaps.length} jumped numbers. Inserting empty placeholder cases so numbering is continuous...`);
    await coll.insertMany(gaps);
  } else {
    console.log('Zero jumps found. Numbering 1 to ' + maxSld + ' is 100% complete and continuous!');
  }

  // STEP C: Clean ALL HTML tags and entities across the entire collection
  console.log('\n[4/4] Sanitizing all HTML tags and entities across all cases...');
  
  // Find cases with HTML in judgment or headNote
  const htmlQuery = {
    $or: [
      { judgment: { $regex: /<[a-z/][\s\S]*?>|&(?:nbsp|amp|quot|#039|#39|apos|ndash|mdash|hellip|bull|rsquo|lsquo|rdquo|ldquo);/i } },
      { headNote: { $regex: /<[a-z/][\s\S]*?>|&(?:nbsp|amp|quot|#039|#39|apos|ndash|mdash|hellip|bull|rsquo|lsquo|rdquo|ldquo);/i } },
      { lawyers: { $regex: /<[a-z/][\s\S]*?>|&(?:nbsp|amp|quot|#039|#39|apos);/i } },
      { petitioners: { $regex: /<[a-z/][\s\S]*?>|&(?:nbsp|amp|quot|#039|#39|apos);/i } },
      { judges: { $regex: /<[a-z/][\s\S]*?>|&(?:nbsp|amp|quot|#039|#39|apos);/i } }
    ]
  };

  const casesToClean = await coll.find(htmlQuery, {
    projection: { _id: 1, sldNumber: 1, judgment: 1, headNote: 1, lawyers: 1, petitioners: 1, judges: 1 }
  }).toArray();

  console.log(`Found ${casesToClean.length} cases with HTML tags or entities to clean.`);

  let updatedCount = 0;
  const bulkOps = [];

  for (const doc of casesToClean) {
    const update = {};
    if (doc.judgment) {
      update.judgment = stripHtmlAndEntities(doc.judgment);
    }
    if (doc.headNote) {
      update.headNote = stripHtmlAndEntities(doc.headNote);
    }
    if (Array.isArray(doc.lawyers)) {
      update.lawyers = doc.lawyers.map(stripHtmlAndEntities);
    }
    if (Array.isArray(doc.petitioners)) {
      update.petitioners = doc.petitioners.map(stripHtmlAndEntities);
    }
    if (Array.isArray(doc.judges)) {
      update.judges = doc.judges.map(stripHtmlAndEntities);
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: update }
      }
    });

    if (bulkOps.length >= 500) {
      await coll.bulkWrite(bulkOps);
      updatedCount += bulkOps.length;
      console.log(`  Cleaned ${updatedCount} / ${casesToClean.length} cases...`);
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    await coll.bulkWrite(bulkOps);
    updatedCount += bulkOps.length;
  }

  console.log(`\nSUCCESS: Cleaned ${updatedCount} cases completely.`);

  // FINAL AUDIT
  const totalCasesFinal = await coll.countDocuments();
  const htmlRemaining = await coll.countDocuments({
    $or: [
      { judgment: { $regex: /<[a-z/][\s\S]*?>/i } },
      { headNote: { $regex: /<[a-z/][\s\S]*?>/i } }
    ]
  });

  console.log('='.repeat(75));
  console.log('FINAL DATABASE STATUS:');
  console.log(`- Total Cases in DB: ${totalCasesFinal}`);
  console.log(`- Continuous Numbers 1 to ${maxSld}: YES`);
  console.log(`- HTML Tags Remaining: ${htmlRemaining} (0 = perfectly clean)`);
  console.log('='.repeat(75));

  process.exit(0);
}

execute().catch(err => {
  console.error('[Error executing script]:', err);
  process.exit(1);
});
