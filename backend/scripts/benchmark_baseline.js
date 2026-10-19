import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { generateAccessToken } from '../src/config/jwt.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sld_system';

async function runBenchmarks() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const casesColl = db.collection('cases');
  const statutesColl = db.collection('statutes');
  const notifsColl = db.collection('notifications');

  console.log('\n================================================================');
  console.log('PHASE 1: BASELINE PERFORMANCE AUDIT & MEASUREMENT');
  console.log('================================================================\n');

  const baselineResults = {};

  // Helper to run query multiple times and capture execution stats & latency
  async function benchmarkDbQuery(name, queryFn, iterations = 5) {
    const times = [];
    let lastExplain = null;
    let resultCount = 0;

    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      const res = await queryFn(false);
      const t1 = performance.now();
      times.push(t1 - t0);
      resultCount = Array.isArray(res) ? res.length : (res ? 1 : 0);
    }

    try {
      lastExplain = await queryFn(true);
    } catch (e) {
      lastExplain = { error: e.message };
    }

    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[times.length - 1];

    let docsExamined = 'N/A';
    let keysExamined = 'N/A';
    let execTimeMs = 'N/A';
    let planStage = 'N/A';

    if (lastExplain?.executionStats) {
      docsExamined = lastExplain.executionStats.totalDocsExamined;
      keysExamined = lastExplain.executionStats.totalKeysExamined;
      execTimeMs = lastExplain.executionStats.executionTimeMillis;
      planStage = lastExplain.executionStats.executionStages?.stage || 'UNKNOWN';
    }

    const report = {
      name,
      iterations,
      resultCount,
      medianMs: Number(median.toFixed(2)),
      p95Ms: Number(p95.toFixed(2)),
      p99Ms: Number(p99.toFixed(2)),
      dbExecTimeMs: execTimeMs,
      docsExamined,
      keysExamined,
      planStage
    };

    console.log(`[BENCHMARK] ${name}:`);
    console.log(`  - Results: ${resultCount} docs`);
    console.log(`  - Latency: median ${report.medianMs}ms | p95 ${report.p95Ms}ms | p99 ${report.p99Ms}ms`);
    console.log(`  - DB Explain: execTime ${execTimeMs}ms | docsExamined: ${docsExamined} | keysExamined: ${keysExamined} | stage: ${planStage}\n`);

    baselineResults[name] = report;
    return report;
  }

  // 1. Exact Citation Search (e.g., 2026 SLD 3418 / 134 TAX 1)
  await benchmarkDbQuery('1. Exact Citation Search (mapYearPage)', async (explain) => {
    const q = { mapYearPage: '2026 SLD 3418', isDeleted: false };
    if (explain) {
      return casesColl.find(q).explain('executionStats');
    }
    return casesColl.find(q).limit(25).toArray();
  });

  // 2. Exact SLD ID Search (e.g., SLD 146232)
  await benchmarkDbQuery('2. Exact SLD ID Lookup (sldNumber)', async (explain) => {
    const q = { sldNumber: '146232', isDeleted: false };
    if (explain) {
      return casesColl.find(q).explain('executionStats');
    }
    return casesColl.findOne(q);
  });

  // 3. Case Number and Year Search (e.g. Case No 389 of 2022)
  await benchmarkDbQuery('3. Case Number & Year Regex Search', async (explain) => {
    const pattern = /(?=.*?\b389\b)(?=.*?\b2022\b)/i;
    const q = { caseNumber: pattern, isDeleted: false };
    if (explain) {
      return casesColl.find(q).explain('executionStats');
    }
    return casesColl.find(q).limit(25).toArray();
  });

  // 4. Keyword Search in Headnote and Judgment (e.g. "sales tax exemption")
  await benchmarkDbQuery('4. Keyword Search in Judgment Text (unindexed regex scan)', async (explain) => {
    const kw = /sales\s+tax\s+exemption/i;
    const q = {
      isDeleted: false,
      $or: [{ headNote: kw }, { judgment: kw }]
    };
    if (explain) {
      return casesColl.find(q).limit(25).explain('executionStats');
    }
    return casesColl.find(q).limit(25).toArray();
  }, 3);

  // 5. Multi-filter search (Court + Date Range)
  await benchmarkDbQuery('5. Court + Year Filter Search', async (explain) => {
    const q = {
      court: 'Supreme Court of Pakistan',
      'publications.year': '2023',
      isDeleted: false
    };
    if (explain) {
      return casesColl.find(q).sort({ sldNumberInt: -1 }).limit(25).explain('executionStats');
    }
    return casesColl.find(q).sort({ sldNumberInt: -1 }).limit(25).toArray();
  });

  // 6. Paginated Listing (Admin Manage Cases / Default Catalog Page 1)
  await benchmarkDbQuery('6. Paginated Case Catalog (Page 1 skip 0 limit 25)', async (explain) => {
    const q = { isDeleted: false };
    if (explain) {
      return casesColl.find(q).sort({ sldNumberInt: -1 }).skip(0).limit(25).explain('executionStats');
    }
    return casesColl.find(q).sort({ sldNumberInt: -1 }).skip(0).limit(25).toArray();
  });

  // 7. Paginated Listing (Deep pagination skip 500 limit 25)
  await benchmarkDbQuery('7. Deep Pagination (Page 21 skip 500 limit 25)', async (explain) => {
    const q = { isDeleted: false };
    if (explain) {
      return casesColl.find(q).sort({ sldNumberInt: -1 }).skip(500).limit(25).explain('executionStats');
    }
    return casesColl.find(q).sort({ sldNumberInt: -1 }).skip(500).limit(25).toArray();
  });

  // 8. Single Judgment Retrieval by ID
  await benchmarkDbQuery('8. Single Judgment Document Retrieval', async (explain) => {
    const q = { sldNumber: '146232', isDeleted: false };
    if (explain) {
      return casesColl.find(q).explain('executionStats');
    }
    return casesColl.findOne(q);
  });

  // 9. Statute Search by Law/Heading
  await benchmarkDbQuery('9. Statute Search (Income Tax Ordinance)', async (explain) => {
    const q = {
      isDeleted: false,
      $or: [
        { law: /Income Tax Ordinance/i },
        { heading: /Income Tax/i }
      ]
    };
    if (explain) {
      return statutesColl.find(q).limit(25).explain('executionStats');
    }
    return statutesColl.find(q).limit(25).toArray();
  });

  // 10. Notification/SRO Search
  await benchmarkDbQuery('10. Notification SRO Search', async (explain) => {
    const q = {
      isDeleted: false,
      $or: [
        { sroNumber: /1024/i },
        { subject: /Sales Tax/i }
      ]
    };
    if (explain) {
      return notifsColl.find(q).limit(25).explain('executionStats');
    }
    return notifsColl.find(q).limit(25).toArray();
  });

  // Write baseline results to JSON for verification
  fs.writeFileSync('benchmark_baseline_results.json', JSON.stringify(baselineResults, null, 2));
  console.log('Baseline benchmark results saved to benchmark_baseline_results.json');

  await mongoose.disconnect();
}

runBenchmarks().catch(console.error);
