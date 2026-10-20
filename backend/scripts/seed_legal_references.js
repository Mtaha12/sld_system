import mongoose from 'mongoose';
import dotenv from 'dotenv';
import xlsx from 'xlsx';
import path from 'path';

import Article from '../src/models/Article.js';
import Topic from '../src/models/Topic.js';
import WordPhrase from '../src/models/WordPhrase.js';
import LegalTerm from '../src/models/LegalTerm.js';
import LegalMaxim from '../src/models/LegalMaxim.js';

dotenv.config();

const filePath = path.resolve('../LIST OF ARTICLES, TOPICS AND WORDS & PHRASES.xlsx');

async function seedData() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sld_system');
  const db = mongoose.connection.db;

  console.log('Reading Excel file:', filePath);
  const workbook = xlsx.readFile(filePath);

  // 1. ARTICLES (1544)
  const articlesSheet = workbook.Sheets['ARTICLES'];
  const rawArticles = xlsx.utils.sheet_to_json(articlesSheet);
  const articleDocs = rawArticles.map((row, index) => {
    const rawSr = row.__EMPTY || row['SR#'] || row['Sr. No'] || row['Sr.No'] || index + 1;
    const srNum = parseInt(String(rawSr).replace(/\D+/g, ''), 10) || (index + 1);
    const yr = row.Year ? String(row.Year).trim() : '';
    const title = String(row.Title || '').trim();
    const author = String(row.Auther || row.Author || '').trim();

    return {
      srNumber: srNum,
      year: yr,
      title: title || `Article ${srNum}`,
      author: author,
      status: 'active'
    };
  });

  await Article.deleteMany({});
  const insertedArticles = await Article.insertMany(articleDocs);
  console.log(`[ARTICLES] Inserted: ${insertedArticles.length} documents (Expected: 1544)`);

  // 2. TOPICS (403)
  const topicsSheet = workbook.Sheets['TOPICS'];
  const rawTopics = xlsx.utils.sheet_to_json(topicsSheet);
  const topicDocs = rawTopics.map((row, index) => {
    const rawSr = row['Sr. No'] || row['Sr.No'] || row['SR#'] || index + 1;
    const srNum = parseInt(String(rawSr).replace(/\D+/g, ''), 10) || (index + 1);
    const heading = String(row.Heading || row.Topic || '').trim();

    return {
      srNumber: srNum,
      heading: heading || `Topic ${srNum}`,
      status: 'active'
    };
  });

  await Topic.deleteMany({});
  const insertedTopics = await Topic.insertMany(topicDocs);
  console.log(`[TOPICS] Inserted: ${insertedTopics.length} documents (Expected: 403)`);

  // 3. WORDS & PHRASES (282)
  const wpSheet = workbook.Sheets['WORDS & PHRASES'];
  const rawWp = xlsx.utils.sheet_to_json(wpSheet);
  const wpDocs = rawWp.map((row, index) => {
    const rawSr = row['Sr. No'] || row['Sr.No'] || row['SR#'] || index + 1;
    const srNum = parseInt(String(rawSr).replace(/\D+/g, ''), 10) || (index + 1);
    const heading = String(row.Heading || row['Word'] || row['WORDS & PHRASES'] || '').trim();

    return {
      srNumber: srNum,
      heading: heading || `Word & Phrase ${srNum}`,
      status: 'active'
    };
  });

  await WordPhrase.deleteMany({});
  const insertedWp = await WordPhrase.insertMany(wpDocs);
  console.log(`[WORDS & PHRASES] Inserted: ${insertedWp.length} documents (Expected: 282)`);

  // 4. LEGAL TERMS (96)
  const ltSheet = workbook.Sheets['LEGAL TERMS'];
  const rawLt = xlsx.utils.sheet_to_json(ltSheet);
  const ltDocs = rawLt.map((row, index) => {
    const rawSr = row['SR#'] || row['Sr. No'] || row['Sr.No'] || index + 1;
    const srNum = parseInt(String(rawSr).replace(/\D+/g, ''), 10) || (index + 1);
    const heading = String(row['LEGAL TERMS'] || row.Heading || row.Term || '').trim();

    return {
      srNumber: srNum,
      heading: heading || `Legal Term ${srNum}`,
      status: 'active'
    };
  });

  await LegalTerm.deleteMany({});
  const insertedLt = await LegalTerm.insertMany(ltDocs);
  console.log(`[LEGAL TERMS] Inserted: ${insertedLt.length} documents (Expected: 96)`);

  // 5. MAXIMS (1124)
  // Drop collection to eliminate the legacy unique index on name_1
  try {
    await db.collection('legalmaxims').drop();
    console.log('[MAXIMS] Dropped old legalmaxims collection and unique indexes.');
  } catch (dropErr) {}

  const maximsSheet = workbook.Sheets['MAXIMS'];
  const rawMaxims = xlsx.utils.sheet_to_json(maximsSheet);
  const maximDocs = rawMaxims.map((row, index) => {
    const rawSr = row['SR#'] || row['Sr. No'] || row['Sr.No'] || index + 1;
    const srNum = parseInt(String(rawSr).replace(/\D+/g, ''), 10) || (index + 1);
    const name = String(row['MAXIMS'] || row.Name || row.name || '').trim();

    let maximName = name;
    let meaning = '';
    const match = name.match(/^(.*?)\s*\((.*?)\)\s*$/);
    if (match) {
      maximName = match[1].trim();
      meaning = match[2].trim();
    }

    return {
      srNumber: srNum,
      name: name,
      meaning: meaning,
      status: 'active'
    };
  });

  const insertedMaxims = await LegalMaxim.insertMany(maximDocs);
  console.log(`[MAXIMS] Inserted: ${insertedMaxims.length} documents (Expected: 1124)`);

  console.log('\n========================================================');
  console.log('--- VERIFICATION OF DATABASE COUNTS (ALL 5 COLLECTIONS) ---');
  console.log('========================================================');
  const countArticles = await Article.countDocuments();
  const countTopics = await Topic.countDocuments();
  const countWp = await WordPhrase.countDocuments();
  const countLt = await LegalTerm.countDocuments();
  const countMaxims = await LegalMaxim.countDocuments();

  console.log({
    'Articles (Expected 1544)': countArticles,
    'Topics (Expected 403)': countTopics,
    'Words & Phrases (Expected 282)': countWp,
    'Legal Terms (Expected 96)': countLt,
    'Legal Maxims (Expected 1124)': countMaxims
  });

  await mongoose.disconnect();
  console.log('Seeding completed successfully!');
}

seedData().catch(console.error);
