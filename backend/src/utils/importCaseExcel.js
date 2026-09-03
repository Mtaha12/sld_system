import dns from 'dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import XLSX from 'xlsx';
import Case from '../models/Case.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ override: true });

const workbookPath = process.env.CASE_EXCEL_PATH || path.resolve(process.cwd(), '..', '1-15000.xlsx');
const clean = (value) => String(value ?? '').replace(/\\n/g, '\n').replace(/\\r/g, '').trim();
const asArray = (value) => {
  const text = clean(value);
  return text ? [text] : [];
};

const parseCitation = (citation) => {
  const text = clean(citation);
  if (!text) return { year: '', vol: '', mag: '', page: '' };

  const parenthesized = text.match(/^\((\d{4})\)\s+(.+)$/);
  if (parenthesized) {
    const parts = parenthesized[2].split(/\s+/);
    return { year: parenthesized[1], vol: parts.length > 2 ? parts[0] : '', mag: parts.length > 1 ? parts[1].toLowerCase() : '', page: parts.at(-1) || '' };
  }

  const parts = text.split(/\s+/);
  if (parts.length >= 3 && /^\d{4}$/.test(parts[0])) {
    return { year: parts[0], vol: parts.length > 3 ? parts[2] : '', mag: parts[1].toLowerCase(), page: parts.at(-1) || '' };
  }
  if (parts.length >= 3) {
    return { year: parts[1], vol: parts.length > 3 ? parts[2] : '', mag: parts[0].toLowerCase(), page: parts.at(-1) || '' };
  }
  return { year: '', vol: '', mag: '', page: '' };
};

const parsePublications = (value) => {
  const citations = clean(value).split('=').map(clean).filter(Boolean);
  return { mapYearPage: citations, publications: citations.map(parseCitation) };
};

const parseLaws = (value) => clean(value)
  .split(/\r?\n/)
  .map(clean)
  .filter(Boolean)
  .flatMap((line) => {
    const separator = line.indexOf('=');
    const lawStatute = clean(separator === -1 ? line : line.slice(0, separator));
    const sections = separator === -1 ? [''] : line.slice(separator + 1).split(',').map(clean);
    return sections.filter((section) => lawStatute || section).map((section) => ({ lawStatute, section }));
  });

const repairExistingImportedCases = async () => {
  const operations = [];
  const cursor = Case.find({ caseId: /^CASE-IMPORT-/ }).select('_id laws').lean().cursor();
  for await (const existingCase of cursor) {
    const laws = normalizeImportedLaws(existingCase.laws);
    operations.push({ updateOne: { filter: { _id: existingCase._id }, update: { $set: { laws } } } });
    if (operations.length === 250) {
      await Case.bulkWrite(operations, { ordered: true });
      operations.length = 0;
    }
  }
  if (operations.length > 0) await Case.bulkWrite(operations, { ordered: true });
};

const normalizeImportedLaws = (laws = []) => (Array.isArray(laws) ? laws : [])
  .map((law) => ({ lawStatute: clean(law?.lawStatute), section: clean(law?.section) }))
  .filter((law) => law.lawStatute || law.section);

const importCases = async () => {
  const workbook = XLSX.readFile(workbookPath, { cellDates: false });
  const sheet = workbook.Sheets['CASE DATA'];
  if (!sheet) throw new Error('Worksheet CASE DATA was not found.');

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  await repairExistingImportedCases();
  const dataRows = rows.slice(1).filter((row) => clean(row[0]));
  const sldNumbers = [...new Set(dataRows.map((row) => clean(row[0])))];
  const existing = await Case.find({ sldNumber: { $in: sldNumbers } }).select('sldNumber').lean();
  const existingNumbers = new Set(existing.map((item) => String(item.sldNumber)));
  const seen = new Set();
  const documents = [];

  for (const row of dataRows) {
    const sldNumber = clean(row[0]);
    if (existingNumbers.has(sldNumber) || seen.has(sldNumber)) continue;
    seen.add(sldNumber);
    const publicationData = parsePublications(row[1]);
    documents.push({
      caseId: `CASE-IMPORT-${sldNumber}`,
      sldNumber,
      dated: '',
      court: clean(row[2]),
      laws: normalizeImportedLaws(parseLaws(row[3])),
      caseNumber: asArray(row[4]),
      judges: asArray(row[5]),
      lawyers: asArray(row[6]),
      petitioners: asArray(row[7]),
      headNote: clean(row[8]),
      references: '',
      principleLaw: '',
      legalMaxim: '',
      judgment: '',
      publications: publicationData.publications,
      mapYearPage: publicationData.mapYearPage,
      attachments: [],
      isDeleted: false,
    });
  }

  for (let index = 0; index < documents.length; index += 250) {
    await Case.insertMany(documents.slice(index, index + 250), { ordered: true });
    console.log(`[Case Import] Inserted ${Math.min(index + 250, documents.length)} / ${documents.length}`);
  }

  console.log(`[Case Import] Workbook rows: ${dataRows.length}`);
  console.log(`[Case Import] Existing skipped: ${dataRows.length - documents.length}`);
  console.log(`[Case Import] New cases inserted: ${documents.length}`);
};

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured.');
  console.log(`[Case Import] Reading ${workbookPath}`);
  await mongoose.connect(process.env.MONGODB_URI);
  await Case.collection.createIndex({ isDeleted: 1, sldNumber: -1 });
  await importCases();
} catch (error) {
  console.error(`[Case Import Error] ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
