/**
 * Baseline Performance Benchmark Runner for SLD System (ES Module)
 * Connects to MongoDB, runs representative operational and search queries,
 * measures executionStats (docs examined, keys examined, executionTimeMillis),
 * and prints structured baseline metrics.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';

async function runBenchmark() {
  console.log(`Connecting to ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB successfully.\n');

  const db = mongoose.connection.db;
  const casesColl = db.collection('cases');
  const otherCasesColl = db.collection('othercaselaws');
  const notifColl = db.collection('notifications');

  const totalCases = await casesColl.countDocuments();
  const totalOtherCases = await otherCasesColl.countDocuments();
  const totalNotifs = await notifColl.countDocuments();

  console.log(`=== Dataset Size ===`);
  console.log(`Cases: ${totalCases}`);
  console.log(`Other Case Laws: ${totalOtherCases}`);
  console.log(`Notifications: ${totalNotifs}\n`);

  const benchmarks = [
    {
      name: 'Exact citation search (cases: publications.mag + year + page)',
      collection: casesColl,
      filter: { isDeleted: false, 'publications.mag': 'SLD', 'publications.year': 2024, 'publications.page': 100 },
      projection: { caseId: 1, sldNumber: 1, court: 1, title: 1, decisionDate: 1, publications: 1 },
      sort: null,
      limit: 20
    },
    {
      name: 'Exact citation search (othercaselaws: citation)',
      collection: otherCasesColl,
      filter: { isDeleted: false, citation: { $regex: '^2020 SCMR 1234', $options: 'i' } },
      projection: { title: 1, citation: 1, court: 1, date: 1, caseNo: 1 },
      sort: null,
      limit: 20
    },
    {
      name: 'Case-number search (cases: caseNumber regex)',
      collection: casesColl,
      filter: { isDeleted: false, caseNumber: { $regex: 'W.P. 1234', $options: 'i' } },
      projection: { caseId: 1, sldNumber: 1, court: 1, title: 1, caseNumber: 1 },
      sort: null,
      limit: 20
    },
    {
      name: 'SLD Number exact lookup (cases: sldNumber)',
      collection: casesColl,
      filter: { isDeleted: false, sldNumber: '500' },
      projection: { caseId: 1, sldNumber: 1, court: 1, title: 1 },
      sort: null,
      limit: 10
    },
    {
      name: 'Filtered search (cases: court + year with sldNumberInt sort)',
      collection: casesColl,
      filter: { isDeleted: false, court: 'Supreme Court of Pakistan', 'publications.year': 2023 },
      projection: { caseId: 1, sldNumber: 1, court: 1, title: 1, decisionDate: 1, publications: 1, headNote: 1 },
      sort: { sldNumberInt: -1, sldNumber: -1 },
      limit: 25
    },
    {
      name: 'Keyword search (headNote regex without text index)',
      collection: casesColl,
      filter: { isDeleted: false, headNote: { $regex: 'income tax exemption', $options: 'i' } },
      projection: { caseId: 1, sldNumber: 1, court: 1, title: 1, headNote: 1 },
      sort: { sldNumberInt: -1 },
      limit: 25
    },
    {
      name: 'Keyword search (judgment text unindexed regex)',
      collection: casesColl,
      filter: { isDeleted: false, judgment: { $regex: 'customs duty recovery', $options: 'i' } },
      projection: { caseId: 1, sldNumber: 1, court: 1, title: 1 },
      sort: { sldNumberInt: -1 },
      limit: 25
    },
    {
      name: 'Default pagination listing (getCases page 1)',
      collection: casesColl,
      filter: { isDeleted: false },
      projection: { caseId: 1, sldNumber: 1, court: 1, title: 1, decisionDate: 1, publications: 1 },
      sort: { sldNumberInt: -1, sldNumber: -1 },
      limit: 25
    },
    {
      name: 'Notifications search (year + department)',
      collection: notifColl,
      filter: { isDeleted: { $ne: true }, year: 2023, department: 'Federal Board of Revenue' },
      projection: { title: 1, notificationNumber: 1, date: 1, department: 1, year: 1 },
      sort: { date: -1 },
      limit: 25
    }
  ];

  console.log(`=== RUNNING EXPLAIN & LATENCY BENCHMARKS ===\n`);
  const results = [];

  for (const b of benchmarks) {
    const start = process.hrtime.bigint();
    let cursor = b.collection.find(b.filter, { projection: b.projection });
    if (b.sort) cursor = cursor.sort(b.sort);
    if (b.limit) cursor = cursor.limit(b.limit);

    const explain = await cursor.explain('executionStats');
    const end = process.hrtime.bigint();
    const wallMs = Number(end - start) / 1e6;

    const stats = explain.executionStats || {};
    const executionTimeMillis = stats.executionTimeMillis;
    const totalDocsExamined = stats.totalDocsExamined;
    const totalKeysExamined = stats.totalKeysExamined;
    const nReturned = stats.nReturned;
    const stage = stats.executionStages?.stage || stats.executionStages?.inputStage?.stage || 'UNKNOWN';

    results.push({
      name: b.name,
      wallMs: wallMs.toFixed(2),
      execMs: executionTimeMillis,
      docsExamined: totalDocsExamined,
      keysExamined: totalKeysExamined,
      nReturned,
      stage
    });

    console.log(`Test: ${b.name}`);
    console.log(`  Stage: ${stage} | Docs Examined: ${totalDocsExamined} | Keys Examined: ${totalKeysExamined} | Returned: ${nReturned}`);
    console.log(`  Engine Exec Time: ${executionTimeMillis} ms | Wall Clock: ${wallMs.toFixed(2)} ms\n`);
  }

  console.log(`=== SUMMARY TABLE (JSON) ===`);
  console.log(JSON.stringify(results, null, 2));

  await mongoose.disconnect();
}

runBenchmark().catch(err => {
  console.error('Benchmark Error:', err);
  process.exit(1);
});
