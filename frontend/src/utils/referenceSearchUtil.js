import { caseService } from '../features/cases/services/caseService';
import { formatCitations } from './citationFormatter';

/**
 * Strips parenthetical explanations/translations (commonly present in Legal Maxims)
 * for clean display in table titles.
 */
export const cleanMaximTitle = (text) => {
  if (!text) return '—';
  const cleaned = String(text).replace(/\s*\([^)]*\)/g, '').trim();
  return cleaned || String(text).trim();
};

/**
 * Extracts only the first two clean words from a Topics, Words & Phrases,
 * Legal Terms, Legal Maxims, or Dictionary list entry.
 * Long descriptions/clauses fail exact-phrase searches; taking only the
 * leading 1-2 meaningful words guarantees matches across all list entries.
 */
export const extractFirstTwoWords = (text) => {
  if (!text) return '';
  const stripSpecial = (input) =>
    String(input)
      .replace(/---+/g, ' ') // collapse separator dashes like "---Meaning..."
      .replace(/[–—]/g, ' ') // normalize en/em dashes into spaces
      .trim()
      .split(/\s+/)
      .map((word) => word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ''))
      .filter((word) => /[a-zA-Z0-9]/.test(word));

  const withoutParens = String(text).replace(/\([^)]*\)/g, ' ');
  let tokens = stripSpecial(withoutParens);
  if (tokens.length === 0) {
    tokens = stripSpecial(String(text).replace(/[()]/g, ' '));
  }

  return tokens.slice(0, 2).join(' ');
};

/**
 * Fetches and caches unique Case Law citations matching a term/phrase.
 * Returns normalized array of `{ citation, caseId }`.
 */
export const fetchCaseCitationsForTerm = async ({ phrase, existingCitations = [], cacheMap }) => {
  if (!phrase) return [];
  const cacheKey = phrase.toLowerCase();
  if (cacheMap?.has(cacheKey)) {
    return cacheMap.get(cacheKey);
  }

  const results = await caseService.searchCases({ phrase, limit: 50 });
  const seen = new Set();
  const extracted = [];

  // 1. Existing citations stored on the term (if any)
  if (Array.isArray(existingCitations) && existingCitations.length > 0) {
    existingCitations.forEach((cit) => {
      const citStr = [cit.yearVol, cit.mag, cit.page].filter(Boolean).join(' ').trim();
      if (citStr && !seen.has(citStr.toLowerCase())) {
        seen.add(citStr.toLowerCase());
        extracted.push({ citation: citStr, caseId: cit.caseId || null });
      }
    });
  }

  // 2. Extracted citations from matching Case Law records
  (results || []).forEach((c) => {
    const cits = formatCitations(c.mapYearPage, c.publications);
    const targetId = c.id || c._id || c.sldNumber;
    if (Array.isArray(cits) && cits.length > 0) {
      cits.forEach((citStr) => {
        if (citStr && !seen.has(citStr.toLowerCase())) {
          seen.add(citStr.toLowerCase());
          extracted.push({ citation: citStr, caseId: targetId });
        }
      });
    } else if (c.sldNumber) {
      const fallbackCit = `SLD #${c.sldNumber}`;
      if (!seen.has(fallbackCit.toLowerCase())) {
        seen.add(fallbackCit.toLowerCase());
        extracted.push({ citation: fallbackCit, caseId: targetId });
      }
    }
  });

  if (cacheMap) cacheMap.set(cacheKey, extracted);
  return extracted;
};

