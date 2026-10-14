import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Case from './src/models/Case.js';
import Statute from './src/models/Statute.js';
import Notification from './src/models/Notification.js';
import Dictionary from './src/models/Dictionary.js';
import { runLegalIntelligenceEngine } from './src/controllers/aiChatController.js';

async function runVerificationSuite() {
  console.log('=================================================================');
  console.log('🚀 SLD SYSTEM PRODUCTION OPTIMIZATION & VERIFICATION TEST SUITE');
  console.log('=================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system');

  let passed = 0;
  let failed = 0;

  const testCases = [
    {
      name: '1. Exact SLD Lookup (SLD 4)',
      query: 'SLD 4',
      user: { role: 'Administrator', displayCase: true },
      validate: (res) => {
        return res.legalAnalysis && res.legalAnalysis.matchedCase && String(res.legalAnalysis.matchedCase.sldNumber) === '4';
      }
    },
    {
      name: '2. Exact High SLD Lookup (SLD 165278)',
      query: 'SLD 165278',
      user: { role: 'Administrator', displayCase: true },
      validate: (res) => {
        return res.legalAnalysis && res.legalAnalysis.matchedCase && String(res.legalAnalysis.matchedCase.sldNumber) === '165278';
      }
    },
    {
      name: '3. Deterministic Supreme Court Count (No Hallucination)',
      query: 'How many cases from Supreme Court?',
      user: { role: 'User', displayCase: true },
      validate: (res) => {
        return res.text.includes('39,976') && res.legalAnalysis.matchType === 'statistics_count';
      }
    },
    {
      name: '4. Deterministic Overall Database Inventory Statistics',
      query: 'Database statistics',
      user: { role: 'User', displayCase: true },
      validate: (res) => {
        return res.text.includes('165,278') && res.text.includes('52,554') && res.legalAnalysis.matchType === 'statistics_breakdown';
      }
    },
    {
      name: '5. Multi-Condition Compound Search (Supreme Court + 2011)',
      query: 'Supreme Court cases from 2011',
      user: { role: 'User', displayCase: true },
      validate: (res) => {
        return res.legalAnalysis && res.legalAnalysis.matchedCase && res.legalAnalysis.matchType === 'multi_condition_search';
      }
    },
    {
      name: '6. Omni-Channel Dictionary Definition (Meaning of ...)',
      query: 'Meaning of tax',
      user: { role: 'User', displayCase: true },
      validate: (res) => {
        return res.legalAnalysis && res.legalAnalysis.matchType === 'legal_dictionary' && res.text.includes('SLD Legal Dictionary');
      }
    },
    {
      name: '7. Zero-Hallucination Guard on Nonexistent Record',
      query: 'SLD 999999999',
      user: { role: 'User', displayCase: true },
      validate: (res) => {
        return res.legalAnalysis && res.legalAnalysis.matchType === 'no_record_verified' && res.text.includes('No verified judicial record was found');
      }
    },
    {
      name: '8. Server-Side Permission Enforcement (displayCase: false)',
      query: 'SLD 4',
      user: { role: 'User', displayCase: false, allowAllForms: false },
      validate: (res) => {
        return res.legalAnalysis && res.legalAnalysis.matchType === 'permission_denied' && res.text.includes('Access Authorization Notice');
      }
    }
  ];

  const latencies = [];

  for (const t of testCases) {
    const start = Date.now();
    try {
      const res = await runLegalIntelligenceEngine(t.query, null, [], t.user);
      const duration = Date.now() - start;
      latencies.push(duration);
      const isOk = t.validate(res);

      if (isOk) {
        console.log(`✅ [PASS] ${t.name} — Latency: ${duration}ms`);
        passed++;
      } else {
        console.log(`❌ [FAIL] ${t.name} — Latency: ${duration}ms`);
        console.log('Result:', JSON.stringify(res, null, 2).slice(0, 300));
        failed++;
      }
    } catch (err) {
      console.log(`❌ [ERROR] ${t.name}:`, err.message);
      failed++;
    }
  }

  // Calculate percentiles
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1];
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  console.log('\n=================================================================');
  console.log(`📊 TEST RESULTS SUMMARY: ${passed} PASSED / ${failed} FAILED`);
  console.log(`⏱️ Engine Latencies: Average: ${avg}ms | p50: ${p50}ms | p95: ${p95}ms`);
  console.log('=================================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runVerificationSuite();
