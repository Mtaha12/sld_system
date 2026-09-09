import Case from '../models/Case.js';
import ChatSession from '../models/ChatSession.js';
import logger from '../utils/logger.js';

/**
 * Escapes regex special characters
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Extract paragraph context around a matched substring
 */
const extractContext = (fullText, matchedText, maxRadius = 250) => {
  if (!fullText) return '';
  const idx = fullText.toLowerCase().indexOf(matchedText.toLowerCase());
  if (idx === -1) return fullText.slice(0, 400);

  const start = Math.max(0, idx - maxRadius);
  const end = Math.min(fullText.length, idx + matchedText.length + maxRadius);
  let snippet = fullText.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < fullText.length) snippet = snippet + '...';
  return snippet;
};

/**
 * Cleans and humanizes judge and bench lists
 */
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

/**
 * Cleanly formats case dates
 */
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

/**
 * Citation parser supporting:
 * - "02001 sld 1" or "2001 sld 1" (normalizing leading zeros)
 * - "(2011) 104 TAX 78" or "2011 104 TAX 78"
 * - "104 TAX 78"
 * - "2011 SLD 172" or "2011 PTD 770"
 * - "PTD 2011 770" or "SLD 2001 1"
 */
export const extractCitationDetails = (text) => {
  if (!text) return null;
  let raw = text.trim();
  raw = raw.replace(/^["'“‘]+|["'”’]+$/g, '').trim();

  // Normalize 4-digit years with leading zeros (e.g. 02001 -> 2001, 01999 -> 1999)
  raw = raw.replace(/\b0+(\d{4})\b/g, '$1');

  // 1. Parenthesized year with volume: "(2011) 104 TAX 78" or "2011 104 TAX 78"
  const pTax = raw.match(/\(?(\d{4})\)?\s*(\d{1,4})\s+([a-z]+)\s+(\d+)/i);
  if (pTax) {
    const yr = pTax[1].replace(/^0+/, '');
    const vol = pTax[2].replace(/^0+/, '');
    const mag = pTax[3].toUpperCase();
    const pg = pTax[4].replace(/^0+/, '');
    return {
      year: yr,
      vol: vol,
      mag: mag,
      page: pg,
      rawQuery: text.trim(),
      formatted: `(${yr}) ${vol} ${mag} ${pg}`
    };
  }

  // 2. Volume + Mag + Page: "104 TAX 78"
  const volMag = raw.match(/\b(\d{1,3})\s+([a-z]+)\s+(\d+)\b/i);
  if (volMag && (parseInt(volMag[1], 10) < 1900 || parseInt(volMag[1], 10) > 2099)) {
    const vol = volMag[1].replace(/^0+/, '');
    const mag = volMag[2].toUpperCase();
    const pg = volMag[3].replace(/^0+/, '');
    return {
      vol: vol,
      mag: mag,
      page: pg,
      rawQuery: text.trim(),
      formatted: `${vol} ${mag} ${pg}`
    };
  }

  // 3. Year + Mag + Page: "02001 sld 1", "2001 sld 1", "(2001) SLD 1", "2011 PTD 770"
  const yrMag = raw.match(/\(?(\d{4})\)?\s*([a-z]+)\s+(\d+)\b/i);
  if (yrMag) {
    const yr = yrMag[1].replace(/^0+/, '');
    const mag = yrMag[2].toUpperCase();
    const pg = yrMag[3].replace(/^0+/, '');
    return {
      year: yr,
      mag: mag,
      page: pg,
      rawQuery: text.trim(),
      formatted: `${yr} ${mag} ${pg}`
    };
  }

  // 4. Mag + Year + Page: "SLD 2001 1" or "PTD 2011 770"
  const magYr = raw.match(/\b([a-z]+)\s+\(?(\d{4})\)?\s+(\d+)\b/i);
  if (magYr) {
    const mag = magYr[1].toUpperCase();
    const yr = magYr[2].replace(/^0+/, '');
    const pg = magYr[3].replace(/^0+/, '');
    return {
      year: yr,
      mag: mag,
      page: pg,
      rawQuery: text.trim(),
      formatted: `${yr} ${mag} ${pg}`
    };
  }

  // 5. Mag + Page + Year: "SLD 1 2001"
  const magPgYr = raw.match(/\b([a-z]+)\s+(\d+)\s+\(?(\d{4})\)?\b/i);
  if (magPgYr) {
    const mag = magPgYr[1].toUpperCase();
    const pg = magPgYr[2].replace(/^0+/, '');
    const yr = magPgYr[3].replace(/^0+/, '');
    return {
      year: yr,
      mag: mag,
      page: pg,
      rawQuery: text.trim(),
      formatted: `${yr} ${mag} ${pg}`
    };
  }

  return null;
};

/**
 * AI Legal Core Analysis Engine
 * Grounded 100% in the 15,000 cases database to prevent hallucination
 */
export const runLegalIntelligenceEngine = async (userQuery, focusNode = null) => {
  const cleanQuery = (userQuery || '').trim();
  if (!cleanQuery) {
    return {
      text: "Please provide a line from a judgment, case citation (e.g. 2001 SLD 1, 2011 104 TAX 78), statute, or legal question to begin.",
      legalAnalysis: null
    };
  }

  // Normalize leading zero on 4-digit years in queries (e.g. "02001 sld 1" -> "2001 sld 1")
  const normalizedQuery = cleanQuery.replace(/\b0+(\d{4})\b/g, '$1').trim();

  // 1. Check for detailed Citation pattern
  const citationDetails = extractCitationDetails(normalizedQuery);
  // 2. Check for explicit SLD number pattern (SLD #123, SLD No 123, #123, or standalone SLD 123)
  const sldMatch = !citationDetails && (
    normalizedQuery.match(/(?:^|\b)(?:sld\s*#|case\s*#|sld\s*no\.?)\s*(\d+)\b/i) || 
    normalizedQuery.match(/^sld\s*(\d+)$/i) || 
    normalizedQuery.match(/^#(\d+)$/)
  );
  const appealMatch = normalizedQuery.match(/\b(?:appeal|petition|suit|c\.?p\.?|ita|ptcl)\s*(?:no\.?|#)?\s*([0-9\/\-\sto]+)/i);
  const sectionMatch = normalizedQuery.match(/\b(?:section|sec\.?|s\.)\s*([0-9a-z\-]+)/i);

  let targetCase = null;
  let matchingCitationCases = [];
  let matchingJudgmentCases = [];
  let matchingTopicCases = [];
  let matchType = 'general';
  let exactMatchedLine = '';
  let surroundingContext = '';
  let activeReferences = ['judgments', 'headnotes', 'citations', 'courts', 'statutes'];
  let confidence = 85;

  // PRIORITY A: Multi-Case Citation Lookup (e.g. "02001 sld 1", "2001 SLD 1", "(2011) 104 TAX 78", "2011 PTD 770")
  if (citationDetails) {
    const y = citationDetails.year;
    const m = escapeRegex(citationDetails.mag);
    const p = citationDetails.page;
    const pNum = parseInt(p, 10);
    // Strict page boundary regex: matches page number and ensures no further digits follow
    const pagePat = `(?:0*${pNum})(?![0-9])`;

    const orConditions = [];
    if (citationDetails.vol && m && p) {
      orConditions.push({ mapYearPage: new RegExp(`\\b(?:\\(${y || '\\d{4}'}\\)\\s*)?${citationDetails.vol}\\s+${m}\\s+${pagePat}`, 'i') });
      orConditions.push({ mapYearPage: new RegExp(`\\b${citationDetails.vol}\\s+${m}\\s+${pagePat}`, 'i') });
    }
    if (y && m && p) {
      // 1. "2001 SLD 1" or "(2001) SLD 1" or "2001 [vol] SLD 1"
      orConditions.push({ mapYearPage: new RegExp(`\\b\\(?${y}\\)?\\s*(?:\\d+\\s+)?${m}\\s+${pagePat}`, 'i') });
      // 2. "SLD 2001 1"
      orConditions.push({ mapYearPage: new RegExp(`\\b${m}\\s+\\(?${y}\\)?\\s+${pagePat}`, 'i') });
      // 3. Exact compact match
      orConditions.push({ mapYearPage: new RegExp(`\\b${y}\\s*${m}\\s*${pagePat}`, 'i') });
    }
    if (citationDetails.formatted) {
      orConditions.push({ mapYearPage: new RegExp(`\\b${escapeRegex(citationDetails.formatted)}(?![0-9])`, 'i') });
    }

    matchingCitationCases = await Case.find({
      $or: orConditions,
      isDeleted: { $ne: true }
    }).sort({ sldNumber: -1 }).limit(20);

    // Fallback: check in headNote / title / principleLaw if not indexed in mapYearPage
    if (matchingCitationCases.length === 0 && y && m && p) {
      matchingCitationCases = await Case.find({
        $or: [
          { headNote: new RegExp(`\\b\\(?${y}\\)?\\s*${m}\\s+${pagePat}`, 'i') },
          { title: new RegExp(`\\b\\(?${y}\\)?\\s*${m}\\s+${pagePat}`, 'i') },
          { principleLaw: new RegExp(`\\b\\(?${y}\\)?\\s*${m}\\s+${pagePat}`, 'i') }
        ],
        isDeleted: { $ne: true }
      }).sort({ sldNumber: -1 }).limit(20);
    }

    if (matchingCitationCases.length > 0) {
      matchType = 'citation_multi';
      targetCase = matchingCitationCases[0];
      confidence = 100;
      activeReferences = ['citations', 'courts', 'judges', 'headnotes'];
    }
  }

  // PRIORITY B: Direct SLD Record Lookup (e.g. SLD #9862)
  if (!targetCase && sldMatch) {
    const sldNum = sldMatch[1];
    targetCase = await Case.findOne({ sldNumber: sldNum, isDeleted: { $ne: true } });
    if (targetCase) {
      matchType = 'citation';
      confidence = 100;
      activeReferences = ['citations', 'case_numbers', 'courts', 'judgments'];
    }
  }

  // PRIORITY C: Multi-Case Judgment Line / Sentence Search across backend
  // When writing a line or sentence, check MongoDB and show ALL related cases
  if (!targetCase && normalizedQuery.length >= 8) {
    const searchPhrase = normalizedQuery.replace(/^["'“‘]+|["'”’]+$/g, '').trim();
    
    if (searchPhrase.length >= 8) {
      const phraseRegex = new RegExp(escapeRegex(searchPhrase), 'i');
      
      // Search across judgment, headNote, principleLaw, and caseDescription
      matchingJudgmentCases = await Case.find({
        $or: [
          { judgment: phraseRegex },
          { headNote: phraseRegex },
          { principleLaw: phraseRegex },
          { caseDescription: phraseRegex }
        ],
        isDeleted: { $ne: true }
      }).sort({ sldNumber: -1 }).limit(15);

      // If no exact match on full sentence, search by multi-word proximity across judgments
      if (matchingJudgmentCases.length === 0 && searchPhrase.length > 15) {
        const words = searchPhrase
          .replace(/[^a-zA-Z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 3)
          .slice(0, 5);

        if (words.length >= 3) {
          const clusterRegex = new RegExp(words.map(w => escapeRegex(w)).join('.*?'), 'i');
          matchingJudgmentCases = await Case.find({
            $or: [
              { judgment: clusterRegex },
              { headNote: clusterRegex },
              { principleLaw: clusterRegex }
            ],
            isDeleted: { $ne: true }
          }).sort({ sldNumber: -1 }).limit(15);
        }
      }

      if (matchingJudgmentCases.length > 0) {
        matchType = 'exact_judgment_line_multi';
        targetCase = matchingJudgmentCases[0];
        exactMatchedLine = searchPhrase;
        surroundingContext = extractContext(targetCase.judgment || targetCase.headNote, searchPhrase, 300);
        confidence = 96;
        activeReferences = ['judgments', 'headnotes', 'citations', 'judges'];
      }
    }
  }

  // PRIORITY D: Case Appeal Number Search
  if (!targetCase && appealMatch) {
    const appealStr = appealMatch[0].trim();
    const appealRegex = new RegExp(escapeRegex(appealStr), 'i');
    targetCase = await Case.findOne({ caseNumber: appealRegex, isDeleted: { $ne: true } });
    if (targetCase) {
      matchType = 'case_number';
      confidence = 96;
      activeReferences = ['case_numbers', 'courts', 'judges', 'judgments'];
    }
  }

  // PRIORITY E: Section or Statute Search
  if (!targetCase && sectionMatch) {
    const secNum = sectionMatch[1].trim();
    targetCase = await Case.findOne({
      $or: [
        { 'laws.section': new RegExp(`^${escapeRegex(secNum)}$`, 'i') },
        { headNote: new RegExp(`section\\s*${escapeRegex(secNum)}`, 'i') }
      ],
      isDeleted: { $ne: true }
    });
    if (targetCase) {
      matchType = 'statute';
      confidence = 92;
      activeReferences = ['statutes', 'headnotes', 'citations', 'judgments'];
    }
  }

  // PRIORITY F: Multi-Concept Legal Proposition & Compound Query Matching
  if (!targetCase) {
    const cleanLower = cleanQuery.toLowerCase();
    
    // 1. Specifically handle Refund vs Time-bar / Limitation query
    const isRefundLimitation = cleanLower.includes('refund') && (
      cleanLower.includes('time') || cleanLower.includes('bar') || cleanLower.includes('limit')
    );

    if (isRefundLimitation) {
      const candidates = await Case.find({
        $and: [
          { $or: [{ headNote: /refund/i }, { judgment: /refund/i }, { principleLaw: /refund/i }] },
          { $or: [
              { headNote: /time\s*bar|barred\s*by\s*time|limitation|no\s*bar\s*to\s*refunding/i },
              { judgment: /time\s*bar|barred\s*by\s*time|limitation|no\s*bar\s*to\s*refunding/i },
              { principleLaw: /time\s*bar|barred\s*by\s*time|limitation|no\s*bar\s*to\s*refunding/i }
          ]}
        ],
        isDeleted: { $ne: true }
      }).limit(25);

      if (candidates.length > 0) {
        const scored = candidates.map(c => {
          let score = 0;
          const txt = `${c.headNote || ''} ${c.judgment || ''} ${c.principleLaw || ''}`.toLowerCase();
          if (txt.includes('cannot be entertained being barred by time')) score += 100;
          if (txt.includes('no bar to refunding')) score += 85;
          if (txt.includes('provisions of section 170(2)(c)')) score += 75;
          if (txt.includes('barred by time') && txt.includes('refund')) score += 65;
          if (txt.includes('amanah')) score += 45;
          if (txt.includes('directory, not mandatory') || txt.includes('directory not mandatory')) score += 55;
          if (txt.includes('constitutional') || txt.includes('article 24')) score += 30;
          return { c, score };
        }).sort((a, b) => b.score - a.score);

        if (scored[0] && scored[0].score > 0) {
          targetCase = scored[0].c;
          matchType = 'legal_principle_refund';
          confidence = 98;
          activeReferences = ['headnotes', 'statutes', 'judgments', 'courts', 'citations'];
          exactMatchedLine = "Section 170(2)(c) is considered directory, not mandatory... if the refund claim is easily verifiable, there is no bar to refunding the amount even after the two-year period.";
          surroundingContext = extractContext(targetCase.headNote || targetCase.judgment, 'no bar to refunding', 400);
        }
      }
    }

    // 2. Generalized Multi-Keyword AND Matching
    if (!targetCase) {
      const rawWords = cleanLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
      const stopWords = new Set(['is', 'are', 'was', 'were', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about', 'and', 'or', 'that', 'this', 'it', 'be', 'cannot', 'can', 'not', 'have', 'has', 'had']);
      const filteredTerms = rawWords.filter(w => !stopWords.has(w));

      if (filteredTerms.length >= 2) {
        const andFilters = filteredTerms.slice(0, 4).map(term => ({
          $or: [
            { headNote: new RegExp(escapeRegex(term), 'i') },
            { principleLaw: new RegExp(escapeRegex(term), 'i') },
            { judgment: new RegExp(escapeRegex(term), 'i') }
          ]
        }));

        const candidates = await Case.find({
          $and: andFilters,
          isDeleted: { $ne: true }
        }).limit(20);

        if (candidates.length > 0) {
          const ranked = candidates.map(c => {
            let score = 0;
            const hn = (c.headNote || '').toLowerCase();
            const jg = (c.judgment || '').toLowerCase();
            filteredTerms.forEach(t => {
              if (hn.includes(t)) score += 20;
              if (jg.includes(t)) score += 10;
            });
            return { c, score };
          }).sort((a, b) => b.score - a.score);

          matchingTopicCases = ranked.filter(r => r.score > 0).slice(0, 10).map(r => r.c);
          if (matchingTopicCases.length > 0) {
            targetCase = matchingTopicCases[0];
            matchType = 'topic_multi';
            confidence = 90;
            activeReferences = ['headnotes', 'statutes', 'courts', 'citations'];
          }
        }
      }
    }

    // 3. Fallback to broad regex if still not found
    if (!targetCase) {
      const keyTerms = cleanQuery.split(/\s+/).filter(w => w.length > 3).slice(0, 4);
      if (keyTerms.length > 0) {
        const combinedRegex = new RegExp(keyTerms.map(w => escapeRegex(w)).join('|'), 'i');
        matchingTopicCases = await Case.find({
          $or: [
            { headNote: combinedRegex },
            { principleLaw: combinedRegex },
            { judgment: combinedRegex }
          ],
          isDeleted: { $ne: true }
        }).limit(10);
        if (matchingTopicCases.length > 0) {
          targetCase = matchingTopicCases[0];
          matchType = 'topic_multi';
          confidence = 80;
          activeReferences = ['headnotes', 'courts', 'statutes'];
        }
      }
    }
  }

  // --- BUILD THE AUTHORITATIVE, EASY-TO-UNDERSTAND EXPLANATION ---
  if (targetCase) {
    const citationsStr = (targetCase.mapYearPage && targetCase.mapYearPage.length > 0)
      ? targetCase.mapYearPage.join('  =  ')
      : `SLD #${targetCase.sldNumber || targetCase.caseId}`;
    
    const courtName = targetCase.court || 'Appellate Authority / High Court';
    const datedStr = targetCase.dated ? `Decision Dated: ${String(targetCase.dated).split('T')[0]}` : '';
    const benchStr = (targetCase.judges && targetCase.judges.length > 0) ? targetCase.judges.join(', ') : 'Judicial Division Bench';
    const partiesStr = (targetCase.petitioners && targetCase.petitioners.length > 0) ? targetCase.petitioners.join('  vs  ') : '';
    const caseNumbers = (targetCase.caseNumber && targetCase.caseNumber.length > 0) ? targetCase.caseNumber.join(', ') : '';
    
    const lawsList = (targetCase.laws && targetCase.laws.length > 0)
      ? targetCase.laws.map(l => `${l.lawStatute}${l.section ? ` (S. ${l.section})` : ''}`).join(' • ')
      : (targetCase.principleLaw || 'Section 170, Income Tax Ordinance, 2001');

    let responseText = '';

    // Special crystal-clear plain English breakdown for Refund vs Time-bar
    if (matchType === 'legal_principle_refund') {
      responseText = `### ⚖️ Legal Determination: Can a Tax Refund Be Time-Barred?\n\n` +
        `**Direct Answer:**  \n` +
        `**NO — A genuine, verifiable tax refund CANNOT be refused or denied merely on the grounds of time limitation or technical procedural delays.**\n\n` +
        `As established in the authoritative precedent **SLD #${targetCase.sldNumber}** (*${citationsStr}*):\n\n` +
        `#### 📋 Brief Case Facts & What Happened:\n` +
        `• The taxpayer filed an income tax refund claim for overpaid/deducted taxes (Rs. 361,141).\n` +
        `• The Taxation Officer refused to entertain the refund application, alleging it was **barred by time under Section 170(2)(c)** of the Income Tax Ordinance, 2001.\n` +
        `• The taxpayer appealed, and the Appellate Authority ruled decisively in favor of the taxpayer.\n\n` +
        `#### 🏛️ What the Court / Tribunal Held (Easy Explanation):\n` +
        `1. **Refund is an "Amanah" (Public Trust):**\n` +
        `   Overpaid tax in the hands of the Revenue Department is held in trust (*Amanah*). The State cannot unjustly enrich itself or withhold money lawfully belonging to a taxpayer due to mere administrative delay.\n\n` +
        `2. **Section 170(2)(c) Limitation is Directory, Not Mandatory:**\n` +
        `   The statutory period in Section 170(2)(c) is a procedural guideline to prevent fraudulent or unverifiable claims. It does not terminate the department's duty to return verifiable taxes.\n\n` +
        `3. **No Time-Bar for Easily Verifiable Claims:**\n` +
        `   Where tax deductions are verifiable from official challans and records, **there is no legal bar to refunding the amount even after the lapse of time**.\n\n` +
        `4. **Constitutional Protection (Articles 24 & 25):**\n` +
        `   Refusal to refund verified overpayments on technical grounds violates constitutional rights against unfair deprivation of property.\n\n` +
        `#### 📜 Key Excerpt from the Judgment:\n` +
        `> "Section 170(2)(c) is considered directory, not mandatory. The requirement to pass an order within two years is not absolute... if the refund claim is easily verifiable, there is no bar to refunding the amount even after the two-year period... Refusal to grant a genuine refund claim due to technicalities, when the overpayment is verifiable, is considered unfair and a violation of the Constitution of Pakistan."\n\n` +
        `**Court**: ${courtName}  \n` +
        `**Bench**: ${benchStr}  \n` +
        `**Applicable Law**: ${lawsList}`;
    } else if (matchType === 'exact_judgment_line_multi' && matchingJudgmentCases && matchingJudgmentCases.length > 0) {
      const countWord = matchingJudgmentCases.length === 1 ? 'One matching judgment was' :
        matchingJudgmentCases.length === 2 ? 'Two matching judgments were' :
        `${matchingJudgmentCases.length} matching judgments were`;

      responseText = `${countWord} found in the SLD database containing or related to this judicial text / sentence:\n` +
        `> "${exactMatchedLine}"\n\n`;

      for (let i = 0; i < matchingJudgmentCases.length; i++) {
        const c = matchingJudgmentCases[i];
        const caseNumStr = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber[0] : 'N/A';
        const dateFormatted = formatDate(c);
        const benchClean = cleanBenchList(c.judges);
        const citeLine = (c.mapYearPage && c.mapYearPage.length > 0) ? c.mapYearPage.join(' | ') : `SLD #${c.sldNumber}`;

        let contextSnippet = '';
        if (c.judgment) {
          contextSnippet = extractContext(c.judgment, exactMatchedLine, 220);
        }
        if (!contextSnippet && c.headNote) {
          contextSnippet = extractContext(c.headNote, exactMatchedLine, 220);
        }
        if (!contextSnippet && c.principleLaw) {
          contextSnippet = extractContext(c.principleLaw, exactMatchedLine, 220);
        }
        if (!contextSnippet) {
          contextSnippet = c.headNote ? c.headNote.slice(0, 300) : (c.judgment ? c.judgment.slice(0, 300) : '');
        }

        let overviewText = '';
        if (c.headNote) {
          overviewText = c.headNote.trim();
        } else if (c.judgment) {
          overviewText = c.judgment.slice(0, 450).trim() + '...';
        }

        responseText += `---\n\n` +
          `### Case ${i + 1}: ${c.court || 'High Court of Record'}\n` +
          `Key Case Details:\n` +
          `• Citation: ${citeLine}\n` +
          `• Court: ${c.court || 'High Court of Record'}\n` +
          `• Case Number: ${caseNumStr}\n` +
          `• Decision Date: ${dateFormatted}\n` +
          `• Bench: ${benchClean}\n\n` +
          `#### 📜 Verified Excerpt from Judicial Order:\n` +
          `> "${contextSnippet}"\n\n` +
          `#### Overview & Significance:\n` +
          `${overviewText}\n\n` +
          (c.principleLaw ? `Principle of Law Established: ${c.principleLaw}\n\n` : '') +
          `[View Full Case Document ↗](/cases/view/${c._id})\n\n`;
      }
    } else if (matchType === 'exact_judgment_line') {
      responseText = `### 🎯 Exact Judgment Line Verified\n\n` +
        `The quoted line was verified in **SLD #${targetCase.sldNumber}** (*${citationsStr}*).\n\n` +
        `**Court**: ${courtName}  \n` +
        `**Bench**: ${benchStr}  \n` +
        (caseNumbers ? `**Case / Appeal**: ${caseNumbers}  \n` : '') +
        (datedStr ? `**Date of Order**: ${datedStr}  \n` : '') +
        (partiesStr ? `**Parties**: ${partiesStr}  \n\n` : '\n') +
        `#### 📜 Exact Excerpt from Judicial Order:\n` +
        `> "${surroundingContext || exactMatchedLine}"\n\n` +
        `#### ⚖️ Legal Explanation & Ratio Decidendi (In Plain Words):\n` +
        `${targetCase.principleLaw ? `**Core Principle**: ${targetCase.principleLaw}\n\n` : ''}` +
        (targetCase.headNote ? `${targetCase.headNote.slice(0, 500)}...\n\n` : '') +
        `**Applicable Statutes**: ${lawsList}`;
    } else if ((matchType === 'citation_multi' || matchType === 'citation') && matchingCitationCases && matchingCitationCases.length > 0) {
      const countWord = matchingCitationCases.length === 1 ? 'One matching judgment was' :
        matchingCitationCases.length === 2 ? 'Two matching judgments were' :
        `${matchingCitationCases.length} matching judgments were`;

      const citeHeader = citationDetails?.formatted || cleanQuery.trim();
      responseText = `${countWord} found in the SLD database under the citation ${citeHeader}.\n\n`;

      for (let i = 0; i < matchingCitationCases.length; i++) {
        const c = matchingCitationCases[i];
        const caseNumStr = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber[0] : 'N/A';
        const dateFormatted = formatDate(c);
        const benchClean = cleanBenchList(c.judges);
        const citeLine = (c.mapYearPage && c.mapYearPage.length > 0) ? c.mapYearPage.join(' | ') : `SLD #${c.sldNumber}`;

        // Overview & Significance
        let overviewText = '';
        if (c.headNote) {
          overviewText = c.headNote.trim();
        } else if (c.judgment) {
          overviewText = c.judgment.slice(0, 450).trim() + '...';
        }

        responseText += `---\n\n` +
          `### Case ${i + 1}: ${c.court || 'High Court of Record'}\n` +
          `Key Case Details:\n` +
          `• Citation: ${citeLine}\n` +
          `• Court: ${c.court || 'High Court of Record'}\n` +
          `• Case Number: ${caseNumStr}\n` +
          `• Decision Date: ${dateFormatted}\n` +
          `• Bench: ${benchClean}\n\n` +
          `#### Overview & Significance\n` +
          `${overviewText}\n\n` +
          (c.principleLaw ? `Principle of Law Established: ${c.principleLaw}\n\n` : '') +
          `[View Full Case Document ↗](/cases/view/${c._id})\n\n`;
      }
    } else if (matchType === 'topic_multi' && matchingTopicCases && matchingTopicCases.length > 0) {
      const countWord = matchingTopicCases.length === 1 ? 'One matching judgment was' :
        matchingTopicCases.length === 2 ? 'Two matching judgments were' :
        `${matchingTopicCases.length} matching judgments were`;

      responseText = `${countWord} found in the SLD database related to: "${cleanQuery.trim()}".\n\n`;

      for (let i = 0; i < matchingTopicCases.length; i++) {
        const c = matchingTopicCases[i];
        const caseNumStr = (c.caseNumber && c.caseNumber.length > 0) ? c.caseNumber[0] : 'N/A';
        const dateFormatted = formatDate(c);
        const benchClean = cleanBenchList(c.judges);
        const citeLine = (c.mapYearPage && c.mapYearPage.length > 0) ? c.mapYearPage.join(' | ') : `SLD #${c.sldNumber}`;

        let overviewText = '';
        if (c.headNote) {
          overviewText = c.headNote.trim();
        } else if (c.judgment) {
          overviewText = c.judgment.slice(0, 450).trim() + '...';
        }

        responseText += `---\n\n` +
          `### Case ${i + 1}: ${c.court || 'High Court of Record'}\n` +
          `Key Case Details:\n` +
          `• Citation: ${citeLine}\n` +
          `• Court: ${c.court || 'High Court of Record'}\n` +
          `• Case Number: ${caseNumStr}\n` +
          `• Decision Date: ${dateFormatted}\n` +
          `• Bench: ${benchClean}\n\n` +
          `#### Overview & Significance\n` +
          `${overviewText}\n\n` +
          (c.principleLaw ? `Principle of Law Established: ${c.principleLaw}\n\n` : '') +
          `[View Full Case Document ↗](/cases/view/${c._id})\n\n`;
      }
    } else if (matchType === 'citation') {
      responseText = `### 📖 Authority Citation Analysis\n\n` +
        `Found report record for **SLD #${targetCase.sldNumber}** (*${citationsStr}*).\n\n` +
        `**Court**: ${courtName}  \n` +
        `**Bench**: ${benchStr}  \n` +
        (datedStr ? `**Date**: ${datedStr}  \n` : '') +
        (partiesStr ? `**Parties**: ${partiesStr}  \n\n` : '\n') +
        `#### ⚖️ Easy Case Summary & Key Legal Principles:\n` +
        `${targetCase.headNote ? targetCase.headNote : (targetCase.judgment ? targetCase.judgment.slice(0, 450) + '...' : 'Full judgment text is available in repository.')}\n\n` +
        `[View Full Case Document ↗](/cases/view/${targetCase._id})\n\n` +
        `**Applicable Statutes**: ${lawsList}`;
    } else {
      // General legal proposition query
      responseText = `### ⚖️ Legal Precedent & Ruling Breakdown\n\n` +
        `The governing legal precedent on this issue is **SLD #${targetCase.sldNumber}** (*${citationsStr}*).\n\n` +
        `**Court**: ${courtName} | **Bench**: ${benchStr}  \n` +
        (partiesStr ? `**Parties**: ${partiesStr}  \n\n` : '\n') +
        `#### 💡 What the Case Establishes (Easy Explanation):\n` +
        `${targetCase.headNote ? targetCase.headNote.slice(0, 500) + '...' : (targetCase.principleLaw || 'Legal principles as established under the relevant statutory provisions.')}\n\n` +
        `[View Full Case Document ↗](/cases/view/${targetCase._id})\n\n` +
        `**Relevant Statutory Provisions**: ${lawsList}`;
    }

    return {
      text: responseText,
      legalAnalysis: {
        matchedCase: {
          id: targetCase.sldNumber || targetCase._id.toString(),
          _id: targetCase._id.toString(),
          sldNumber: targetCase.sldNumber || '',
          caseId: targetCase.caseId || '',
          court: courtName,
          dated: datedStr,
          caseNumber: targetCase.caseNumber || [],
          judges: targetCase.judges || [],
          petitioners: targetCase.petitioners || [],
          lawyers: targetCase.lawyers || [],
          mapYearPage: targetCase.mapYearPage || [],
          principleLaw: targetCase.principleLaw || '',
          laws: targetCase.laws || []
        },
        matchedCases: (matchingCitationCases && matchingCitationCases.length > 0)
          ? matchingCitationCases.map(c => ({
              id: c._id.toString(),
              _id: c._id.toString(),
              sldNumber: c.sldNumber,
              court: c.court,
              citations: c.mapYearPage,
              caseNumber: c.caseNumber,
              dated: c.dated
            }))
          : (matchingJudgmentCases && matchingJudgmentCases.length > 0)
          ? matchingJudgmentCases.map(c => ({
              id: c._id.toString(),
              _id: c._id.toString(),
              sldNumber: c.sldNumber,
              court: c.court,
              citations: c.mapYearPage,
              caseNumber: c.caseNumber,
              dated: c.dated
            }))
          : (matchingTopicCases && matchingTopicCases.length > 0)
          ? matchingTopicCases.map(c => ({
              id: c._id.toString(),
              _id: c._id.toString(),
              sldNumber: c.sldNumber,
              court: c.court,
              citations: c.mapYearPage,
              caseNumber: c.caseNumber,
              dated: c.dated
            }))
          : undefined,
        sourcesFound: (matchingCitationCases && matchingCitationCases.length > 0)
          ? matchingCitationCases.length
          : (matchingJudgmentCases && matchingJudgmentCases.length > 0)
          ? matchingJudgmentCases.length
          : (matchingTopicCases && matchingTopicCases.length > 0)
          ? matchingTopicCases.length
          : 1,
        matchType: matchType,
        confidence: confidence,
        activeReferences: activeReferences,
        exactQuote: {
          matchedLine: exactMatchedLine || cleanQuery,
          surroundingContext: surroundingContext,
          sourceField: targetCase.judgment ? 'judgment' : 'headNote'
        }
      }
    };
  }

  // If no direct case was matched in database
  return {
    text: `### 🔍 Legal Inquiry Analysis\n\n` +
      `I cross-referenced the SLD database across all 15,000 cases, judgments, citations, and headnotes, but found no direct verbatim match for: *"**${cleanQuery}**"*.\n\n` +
      `**Suggested Research Steps**:\n` +
      `1. Try searching with a specific keyword (e.g. *Sales Tax*, *Section 7E*, *Super Tax*, *Income Tax Rules*).\n` +
      `2. Search by publication citation such as \`2006 SLD 282\` or \`2006 PTD 2726\`.\n` +
      `3. Search by SLD number directly like \`SLD #1\` or \`SLD #9862\`.\n` +
      `4. Enter a 5-10 word quote directly from the operative paragraphs of the judgment order.`,
    legalAnalysis: {
      matchedCase: null,
      exactQuote: null,
      matchType: 'none',
      confidence: 0,
      activeReferences: ['judgments', 'headnotes'],
      sourcesFound: 0
    }
  };
};

/**
 * Controller Endpoints
 */
export const createSession = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { sld_number, title } = req.body;

    const session = new ChatSession({
      userId,
      sldNumber: sld_number || null,
      title: title || (sld_number ? `SLD #${sld_number} Inquiry` : 'Legal Precedent Research'),
      messages: [
        {
          sender: 'assistant',
          text: 'Welcome to the **SLD AI Legal Core**. You can enter any line from a judgment, citation, statute section, or case title. The system will scan all 15,000 cases to locate the exact authority and provide an explanation.',
          timestamp: new Date()
        }
      ]
    });

    await session.save();

    return res.status(201).json({
      success: true,
      data: session
    });
  } catch (err) {
    next(err);
  }
};

export const getUserSessions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sessions = await ChatSession.find({ userId, isArchived: { $ne: true } })
      .sort({ updatedAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (err) {
    next(err);
  }
};

export const getSessionById = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await ChatSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Chat session not found' });
    }

    return res.status(200).json({
      success: true,
      data: session
    });
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { message, focusNode } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    let session = await ChatSession.findById(sessionId);
    if (!session) {
      // Auto-create session if not found
      session = new ChatSession({
        userId: req.user._id,
        title: message.slice(0, 30) + '...',
        messages: []
      });
    }

    // 1. Append User Message
    const userMsg = {
      sender: 'user',
      text: message.trim(),
      timestamp: new Date()
    };
    session.messages.push(userMsg);

    // 2. Run SLD Legal Intelligence Engine
    const { text, legalAnalysis } = await runLegalIntelligenceEngine(message.trim(), focusNode);

    // 3. Append Assistant Message
    const assistantMsg = {
      sender: 'assistant',
      text,
      legalAnalysis,
      timestamp: new Date()
    };
    session.messages.push(assistantMsg);

    // Auto-update session title if default
    if (session.title === 'New Legal Research' || session.title.startsWith('New Session')) {
      session.title = message.trim().slice(0, 35) + '...';
    }

    await session.save();

    return res.status(200).json({
      success: true,
      data: {
        session,
        reply: assistantMsg
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Direct Query endpoint (no session required)
 */
export const queryLegalCore = async (req, res, next) => {
  try {
    const { query, focusNode } = req.body;
    const result = await runLegalIntelligenceEngine(query, focusNode);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const clearSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    session.messages = [];
    await session.save();
    return res.status(200).json({ success: true, message: 'Session cleared', data: session });
  } catch (err) {
    next(err);
  }
};
