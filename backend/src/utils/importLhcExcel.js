import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import XLSX from 'xlsx';
import OtherCaseLaw from '../models/OtherCaseLaw.js';

dotenv.config({ override: true });

const workbookPath = process.env.LHC_EXCEL_PATH || path.resolve(process.cwd(), '..', 'LIST LHC.xlsx');
const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const formatDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = String(value.getUTCDate()).padStart(2, '0');
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${value.getUTCFullYear()}`;
  }
  return clean(value);
};

const parseYear = (value, citation) => {
  const explicitYear = Number(clean(value));
  if (explicitYear >= 1800 && explicitYear <= 2200) return explicitYear;
  const citationYear = clean(citation).match(/\b(18|19|20|21)\d{2}\b/);
  return citationYear ? Number(citationYear[0]) : undefined;
};

const makeOtherCaseId = (citation) => `OCL-LHC-${citation
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '-')
  .replace(/^-|-$/g, '')}`;

const importLhcCases = async () => {
  const workbook = XLSX.readFile(workbookPath, { cellDates: true });
  const sheet = workbook.Sheets.Sheet1;
  if (!sheet) throw new Error('Worksheet Sheet1 was not found.');

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const dataRows = rows.slice(1)
    .map((row) => ({
      citation: clean(row[1]),
      caseNo: clean(row[2]),
      caseYear: parseYear(row[3], row[1]),
      parties: clean(row[4]),
      orderDate: formatDate(row[5]),
      headNotes: clean(row[6]),
      bench: clean(row[7]),
      apexCourt: clean(row[8]),
      apexStatus: clean(row[9]),
      downloadLink: clean(row[10])
    }))
    .filter((row) => row.citation && row.caseNo);

  const uniqueRows = [];
  const seen = new Set();
  for (const row of dataRows) {
    const key = row.citation.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRows.push(row);
    }
  }

  const existing = await OtherCaseLaw.find({
    $or: [
      { citation: { $in: uniqueRows.map((row) => row.citation) } },
      { downloadLink: { $in: uniqueRows.map((row) => row.downloadLink).filter(Boolean) } }
    ]
  }).select('_id citation downloadLink otherCaseId other_case_id srNumber').lean();

  const repairOperations = [];
  let nextSrNumber = (await OtherCaseLaw.findOne({ srNumber: { $type: 'number' } })
    .sort({ srNumber: -1 }).select('srNumber').lean())?.srNumber || 0;
  for (const row of existing) {
    const updates = {};
    if (!row.otherCaseId && !row.other_case_id) {
      updates.otherCaseId = makeOtherCaseId(row.citation);
      updates.other_case_id = updates.otherCaseId;
    }
    if (!row.srNumber) updates.srNumber = ++nextSrNumber;
    if (Object.keys(updates).length > 0) {
      repairOperations.push({ updateOne: { filter: { _id: row._id }, update: { $set: updates } } });
    }
  }
  if (repairOperations.length > 0) {
    await OtherCaseLaw.bulkWrite(repairOperations, { ordered: true });
    console.log(`[LHC Import] Repaired generated fields on ${repairOperations.length} imported records.`);
  }

  const existingKeys = new Set();
  existing.forEach((row) => {
    if (row.citation) existingKeys.add(`citation:${row.citation.toLowerCase()}`);
    if (row.downloadLink) existingKeys.add(`url:${row.downloadLink}`);
  });

  const documents = uniqueRows
    .filter((row) => !existingKeys.has(`citation:${row.citation.toLowerCase()}`) &&
      (!row.downloadLink || !existingKeys.has(`url:${row.downloadLink}`)))
    .map((row) => ({
      otherCaseId: makeOtherCaseId(row.citation),
      other_case_id: makeOtherCaseId(row.citation),
      citation: row.citation,
      caseNo: row.caseNo,
      caseYear: row.caseYear,
      parties: row.parties,
      caseTitle: row.parties,
      orderDate: row.orderDate,
      judgmentDate: row.orderDate,
      headNotes: row.headNotes,
      notes: row.headNotes,
      bench: row.bench,
      authorJudge: row.bench,
      apexCourt: row.apexCourt,
      apexStatus: row.apexStatus,
      caseNoLink: row.downloadLink,
      downloadLink: row.downloadLink,
      isDeleted: false
    }));

  const newRecordsSrStart = nextSrNumber;
  for (const document of documents) {
    document.srNumber = ++nextSrNumber;
  }

  for (let index = 0; index < documents.length; index += 250) {
    await OtherCaseLaw.insertMany(documents.slice(index, index + 250), { ordered: true });
    console.log(`[LHC Import] Inserted ${Math.min(index + 250, documents.length)} / ${documents.length}`);
  }

  console.log(`[LHC Import] Workbook rows: ${dataRows.length}`);
  console.log(`[LHC Import] Duplicate rows skipped: ${dataRows.length - uniqueRows.length}`);
  console.log(`[LHC Import] Existing records skipped: ${uniqueRows.length - documents.length}`);
  console.log(`[LHC Import] New SR range: ${documents.length ? `${newRecordsSrStart + 1}-${nextSrNumber}` : 'none'}`);
  console.log(`[LHC Import] New records inserted: ${documents.length}`);
};

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured.');
  console.log(`[LHC Import] Reading ${workbookPath}`);
  await mongoose.connect(process.env.MONGODB_URI);
  await importLhcCases();
} catch (error) {
  console.error(`[LHC Import Error] ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
