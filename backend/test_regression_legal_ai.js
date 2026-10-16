import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { 
  runLegalIntelligenceEngine, 
  isForeignCourt, 
  isForeignCase, 
  extractCaseNumberAndYear,
  formatDate,
  deduplicateCases,
  detectResponseIntent
} from './src/controllers/aiChatController.js';

async function runTests() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect('mongodb://127.0.0.1:27017/sld_system');
  console.log('Connected to sld_system database.');

  let allPassed = true;

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      allPassed = false;
    } else {
      console.log(`✅ PASSED: ${message}`);
    }
  }

  // --- TEST A & B: Exact Legal Phrase Matching & Text Verification ---
  console.log('\n--- TEST A & B: Exact Phrase Verification ("Transfer of Assets") ---');
  const exactPhraseQuery = 'give case law on transfer of assets';
  console.log(`Executing: "${exactPhraseQuery}"`);
  const resExact = await runLegalIntelligenceEngine(exactPhraseQuery);
  assert(resExact && resExact.text, 'Received response for transfer of assets');
  assert(/transfer\s+of\s+assets/i.test(resExact.text), 'Response text contains exact phrase "transfer of assets"');
  assert(/Match Source: Verified Judgment Text/i.test(resExact.text), 'Match source explicitly verified as Judgment Text');
  assert(/\[View Full Case Document ↗\]\(\/cases\/view\//.test(resExact.text), 'Provides verified clickable document link');
  assert(!/####\s*Overview\s*&\s*Significance/i.test(resExact.text), 'Does NOT dump unrequested Overview & Significance');

  // Verify missing phrase is excluded
  const nonExistentPhraseQuery = '"Transfer of NonExistentSuperAssetsXYZ"';
  console.log(`Executing non-existent phrase: ${nonExistentPhraseQuery}`);
  const resNonExistentPhrase = await runLegalIntelligenceEngine(nonExistentPhraseQuery);
  assert(
    resNonExistentPhrase.text.includes('No judgment containing the requested exact phrase was verified in the available database records.'),
    'Strictly reports exact phrase was not verified in available records'
  );

  // --- TEST C: Partial Match & Multiword Query Safeguard ---
  console.log('\n--- TEST C: Partial Match ("taxation of disabled person under Income Tax Ordinance 2001") ---');
  const disabledQuery = 'taxation of disabled person under Income Tax Ordinance 2001';
  console.log(`Executing: "${disabledQuery}"`);
  const resDisabled = await runLegalIntelligenceEngine(disabledQuery);
  assert(resDisabled && resDisabled.text, 'Received response for disabled person query');
  assert(!/Madhya\s*Pradesh/i.test(resDisabled.text), 'Does NOT contain Indian High Courts (Madhya Pradesh)');
  assert(!/Indian\s+Income\s*Tax/i.test(resDisabled.text), 'Does NOT contain Indian Income Tax Act 1961');
  assert(!/####\s*Overview\s*&\s*Significance/i.test(resDisabled.text), 'Does NOT dump unrequested Overview & Significance');

  // --- TEST D: Case Number & Year Isolation (1038 of 2015 vs 1038/2000) ---
  console.log('\n--- TEST D: Strict Case Number & Year Isolation ---');
  const q2015 = 'Case No. 1038 of 2015';
  console.log(`Executing: "${q2015}"`);
  const res2015 = await runLegalIntelligenceEngine(q2015);
  assert(res2015 && res2015.text, 'Received response for Case No. 1038 of 2015');
  assert(/1038\s*of\s*2015/i.test(res2015.text), 'Response explicitly confirms Case No. 1038 of 2015');
  assert(!/2000/i.test(res2015.text.replace(/2015/g, '')), 'Strictly prevents leakage of year 2000 records');

  const q2000 = 'CASE NUMBER 1038/2000 PLEASE FIND JUDGMENT';
  console.log(`Executing: "${q2000}"`);
  const res2000 = await runLegalIntelligenceEngine(q2000);
  assert(res2000 && res2000.text, 'Received response for Case No. 1038/2000');
  assert(!/2019\s*SLD\s*3117/i.test(res2000.text), 'Does NOT return 2019 Balochistan High Court case');

  // --- TEST E: Pakistan-Only Jurisdiction Enforcement ---
  console.log('\n--- TEST E: Pakistan-Only Jurisdiction Enforcement ---');
  assert(isForeignCourt('Madhya Pradesh High Court') === true, 'Foreign court correctly identified: Madhya Pradesh');
  assert(isForeignCourt('Supreme Court of India') === true, 'Foreign court correctly identified: Supreme Court of India');
  assert(isForeignCourt('Lahore High Court') === false, 'Pakistani court verified: Lahore High Court');
  assert(isForeignCourt('Supreme Court of Pakistan') === false, 'Pakistani court verified: Supreme Court of Pakistan');
  assert(isForeignCourt('Appellate Tribunal Inland Revenue') === false, 'Pakistani court verified: ATIR');
  assert(isForeignCase({ court: 'Lahore High Court', mapYearPage: ['2021 ITR 100'] }) === true, 'Foreign citation (ITR) identified');

  // --- TEST F: Strict Response-Type A (Judgment Document Only) ---
  console.log('\n--- TEST F: Judgment Document Output (Type A) ---');
  const qFindJudgment = 'Find the judgment in Case No. 1038 of 2015';
  console.log(`Executing: "${qFindJudgment}"`);
  const resJudgment = await runLegalIntelligenceEngine(qFindJudgment);
  assert(resJudgment && resJudgment.text, 'Received response for judgment document request');
  assert(/Verified Judgment:/i.test(resJudgment.text), 'Header confirms Verified Judgment');
  assert(/\[Open Full Judgment Document ↗\]|\[Open Complete Judgment Document ↗\]/i.test(resJudgment.text), 'Provides direct link to open full judgment document');
  assert(!/####\s*Overview\s*&\s*Significance/i.test(resJudgment.text), 'Does NOT contain unrequested Overview & Significance');
  assert(!/•\s*Stored Official Headnote:/i.test(resJudgment.text), 'Does NOT substitute headnote for judgment');

  const qBareJudgment = 'Show the full judgment';
  console.log(`Executing bare judgment request: "${qBareJudgment}"`);
  const resBareJudgment = await runLegalIntelligenceEngine(qBareJudgment);
  assert(/Please specify the/i.test(resBareJudgment.text), 'Prompts for case identifier when bare judgment is requested');

  // --- TEST G: Strict Response-Type B (Headnote Only) & Exact Citation Enforcement ---
  console.log('\n--- TEST G: Headnote Output (Type B) & Exact Citation Enforcement ---');
  // 1. Unverified citation: 2001 SLD 1 must NEVER return 2006 SLD 1 as substitute
  const qHeadnoteUnverified = 'Show the headnote of 2001 SLD 1';
  console.log(`Executing unverified citation headnote: "${qHeadnoteUnverified}"`);
  const resHeadnoteUnverified = await runLegalIntelligenceEngine(qHeadnoteUnverified);
  assert(resHeadnoteUnverified && resHeadnoteUnverified.text, 'Received response for 2001 SLD 1 headnote request');
  assert(!/2006\s*SLD\s*1/i.test(resHeadnoteUnverified.text), 'Strictly prevents returning 2006 SLD 1 as substitute for 2001 SLD 1');
  assert(/Exact Citation Not Verified/i.test(resHeadnoteUnverified.text), 'Truthfully reports 2001 SLD 1 citation is unverified in Pakistani records');
  assert(/Unavailable/i.test(resHeadnoteUnverified.text), 'Indicates headnote unavailable when citation cannot be verified');

  // 2. Verified authentic headnote: 2011 SLD 5
  const qHeadnoteVerified = 'Show the headnote of 2011 SLD 5';
  console.log(`Executing verified citation headnote: "${qHeadnoteVerified}"`);
  const resHeadnoteVerified = await runLegalIntelligenceEngine(qHeadnoteVerified);
  assert(resHeadnoteVerified && resHeadnoteVerified.text, 'Received response for 2011 SLD 5 headnote request');
  assert(/Authentic Official Headnote/i.test(resHeadnoteVerified.text), 'Header confirms Authentic Official Headnote');
  assert(/2011\s*SLD\s*5/i.test(resHeadnoteVerified.text), 'Retrieves exact citation 2011 SLD 5');
  assert(!/2011\s*SLD\s*3/i.test(resHeadnoteVerified.text), 'Does NOT return 2011 SLD 3 as nearby substitute');
  assert(!/####\s*Original Judgment Text/i.test(resHeadnoteVerified.text), 'Does NOT append full judgment to headnote response');
  assert(!/####\s*Overview\s*&\s*Significance/i.test(resHeadnoteVerified.text), 'Does NOT dump unrequested Overview & Significance');

  const qBareHeadnote = 'Show the headnote';
  console.log(`Executing bare headnote request: "${qBareHeadnote}"`);
  const resBareHeadnote = await runLegalIntelligenceEngine(qBareHeadnote);
  assert(/Please specify the/i.test(resBareHeadnote.text), 'Prompts for case identifier when bare headnote is requested');

  // --- TEST H: Strict Response-Type C (Case Law Output) ---
  console.log('\n--- TEST H: Case Law Output (Type C) ---');
  const qCaseLaw = 'Which judgments discuss capital gains';
  console.log(`Executing: "${qCaseLaw}"`);
  const resCaseLaw = await runLegalIntelligenceEngine(qCaseLaw);
  assert(resCaseLaw && resCaseLaw.text, 'Received response for case law search');
  assert(/• Citation:/i.test(resCaseLaw.text), 'Includes verified Citation');
  assert(/• Court:/i.test(resCaseLaw.text), 'Includes verified Court');
  assert(/• Decision Date:/i.test(resCaseLaw.text), 'Includes verified Decision Date');
  assert(/\[View Full Case Document ↗\]/i.test(resCaseLaw.text), 'Provides direct case viewer link');

  // --- TEST I: Nonexistent Record / Anti-Hallucination ---
  console.log('\n--- TEST I: Nonexistent Record (Anti-Hallucination) ---');
  const qMissing = 'Case No. 999999 of 2015';
  console.log(`Executing: "${qMissing}"`);
  const resMissing = await runLegalIntelligenceEngine(qMissing);
  assert(resMissing.legalAnalysis?.matchType === 'case_number_not_found', 'matchType is case_number_not_found');
  assert(/No reported judgment was found/i.test(resMissing.text), 'Truthfully states no reported judgment was found');

  // --- TEST J: Deduplication & Epoch 1970 Date Filtering ---
  console.log('\n--- TEST J: Deduplication & Invalid Date Filtering ---');
  // 1. Date formatting rejecting 1970 epoch
  const epochCase = { dated: new Date('1970-01-01T00:00:00.000Z'), caseNumber: ['Civil Appeal No. 12/2018, decision dated: 15-04-2018'] };
  const formattedEpoch = formatDate(epochCase);
  assert(formattedEpoch === '15-04-2018', `Epoch 1970 correctly bypassed in favor of real decision date: ${formattedEpoch}`);
  assert(!formattedEpoch.includes('1970'), 'Does NOT output January 1, 1970');

  const unrecordedCase = { dated: new Date('1970-01-01T00:00:00.000Z'), caseNumber: ['C.P. 100/2020'] };
  assert(formatDate(unrecordedCase) === 'N/A', 'Returns N/A when no valid date is recorded');

  // 2. Safe Deduplication
  const mockDuplicates = [
    {
      _id: '1',
      court: 'Supreme Court of Pakistan',
      caseNumber: ['Civil Appeal No. 500 of 2020'],
      mapYearPage: ['2020 SCMR 1200'],
      judgment: 'This is the authentic landmark judgment of the Supreme Court of Pakistan regarding asset transfer and taxation.'
    },
    {
      _id: '2',
      court: 'Supreme Court of Pakistan',
      caseNumber: ['Civil Appeal No. 500 of 2020'],
      mapYearPage: ['2020 PTD 850'],
      judgment: 'This is the authentic landmark judgment of the Supreme Court of Pakistan regarding asset transfer and taxation.'
    },
    {
      _id: '3',
      court: 'Lahore High Court',
      caseNumber: ['Writ Petition No. 120 of 2021'],
      mapYearPage: ['2021 CLD 50'],
      judgment: 'Distinct High Court decision on commercial contracts.'
    }
  ];

  const deduped = deduplicateCases(mockDuplicates);
  assert(deduped.length === 2, `Deduplicated 3 entries into 2 distinct decisions (Actual: ${deduped.length})`);
  assert(deduped[0].mapYearPage.length === 2, 'Canonical record merged both SCMR and PTD citations');
  assert(deduped[0].mapYearPage.includes('2020 SCMR 1200') && deduped[0].mapYearPage.includes('2020 PTD 850'), 'Both citations preserved in single canonical entry');
  assert(deduped[1].court === 'Lahore High Court', 'Distinct High Court case preserved without merging');

  await mongoose.disconnect();
  console.log('\n======================================');
  if (allPassed) {
    console.log('🎉 ALL REGRESSION TESTS PASSED PERFECTLY!');
  } else {
    console.error('💥 SOME TESTS FAILED.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
