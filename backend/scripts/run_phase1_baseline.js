import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import { performance } from 'perf_hooks';
import { generateAccessToken } from '../src/config/jwt.js';

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5000';
const adminToken = generateAccessToken({
  _id: '6a90093e137c8854f5d4d373',
  username: 'adam_admin',
  email: 'adam.admin@sldsystem.com',
  role: 'Administrator'
});

async function runPhase1Baseline() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sld_system');
  const db = mongoose.connection.db;
  const casesColl = db.collection('cases');
  const statutesColl = db.collection('statutes');
  const notifsColl = db.collection('notifications');

  console.log('\n========================================================================');
  console.log('PHASE 1: MEASURING COMPLETE BASELINE WORKFLOWS (12 WORKFLOWS)');
  console.log('========================================================================\n');

  const baselineData = {};

  async function measureHttp(name, endpoint, method = 'GET', body = null, iterations = 3) {
    const latencies = [];
    let responseSize = 0;
    let statusCode = 200;

    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      try {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: body ? JSON.stringify(body) : undefined
        });
        const text = await res.text();
        const t1 = performance.now();
        latencies.push(t1 - t0);
        responseSize = Buffer.byteLength(text, 'utf8');
        statusCode = res.status;
      } catch (err) {
        latencies.push(9999);
      }
    }

    latencies.sort((a, b) => a - b);
    const median = latencies[Math.floor(latencies.length / 2)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[latencies.length - 1];

    const result = {
      name,
      endpoint,
      method,
      statusCode,
      responseSizeKb: Number((responseSize / 1024).toFixed(2)),
      medianMs: Number(median.toFixed(2)),
      p95Ms: Number(p95.toFixed(2)),
      p99Ms: Number(p99.toFixed(2))
    };

    console.log(`[HTTP WORKFLOW] ${name}:`);
    console.log(`  - Endpoint: ${method} ${endpoint} (Status: ${statusCode})`);
    console.log(`  - Payload: ${result.responseSizeKb} KB`);
    console.log(`  - Latency: median ${result.medianMs}ms | p95 ${result.p95Ms}ms | p99 ${result.p99Ms}ms\n`);

    baselineData[name] = result;
    return result;
  }

  // Helper for DB Explain Stats
  async function measureDbExplain(name, queryFn) {
    try {
      const t0 = performance.now();
      const explain = await queryFn();
      const t1 = performance.now();
      const stats = explain.executionStats;
      const res = {
        name,
        wallTimeMs: Number((t1 - t0).toFixed(2)),
        execTimeMillis: stats ? stats.executionTimeMillis : 'N/A',
        totalDocsExamined: stats ? stats.totalDocsExamined : 'N/A',
        totalKeysExamined: stats ? stats.totalKeysExamined : 'N/A',
        nReturned: stats ? stats.nReturned : 'N/A',
        stage: stats?.executionStages?.stage || 'UNKNOWN'
      };
      console.log(`[DB EXPLAIN] ${name}:`);
      console.log(`  - Exec time: ${res.execTimeMillis}ms | Docs examined: ${res.totalDocsExamined} | Keys: ${res.totalKeysExamined} | Returned: ${res.nReturned} | Stage: ${res.stage}\n`);
      baselineData[`DB_${name}`] = res;
    } catch (err) {
      console.warn(`[DB EXPLAIN] ${name} error:`, err.message);
    }
  }

  // Workflow 1: Opening the website / Auth validation
  await measureHttp('1. Website Session Validation', '/api/auth/me');

  // Workflow 2: Loading case-search page / Database Counts
  await measureHttp('2. Loading Case Search Page (Database Stats)', '/api/cases/database-counts');

  // Workflow 3: Exact Citation Search (134 TAX 1 / 2026 SLD 3418)
  await measureHttp('3. Searching by Exact Case Citation', '/api/cases/search', 'POST', {
    subject: '134 TAX 1'
  });
  await measureDbExplain('Exact Citation (134 TAX 1)', () => {
    return casesColl.find({ mapYearPage: '2026 SLD 3418', isDeleted: false }).explain('executionStats');
  });

  // Workflow 4: Searching by Case Number & Year
  await measureHttp('4. Searching by Exact Case Number & Year', '/api/cases/search', 'POST', {
    caseNumber: 'Tax Reference (PRA) No.17473 of 2023'
  });
  await measureDbExplain('Case Number & Year', () => {
    return casesColl.find({ isDeleted: false, caseNumber: /17473/i }).hint({ isDeleted: 1, caseNumber: 1 }).limit(25).explain('executionStats');
  });

  // Workflow 5: Searching by Keywords
  await measureHttp('5. Searching by Keywords in Case Law', '/api/cases/search', 'POST', {
    keywords: 'sales tax',
    limit: 25
  });

  // Workflow 6: Applying Date, Court, and Category Filters
  await measureHttp('6. Filtered Case Law Search (Court + Date Range)', '/api/cases/search', 'POST', {
    court: 'Supreme Court of Pakistan',
    fromYear: '2022',
    toYear: '2023',
    limit: 25
  });

  // Workflow 7: Moving Between Result Pages (Pagination)
  await measureHttp('7. Moving Between Pages (Pagination Page 2)', '/api/cases?page=2&limit=25');
  await measureDbExplain('Catalog Pagination Page 2', () => {
    return casesColl.find({ isDeleted: false }).sort({ sldNumberInt: -1 }).skip(25).limit(25).explain('executionStats');
  });

  // Workflow 8: Opening a Full Judgment
  await measureHttp('8. Opening a Judgment by SLD Number (146232)', '/api/cases/sld/146232');
  await measureDbExplain('Direct Judgment Lookup (SLD 146232)', () => {
    return casesColl.find({ sldNumber: '146232', isDeleted: false }).explain('executionStats');
  });

  // Workflow 9: Searching Statutes and Official Notifications
  await measureHttp('9A. Searching Statutes', '/api/statutes?page=1&limit=25');
  await measureHttp('9B. Searching Notifications/SROs', '/api/notifications?page=1&limit=25');

  // Workflow 10: Executing AI Legal Assistant Query
  await measureHttp('10. AI Legal Assistant Search (Citation Query)', '/api/ai-chat/query', 'POST', {
    query: 'case law 134 tax 1'
  });

  // Workflow 11: Loading Dashboard Overview
  await measureHttp('11. Loading Dashboard Counts & Summary', '/api/cases/database-counts');

  // Workflow 12: Authenticated Login Flow
  await measureHttp('12. User Authentication (Token Refresh)', '/api/auth/refresh-token', 'POST', {});

  fs.writeFileSync('phase1_baseline_report.json', JSON.stringify(baselineData, null, 2));
  console.log('Complete Phase 1 baseline report saved to phase1_baseline_report.json');

  await mongoose.disconnect();
}

runPhase1Baseline().catch(console.error);
