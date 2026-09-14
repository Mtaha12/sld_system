import dns from 'dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Case from '../src/models/Case.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: './.env', override: true });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const makeFlexibleRegex = (str) => {
  const words = str.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const pattern = words.map(w => escapeRegex(w).replace(/\\\./g, '')).join('\\s*\\.?\\s*');
  return new RegExp(pattern, 'i');
};

const cleanUserQuery = (raw) => {
  let q = (raw || '').trim().replace(/^["'“‘]+|["'”’]+$/g, '').trim();
  // 1. Strip general conversational intros
  q = q.replace(/^(?:show\s+me|find|search\s+for|search|give\s+me|lookup|look\s+up|tell\s+me\s+about|get\s+me|what\s+is\s+the\s+case|who\s+was\s+judge\s+in)\s+(?:all\s+)?(?:the\s+)?/i, '');
  // 2. Strip cases/judgments wrappers
  q = q.replace(/^(?:cases\s+(?:by|of|for|on)|judgments\s+(?:by|of|for|on))\s+/i, '');
  return q.trim();
};

const cleanBenchList = (judges) => {
  if (!judges || judges.length === 0) return 'Judicial Division Bench';
  return judges.map(j => {
    let s = String(j || '').trim();
    s = s.replace(/^AUTHOR\(S\):\s*/i, '');
    s = s.replace(/,\s*JJ\b/gi, '');
    s = s.replace(/,\s*JUSTICE\b/gi, '');
    s = s.replace(/,\s*JUDICIAL MEMBER\b/gi, ' (Judicial Member)');
    s = s.replace(/,\s*ACCOUNTANT MEMBER\b/gi, ' (Accountant Member)');
    s = s.replace(/,\s*CHIEF JUSTICE\b/gi, ' (Chief Justice)');
    s = s.replace(/\s+/g, ' ').trim();
    if (s === s.toUpperCase() && s.length > 3) {
      s = s.split(' ').map(w => {
        if (w.startsWith('(') || w.endsWith(')')) return w;
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }).join(' ');
    }
    return s;
  }).join(' & ');
};

const cleanParties = (petitioners) => {
  if (!petitioners || petitioners.length === 0) return 'N/A';
  return petitioners
    .map(p => String(p || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim())
    .join(' | ');
};

const cleanLawyers = (lawyers) => {
  if (!lawyers || lawyers.length === 0) return 'N/A';
  return lawyers
    .map(l => String(l || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim())
    .join(' | ');
};

const formatDate = (c) => {
  if (c.dated) {
    try {
      const d = new Date(c.dated);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {}
    return String(c.dated).split('T')[0];
  }
  const caseNumStr = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber[0] : '';
  const matchD = caseNumStr.match(/decision dated:\s*([0-9\-\/A-Za-z\s]+?)(?:,|$)/i);
  if (matchD) return matchD[1].trim();
  return 'N/A';
};

async function testFullPipeline(rawQuery) {
  const clean = cleanUserQuery(rawQuery);
  console.log(`\n======================================================`);
  console.log(`RAW QUERY: "${rawQuery}"`);
  console.log(`CLEANED:   "${clean}"`);

  // 1. Citation
  // (Tested and works)

  // 2. Case Number
  const caseNoPrefixMatch = clean.match(/^(?:case|appeal|petition|writ\s*petition|suit|c\.?p\.?|c\.?a\.?|w\.?p\.?|i\.?t\.?a\.?|s\.?t\.?a\.?|c\.?t\.?r\.?|civil\s*revision|ptcl)\s*(?:no\.?|#|nos\.?)?\s*[:\-]?\s*(.+)$/i);
  const coreCaseNo = caseNoPrefixMatch ? caseNoPrefixMatch[1].trim() : clean;

  const isCaseNumberPattern = caseNoPrefixMatch || 
    /\b(?:of\s*\d{4}|\d+\s*\/\s*[a-zA-Z]+|\d+\s*\/\s*\d{4})\b/i.test(clean) ||
    /\b(?:w\.?p\.?|c\.?t\.?r\.?|i\.?t\.?a\.?|s\.?t\.?a\.?|c\.?a\.?|c\.?p\.?|civil\s*revision|writ\s*petition)\b/i.test(clean);

  if (isCaseNumberPattern && coreCaseNo.length >= 2) {
    const caseRegex = makeFlexibleRegex(coreCaseNo);
    const cases = await Case.find({ caseNumber: caseRegex, isDeleted: { $ne: true } }).sort({ sldNumber: -1 }).limit(10);
    if (cases.length > 0) {
      console.log(`[MATCH: CASE NUMBER] "${coreCaseNo}" -> Found ${cases.length} cases`);
      console.log(`Sample Case: SLD #${cases[0].sldNumber} | Court: ${cases[0].court} | CaseNo: ${cases[0].caseNumber[0]}`);
      console.log(`Parties: ${cleanParties(cases[0].petitioners)}`);
      return;
    }
  }

  // 3. Judge / Bench
  const judgePrefixMatch = clean.match(/^(?:judge|justice|chief\s*justice|mr\.?\s*justice|hon['’]?ble\s*justice|bench|author)\s*[:\-]?\s*(.+)$/i);
  const judgeQueryName = judgePrefixMatch ? judgePrefixMatch[1].trim() : clean;

  if (judgeQueryName.length >= 3) {
    const judgeRegex = makeFlexibleRegex(judgeQueryName);
    const judgeCases = await Case.find({ judges: judgeRegex, isDeleted: { $ne: true } }).sort({ sldNumber: -1 }).limit(10);
    if (judgeCases.length > 0) {
      console.log(`[MATCH: JUDGE] "${judgeQueryName}" -> Found ${judgeCases.length} cases`);
      console.log(`Sample Case: SLD #${judgeCases[0].sldNumber} | Bench: ${cleanBenchList(judgeCases[0].judges)}`);
      return;
    }
  }

  // 4. Petitioner / Litigant / Party
  const partyPrefixMatch = clean.match(/^(?:petitioner|respondent|party|parties|applicant|litigant)\s*[:\-]?\s*(.+)$/i);
  const partyQueryName = partyPrefixMatch ? partyPrefixMatch[1].trim() : clean;

  if (partyQueryName.length >= 3) {
    const partyRegex = makeFlexibleRegex(partyQueryName);
    const partyCases = await Case.find({ petitioners: partyRegex, isDeleted: { $ne: true } }).sort({ sldNumber: -1 }).limit(10);
    if (partyCases.length > 0) {
      console.log(`[MATCH: PETITIONER/PARTY] "${partyQueryName}" -> Found ${partyCases.length} cases`);
      console.log(`Sample Case: SLD #${partyCases[0].sldNumber} | Parties: ${cleanParties(partyCases[0].petitioners)}`);
      return;
    }
  }

  // 5. Lawyer / Counsel
  const lawyerPrefixMatch = clean.match(/^(?:lawyer|advocate|counsel|barrister|fca)\s*[:\-]?\s*(.+)$/i);
  const lawyerQueryName = lawyerPrefixMatch ? lawyerPrefixMatch[1].trim() : clean;

  if (lawyerQueryName.length >= 3) {
    const lawyerRegex = makeFlexibleRegex(lawyerQueryName);
    const lawyerCases = await Case.find({ lawyers: lawyerRegex, isDeleted: { $ne: true } }).sort({ sldNumber: -1 }).limit(10);
    if (lawyerCases.length > 0) {
      console.log(`[MATCH: LAWYER] "${lawyerQueryName}" -> Found ${lawyerCases.length} cases`);
      console.log(`Sample Case: SLD #${lawyerCases[0].sldNumber} | Counsel: ${cleanLawyers(lawyerCases[0].lawyers)}`);
      return;
    }
  }

  console.log(`[FALLTHROUGH / GENERAL QUERY]`);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const testList = [
    'S.T.A. No.1903/LB of 2009',
    'case no 1173 of 1978',
    'C.T.R. No. 50 of 1995',
    'judge Yahya Afridi',
    'Ejaz Afzal Khan',
    'petitioner Delta CNG',
    'Sui Northern Gas',
    'lawyer Saeed Chaudhry',
    'Aitzaz Ahsan',
    'Mian Saqib Nisar'
  ];
  for (const t of testList) {
    await testFullPipeline(t);
  }
  await mongoose.disconnect();
}
run();
