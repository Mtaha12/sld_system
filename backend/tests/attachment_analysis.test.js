import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { extractTextFromPdf, parseAIAttachment, parseAllAIAttachments } from '../src/utils/aiAttachmentParser.js';
import { handleDocumentAnalysisQuery, runLegalIntelligenceEngine } from '../src/controllers/aiChatController.js';

async function runTests() {
  console.log('--- STARTING ATTACHMENT ANALYSIS INTEGRATION TESTS ---');
  await mongoose.connect('mongodb://127.0.0.1:27017/sld_system');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  // TEST 1: PDF Extractor on Supreme Court Judgment PDF (615fe1cf)
  const scPdfBuf = fs.readFileSync('./uploads/court_cache/615fe1cfc92b9322e96de0840d670f22.pdf');
  const extractedText = extractTextFromPdf(scPdfBuf);
  assert(extractedText.length > 1000, `PDF text extraction produces substantial text (${extractedText.length} chars)`);
  assert(extractedText.includes('THE SUPREME COURT OF PAKISTAN'), 'Extracted text correctly identifies THE SUPREME COURT OF PAKISTAN');
  assert(extractedText.includes('SHAHID BILAL HASSAN'), 'Extracted text correctly identifies Judge SHAHID BILAL HASSAN');
  assert(extractedText.includes('C.P.L.A. No. 1103/L/2016'), 'Extracted text preserves case number C.P.L.A. No. 1103/L/2016');

  // TEST 2: High Court Judgment with kerning/TJ arrays (5c27cfc9)
  const lhcPdfBuf = fs.readFileSync('./uploads/court_cache/5c27cfc9-8bf9-4ce6-9a53-a59f2d2c30e7.pdf');
  const lhcText = extractTextFromPdf(lhcPdfBuf);
  assert(lhcText.includes('PACKAGES LIMITED'), 'Kerning in TJ arrays properly preserved without broken spaces (PACKAGES LIMITED)');
  assert(lhcText.includes('Jawad Hassan, J'), 'Judge name properly preserved (Jawad Hassan, J)');

  // TEST 3: Attachment Parsing with base64
  const parsedAtt = parseAIAttachment({
    name: '1.pdf',
    type: 'application/pdf',
    base64: scPdfBuf.toString('base64')
  });
  assert(parsedAtt.text && parsedAtt.text.length > 1000, 'parseAIAttachment extracts text and preserves base64');
  assert(parsedAtt.base64 && parsedAtt.base64.length > 100, 'parseAIAttachment preserves base64 content for multimodal LLM');

  // TEST 4: Case Summary Query for Document with 2026 SLD 1 Citation
  const bulletinPdfMock = {
    name: '1.pdf',
    type: 'application/pdf',
    base64: Buffer.from('%PDF-1.4\nSuper Law Data System Income Tax Case Law, Email No. 01 dated 01-01-2026\n2026 SLD 1\n%%EOF').toString('base64')
  };

  const analysisResult = await handleDocumentAnalysisQuery('MAKE SUMMARY OF THIS CASE LAW', [bulletinPdfMock]);
  assert(analysisResult && analysisResult.text, 'Document analysis returns response text');
  assert(!analysisResult.text.includes('NOT SPECIFIED IN THE PROVIDED TEXT'), 'Response does NOT contain negative "NOT SPECIFIED IN THE PROVIDED TEXT" boilerplate');
  assert(analysisResult.text.includes('Islamabad High Court') || analysisResult.text.includes('Supreme Court'), 'Response resolves Court / Forum accurately');
  assert(analysisResult.legalAnalysis?.matchedCase, 'legalAnalysis.matchedCase is successfully populated from database');
  assert(analysisResult.legalAnalysis.matchedCase.court, 'matchedCase contains verified court name');

  // TEST 5: Full Engine Dispatch through runLegalIntelligenceEngine
  const engineResult = await runLegalIntelligenceEngine('MAKE SUMMARY OF THIS CASE LAW', null, [bulletinPdfMock]);
  assert(engineResult && engineResult.text, 'runLegalIntelligenceEngine routes attachment analysis cleanly');
  assert(engineResult.legalAnalysis?.sourcesFound >= 1, 'sourcesFound reflects attached documents and database matches');

  console.log(`\nTEST RESULTS: ${passed}/${total} assertions passed.`);
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
