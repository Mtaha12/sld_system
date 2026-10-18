import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import {
  runLegalIntelligenceEngine,
  handleGeneralAIQuery
} from './src/controllers/aiChatController.js';

async function runBaselineInvestigation() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect('mongodb://127.0.0.1:27017/sld_system');
  console.log('Connected to MongoDB.\n');

  console.log('====================================================');
  console.log('1. TEST: GREETING ("Hello, how can you help me?")');
  console.log('====================================================');
  const t1 = Date.now();
  const r1 = await runLegalIntelligenceEngine('Hello, how can you help me?');
  console.log(`Latency: ${Date.now() - t1}ms`);
  console.log('Text (first 400 chars):', (r1?.text || '').slice(0, 400));
  console.log('LegalAnalysis MatchType:', r1?.legalAnalysis?.matchType);

  console.log('\n====================================================');
  console.log('2. TEST: GENERAL PROGRAMMING ("Write a Python function to check if a word is a palindrome")');
  console.log('====================================================');
  const t2 = Date.now();
  const r2 = await runLegalIntelligenceEngine('Write a Python function to check if a word is a palindrome');
  console.log(`Latency: ${Date.now() - t2}ms`);
  console.log('Text (first 400 chars):', (r2?.text || '').slice(0, 400));
  console.log('LegalAnalysis MatchType:', r2?.legalAnalysis?.matchType);

  console.log('\n====================================================');
  console.log('3. TEST: PAKISTANI LEGAL QUESTION ("Can a tax refund be time-barred?")');
  console.log('====================================================');
  const t3 = Date.now();
  const r3 = await runLegalIntelligenceEngine('Can a tax refund be time-barred?');
  console.log(`Latency: ${Date.now() - t3}ms`);
  console.log('Text (first 400 chars):', (r3?.text || '').slice(0, 400));
  console.log('LegalAnalysis MatchType:', r3?.legalAnalysis?.matchType);

  console.log('\n====================================================');
  console.log('4. TEST: FOLLOW-UP QUESTION ("Explain what the court decided in that case in simple words")');
  console.log('====================================================');
  const historyForFollowup = [
    { sender: 'user', text: 'Can a tax refund be time-barred?' },
    { sender: 'assistant', text: r3?.text || 'A refund cannot be refused merely on the grounds of limitation under Section 170...' }
  ];
  const t4 = Date.now();
  const r4 = await runLegalIntelligenceEngine('Explain what the court decided in that case in simple words', null, [], null, historyForFollowup);
  console.log(`Latency: ${Date.now() - t4}ms`);
  console.log('Text (first 400 chars):', (r4?.text || '').slice(0, 400));
  console.log('LegalAnalysis MatchType:', r4?.legalAnalysis?.matchType);

  console.log('\n====================================================');
  console.log('5. TEST: SECOND FOLLOW-UP ("Explain the second case")');
  console.log('====================================================');
  const t5 = Date.now();
  const r5 = await runLegalIntelligenceEngine('Explain the second case', null, [], null, historyForFollowup);
  console.log(`Latency: ${Date.now() - t5}ms`);
  console.log('Text (first 400 chars):', (r5?.text || '').slice(0, 400));
  console.log('LegalAnalysis MatchType:', r5?.legalAnalysis?.matchType);

  console.log('\n====================================================');
  console.log('6. TEST: EXACT CITATION ("2011 SLD 5")');
  console.log('====================================================');
  const t6 = Date.now();
  const r6 = await runLegalIntelligenceEngine('2011 SLD 5');
  console.log(`Latency: ${Date.now() - t6}ms`);
  console.log('Text (first 400 chars):', (r6?.text || '').slice(0, 400));
  console.log('LegalAnalysis MatchType:', r6?.legalAnalysis?.matchType);

  await mongoose.disconnect();
}

runBaselineInvestigation().catch(console.error);
