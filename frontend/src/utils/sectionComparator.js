/**
 * Legal Section & Schedule Natural Comparator
 * Parses section identifiers and schedules to provide accurate ascending order:
 *  - Numeric sections first (1, 2, 2A, 2B, 3, 10, 23, 47A, 47B, 100...)
 *  - Followed by Schedules in ordinal order (First Schedule, Second Schedule ... Eleventh Schedule, Twelfth Schedule, Thirteenth Schedule)
 */

const ORDINAL_MAP = {
  first: 1, '1st': 1,
  second: 2, '2nd': 2,
  third: 3, '3rd': 3,
  fourth: 4, '4th': 4,
  fifth: 5, '5th': 5,
  sixth: 6, '6th': 6,
  seventh: 7, '7th': 7,
  eighth: 8, '8th': 8,
  ninth: 9, '9th': 9,
  tenth: 10, '10th': 10,
  eleventh: 11, '11th': 11,
  twelfth: 12, '12th': 12,
  thirteenth: 13, '13th': 13,
  fourteenth: 14, '14th': 14,
  fifteenth: 15, '15th': 15,
  sixteenth: 16, '16th': 16,
  seventeenth: 17, '17th': 17,
  eighteenth: 18, '18th': 18,
  nineteenth: 19, '19th': 19,
  twentieth: 20, '20th': 20,
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
  xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20
};

export const parseSectionKey = (sec) => {
  if (!sec) return { type: 3, num: 0, suffix: '', orig: '' };
  const s = String(sec).trim().toLowerCase();

  // 1. Schedules (e.g. "Thirteenth Schedule", "12th Schedule", "Schedule I")
  const schedMatch = s.match(/^(?:the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|\d+(?:st|nd|rd|th)?|[ivxlcdm]+)\s*schedule/i) ||
                     s.match(/^schedule\s+(?:no\.?\s*)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|\d+(?:st|nd|rd|th)?|[ivxlcdm]+)/i);

  if (schedMatch) {
    const rawWord = schedMatch[1].toLowerCase();
    const cleanDigit = rawWord.replace(/^(\d+)(?:st|nd|rd|th)$/, '$1');
    const num = ORDINAL_MAP[rawWord] || parseInt(cleanDigit, 10) || 999;
    return { type: 2, num, suffix: s, orig: sec };
  }

  // 2. Numeric sections (e.g. "1", "2A", "47A", "Section 23", "Sec. 4")
  const cleanSec = s.replace(/^(?:section|sec|art|article)\.?\s*/i, '').trim();
  const numMatch = cleanSec.match(/^(\d+)(.*)$/);
  if (numMatch) {
    return {
      type: 1,
      num: parseInt(numMatch[1], 10),
      suffix: numMatch[2].trim(),
      orig: sec
    };
  }

  // 3. General Schedules or unparsed text provisions
  if (s.includes('schedule')) {
    return { type: 2, num: 999, suffix: s, orig: sec };
  }

  return { type: 1, num: 999999, suffix: s, orig: sec };
};

export const compareSections = (secA, secB) => {
  const pA = parseSectionKey(secA);
  const pB = parseSectionKey(secB);

  // Numeric sections (type 1) come before Schedules (type 2)
  if (pA.type !== pB.type) {
    return pA.type - pB.type;
  }

  // If numbers differ, sort by numeric ascending
  if (pA.num !== pB.num) {
    return pA.num - pB.num;
  }

  // Same number: compare suffix (e.g. 47A before 47B)
  return pA.suffix.localeCompare(pB.suffix, undefined, { numeric: true, sensitivity: 'base' });
};
