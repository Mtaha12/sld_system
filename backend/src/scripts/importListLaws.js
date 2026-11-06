import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';
import LawSetting from '../models/LawSetting.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';

export async function importListLaws() {
  console.log('\n==========================================================');
  console.log('   SLD SYSTEM - IMPORT LAWS FROM LIST.xlsx                ');
  console.log('==========================================================\n');

  // Locate LIST.xlsx
  const candidatePaths = [
    path.resolve(process.cwd(), 'LIST.xlsx'),
    path.resolve(process.cwd(), '../LIST.xlsx'),
    path.resolve(__dirname, '../../../../LIST.xlsx'),
    path.resolve(__dirname, '../../../LIST.xlsx'),
    '/var/www/sld_system/LIST.xlsx',
    '/var/www/sld-system/LIST.xlsx'
  ];

  let excelPath = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      excelPath = p;
      break;
    }
  }

  if (!excelPath) {
    console.error('Error: LIST.xlsx not found in any standard project location.');
    return { success: false, message: 'LIST.xlsx not found' };
  }

  console.log(`>>> Found Excel file: ${excelPath}`);

  // Read Excel file
  const workbook = xlsx.readFile(excelPath);
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // Extract law names
  const candidateNames = [];
  for (const r of rows) {
    if (Array.isArray(r) && r[0]) {
      const clean = String(r[0]).trim();
      if (clean && clean.length >= 2) {
        candidateNames.push(clean);
      }
    }
  }

  console.log(`>>> Total valid rows in LIST.xlsx: ${candidateNames.length}`);

  // Connect to MongoDB if not connected
  if (mongoose.connection.readyState !== 1) {
    console.log(`>>> Connecting to MongoDB (${MONGODB_URI})...`);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('✓ Connected to MongoDB');
  }

  // Get all existing laws to guarantee zero duplicates
  const existingLaws = await LawSetting.find({}, 'name ordering').lean();
  const existingSet = new Set(existingLaws.map(l => (l.name || '').trim().toLowerCase()));
  console.log(`>>> Current laws in database: ${existingLaws.length}`);

  // Find max ordering
  let maxOrdering = 0;
  for (const l of existingLaws) {
    if (typeof l.ordering === 'number' && l.ordering > maxOrdering) {
      maxOrdering = l.ordering;
    }
  }

  const toInsert = [];
  const seenInBatch = new Set();
  let duplicateCount = 0;

  for (const name of candidateNames) {
    const lower = name.toLowerCase();
    if (existingSet.has(lower) || seenInBatch.has(lower)) {
      duplicateCount++;
      continue;
    }

    seenInBatch.add(lower);
    maxOrdering += 1;
    toInsert.push({
      name,
      ordering: maxOrdering,
      date: new Date(),
      status: 'active',
      court: ''
    });
  }

  console.log(`>>> Already existing or duplicate rows in file: ${duplicateCount}`);
  console.log(`>>> New unique laws to insert: ${toInsert.length}`);

  if (toInsert.length > 0) {
    // Insert in batches of 500
    const BATCH_SIZE = 500;
    let insertedCount = 0;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      const res = await LawSetting.insertMany(batch, { ordered: false });
      insertedCount += res.length;
      console.log(`  -> Inserted batch: ${insertedCount} / ${toInsert.length}`);
    }
    console.log(`✓ Successfully inserted ${insertedCount} new laws into LawSetting!`);
  } else {
    console.log('✓ All laws from LIST.xlsx are already present in the database. No new laws to insert.');
  }

  const finalCount = await LawSetting.countDocuments();
  console.log(`>>> Final total laws in database: ${finalCount}\n`);

  return {
    success: true,
    totalInFile: candidateNames.length,
    duplicateCount,
    insertedCount: toInsert.length,
    finalTotal: finalCount
  };
}

// Allow direct CLI execution: node backend/src/scripts/importListLaws.js
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('importListLaws.js')) {
  importListLaws()
    .then(() => {
      mongoose.disconnect();
      process.exit(0);
    })
    .catch(err => {
      console.error('Import failed:', err);
      mongoose.disconnect();
      process.exit(1);
    });
}
