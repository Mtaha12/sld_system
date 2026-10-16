import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import {
  runLegalIntelligenceEngine,
  getVerifiedDecisionDateInfo,
  getVerifiedCaseYear,
  caseMatchesYearConstraint,
  formatDate,
  formatHeadnoteResponse,
  formatJudgmentResponse,
  validateRecordMetadataIntegrity,
  createLegalSearchCacheKey,
  getLegalSearchCache,
  setLegalSearchCache,
  clearLegalSearchCache,
  isForeignCourt,
  isForeignCase
} from './src/controllers/aiChatController.js';
import Case from './src/models/Case.js';

async function runVerifiedAccuracyTestSuite() {
  console.log('Connecting to MongoDB database...');
  await mongoose.connect('mongodb://127.0.0.1:27017/sld_system');
  console.log('Connected to sld_system database successfully.\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASSED] ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ [FAILED] ${testName}${details ? ` -> ${details}` : ''}`);
      failedCount++;
    }
  }

  console.log('================================================================');
  console.log('VERIFIED LEGAL SEARCH ACCURACY — 10 REGRESSION SCENARIOS');
  console.log('================================================================\n');

  // --- Scenario 1: A judgment indexed under one citation year but decided in another year ---
  console.log('--- SCENARIO 1: Judgment Indexed Under One Citation Year But Decided in Another ---');
  // Synthetic Fixture: Reported in 2021 SCMR 100, but decided on 15-04-2018
  const fixture1 = {
    court: 'Supreme Court of Pakistan',
    caseNumber: ['Civil Appeal No. 12 of 2015, decision dated: 15-04-2018'],
    mapYearPage: ['2021 SCMR 100', '2021 PTD 50'],
    judgment: 'The apex court decided this dispute on 15th April 2018.'
  };
  const year1 = getVerifiedCaseYear(fixture1);
  assert(year1 === 2018, 'Scenario 1: Actual decision year 2018 extracted (never publication citation year 2021)', `Expected 2018, got ${year1}`);
  assert(caseMatchesYearConstraint(fixture1, { minYear: 2018, maxYear: 2018 }) === true, 'Scenario 1: Matches search filter for genuine decision year 2018');
  assert(caseMatchesYearConstraint(fixture1, { minYear: 2021, maxYear: 2021 }) === false, 'Scenario 1: Strictly excluded from 2021 date filter despite 2021 citation');

  // Real Database Verification: Case with dated 2004 but published in 2011 SLD 5
  const realCase1 = await Case.findOne({ 'mapYearPage': '2011 SLD 5' }).lean();
  if (realCase1) {
    const realYear1 = getVerifiedCaseYear(realCase1);
    assert(realYear1 === 2004, `Scenario 1: Real DB record (2011 SLD 5) verified with actual decision date 2004 (got ${realYear1})`);
    assert(caseMatchesYearConstraint(realCase1, { minYear: 2011, maxYear: 2011 }) === false, 'Scenario 1: Real DB record excluded from strict 2011 filter');
  }

  // --- Scenario 2: A hearing date that differs from the decision date ---
  console.log('\n--- SCENARIO 2: Hearing Date Differs From Decision Date ---');
  // Synthetic Fixture: Heard in 2018, decided in 2019
  const fixture2 = {
    court: 'Lahore High Court',
    caseNumber: ['Writ Petition No. 50/2017, dates of hearing: 12-11-2018 and 15-11-2018, decision dated: 14-02-2019'],
    judgment: 'Heard on 12-11-2018. Announced on 14th February 2019.'
  };
  const year2 = getVerifiedCaseYear(fixture2);
  assert(year2 === 2019, 'Scenario 2: Returns actual decision year 2019 (never hearing date year 2018)', `Expected 2019, got ${year2}`);
  assert(caseMatchesYearConstraint(fixture2, { minYear: 2018, maxYear: 2018 }) === false, 'Scenario 2: Excluded from 2018 filter based on hearing date');
  assert(caseMatchesYearConstraint(fixture2, { minYear: 2019, maxYear: 2019 }) === true, 'Scenario 2: Included in 2019 filter based on actual decision date');

  // --- Scenario 3: A case with an incorrect or contradictory decision date ---
  console.log('\n--- SCENARIO 3: Case with Incorrect or Contradictory Decision Date ---');
  // Fixture: DB dated field says 2018, but explicit decision date in judgment text says 2021
  const fixture3 = {
    court: 'Sindh High Court',
    dated: '2018-05-10',
    caseNumber: ['C.P. No. 100 of 2017, decision dated: 12-03-2021'],
    judgment: 'Order dated 12th March 2021.'
  };
  const dateInfo3 = getVerifiedDecisionDateInfo(fixture3);
  assert(dateInfo3.isContradictory === true, 'Scenario 3: Internal contradiction correctly detected between dated field and text');
  assert(dateInfo3.isVerified === false, 'Scenario 3: Contradictory record marked as unverified');
  assert(formatDate(fixture3) === 'Unverified / Contradictory Decision Date', 'Scenario 3: formatDate labels date as unverified/contradictory');
  assert(caseMatchesYearConstraint(fixture3, { minYear: 2018, maxYear: 2018 }) === false, 'Scenario 3: Contradictory record strictly excluded from 2018 filter');
  assert(caseMatchesYearConstraint(fixture3, { minYear: 2021, maxYear: 2021 }) === false, 'Scenario 3: Contradictory record strictly excluded from 2021 filter');

  // --- Scenario 4: A requested phrase absent from the judgment ---
  console.log('\n--- SCENARIO 4: Requested Phrase Absent From Judgment ---');
  const nonExistentPhrase = '"NonExistentQuantumEntanglementXYZ"';
  const res4 = await runLegalIntelligenceEngine(nonExistentPhrase);
  assert(res4 && res4.legalAnalysis.matchType === 'exact_phrase_not_found', 'Scenario 4: matchType is exact_phrase_not_found');
  assert(res4.text.includes('No judgment containing the requested exact phrase was verified in the available database records.'), 'Scenario 4: Truthfully states phrase was not verified in records');
  assert(!res4.text.includes('• Match Source: Verified Judgment Text'), 'Scenario 4: Never claims verified judgment text match when phrase is absent');

  // --- Scenario 5: A phrase present only in another case or document section ---
  console.log('\n--- SCENARIO 5: Phrase Present Only in Another Document Section ---');
  // User specifically asks for "judgments containing phrase" vs "headnotes containing phrase"
  const headnoteOnlyFixture = {
    court: 'Lahore High Court',
    headNote: 'Landmark ruling on statutory waiver of penalty.',
    judgment: 'This case deals strictly with jurisdictional compliance of assessment order.',
    caseNumber: ['W.P. 100/2020']
  };
  const phraseRegex = /\bstatutory\s+waiver\s+of\s+penalty\b/i;
  // If user requests judgment text match:
  const matchInJudgment = phraseRegex.test(headnoteOnlyFixture.judgment);
  const matchInHeadnote = phraseRegex.test(headnoteOnlyFixture.headNote);
  assert(matchInJudgment === false, 'Scenario 5: Phrase is verified as absent from judgment section');
  assert(matchInHeadnote === true, 'Scenario 5: Phrase is verified as present only in headnote section');
  // Live query targeting judgments:
  const res5 = await runLegalIntelligenceEngine("Find judgments containing the phrase 'transfer of assets'");
  assert(res5 && res5.text.includes('Verified Judgment Text'), 'Scenario 5: Real query for judgment contains verified passage from judgment text');

  // --- Scenario 6: A specific citation whose authentic headnote is unavailable ---
  console.log('\n--- SCENARIO 6: Specific Citation Whose Authentic Headnote Is Unavailable ---');
  const fixture6 = {
    _id: '6abc85bb5edb6e5e6737b8ec',
    court: 'Supreme Court of Pakistan',
    caseNumber: ['Civil Appeal No. 10 of 2019'],
    mapYearPage: ['2020 SCMR 500'],
    headNote: '', // Headnote unavailable in database archives
    judgment: 'The Supreme Court of Pakistan delivered this comprehensive landmark judgment.'
  };
  const headnoteResp6 = formatHeadnoteResponse(fixture6, 'Show headnote of 2020 SCMR 500');
  assert(headnoteResp6.includes('[No Authentic Headnote Available in Database Archives]'), 'Scenario 6: Explicitly states No Authentic Headnote Available');
  assert(!headnoteResp6.includes('The Supreme Court of Pakistan delivered this comprehensive'), 'Scenario 6: Never substitutes judgment text as a headnote replacement');
  assert(!headnoteResp6.includes('#### Overview & Significance'), 'Scenario 6: Never substitutes generated summary for headnote');
  assert(headnoteResp6.includes('[Open Official Judgment Document ↗]'), 'Scenario 6: Provides official judgment document link for transparent verification');

  // --- Scenario 7: A request that must return Pakistani cases only ---
  console.log('\n--- SCENARIO 7: Request Returning Pakistani Cases Only ---');
  const res7 = await runLegalIntelligenceEngine('taxation of disabled person under Income Tax Ordinance 2001');
  assert(res7 && res7.text, 'Scenario 7: Receives response for disabled person taxation query');
  assert(!res7.text.includes('Madhya Pradesh'), 'Scenario 7: Zero Indian High Courts (Madhya Pradesh excluded)');
  assert(!res7.text.includes('Supreme Court of India'), 'Scenario 7: Zero Indian Supreme Court cases');
  assert(!res7.text.includes('Indian Income Tax'), 'Scenario 7: Zero Indian Income Tax Act 1961 references');
  assert(!res7.text.includes('ITR'), 'Scenario 7: Zero Indian ITR journal citations');
  assert(isForeignCourt('Madhya Pradesh High Court') === true, 'Scenario 7: isForeignCourt catches Indian High Courts');
  assert(isForeignCourt('Supreme Court of Pakistan') === false, 'Scenario 7: Pakistani superior courts approved');

  // --- Scenario 8: An impossible keyword combination that must return no verified match ---
  console.log('\n--- SCENARIO 8: Impossible Keyword Combination (Zero Match Safeguard) ---');
  const impossibleQuery = '"reasonable opportunity" quantum blockchain cryogenic superconductor tax rebate 1910';
  const res8 = await runLegalIntelligenceEngine(impossibleQuery);
  assert(
    res8.legalAnalysis.matchType === 'exact_phrase_not_found' ||
    res8.text.includes('No judgment') ||
    res8.legalAnalysis.sourcesFound === 0,
    'Scenario 8: Impossible keyword combination truthfully returns no verified match instead of dropping terms'
  );
  assert(res8.legalAnalysis.matchedCases.length === 0, 'Scenario 8: Zero cases returned for impossible combination');
  assert(res8.legalAnalysis.sourcesFound === 0, 'Scenario 8: Zero sources found count');

  // --- Scenario 9: Conflicting case numbers or metadata ---
  console.log('\n--- SCENARIO 9: Conflicting Case Numbers or Metadata ---');
  // Conflict A: High Court record claiming Supreme Court of Pakistan proceeding
  const conflictingCourtFixture = {
    court: 'Lahore High Court',
    caseNumber: ['Civil Appeal No. 100 of Supreme Court of Pakistan, decision dated: 10-05-2019']
  };
  const valCourt = validateRecordMetadataIntegrity(conflictingCourtFixture);
  assert(valCourt.isValid === false, 'Scenario 9: Flags conflicting court jurisdictions (High Court vs Supreme Court)');
  assert(valCourt.reason.includes('Conflicting court jurisdictions'), 'Scenario 9: Provides specific conflict reason');

  // Conflict B: Record with conflicting decision dates across distinct case numbers
  const conflictingDatesFixture = {
    court: 'Sindh High Court',
    caseNumber: [
      'C.P. No. 100 of 2010, decision dated: 15-01-2010',
      'C.P. No. 200 of 2024, decision dated: 20-08-2024'
    ]
  };
  const valDates = validateRecordMetadataIntegrity(conflictingDatesFixture);
  assert(valDates.isValid === false, 'Scenario 9: Flags conflicting decision dates across case numbers (2010 vs 2024)');

  // Valid record check
  const validRecordFixture = {
    court: 'Sindh High Court',
    caseNumber: ['C.P. No. D-195 of 1986, decision dated: 26-10-1989'],
    dated: '1989-10-26'
  };
  assert(validateRecordMetadataIntegrity(validRecordFixture).isValid === true, 'Scenario 9: Fully consistent record passes metadata validation');

  // --- Scenario 10: Cache isolation between different keywords, document types, jurisdictions, and date filters ---
  console.log('\n--- SCENARIO 10: Cache Isolation Across Parameters ---');
  clearLegalSearchCache();

  // Test 1: Keyword isolation
  const keyKw1 = createLegalSearchCacheKey('capital gains');
  const keyKw2 = createLegalSearchCacheKey('transfer of assets');
  assert(keyKw1 !== keyKw2, 'Scenario 10: Cache keys differ between distinct keywords');

  // Test 2: Document type isolation
  const keyDocJg = createLegalSearchCacheKey('2001 SLD 1', { documentType: 'judgment' });
  const keyDocHn = createLegalSearchCacheKey('2001 SLD 1', { documentType: 'headnote' });
  assert(keyDocJg !== keyDocHn, 'Scenario 10: Cache keys differ between judgment and headnote document types');

  // Test 3: Jurisdiction isolation
  const keyJurSC = createLegalSearchCacheKey('tax exemption', { court: 'Supreme Court of Pakistan' });
  const keyJurSHC = createLegalSearchCacheKey('tax exemption', { court: 'Sindh High Court' });
  assert(keyJurSC !== keyJurSHC, 'Scenario 10: Cache keys differ between distinct court jurisdictions');

  // Test 4: Date filter isolation
  const keyYr2018 = createLegalSearchCacheKey('reasonable opportunity', { yearConstraint: { display: '2018' } });
  const keyYr2021 = createLegalSearchCacheKey('reasonable opportunity', { yearConstraint: { display: '2021' } });
  assert(keyYr2018 !== keyYr2021, 'Scenario 10: Cache keys differ between distinct year filters');

  // Test 5: Cache storage isolation (zero cross-pollution)
  setLegalSearchCache(keyDocJg, { result: 'Judgment Document Content' });
  assert(getLegalSearchCache(keyDocJg)?.result === 'Judgment Document Content', 'Scenario 10: Cached judgment retrieved successfully');
  assert(getLegalSearchCache(keyDocHn) === null, 'Scenario 10: Headnote cache query returns null (zero pollution from judgment cache)');

  await mongoose.disconnect();
  console.log('\n================================================================');
  console.log(`VERIFIED ACCURACY RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runVerifiedAccuracyTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
