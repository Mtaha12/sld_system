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
 * Legal Terms, or Legal Maxims list entry.
 * Long descriptions/clauses fail exact-phrase searches; taking only the
 * leading 1-2 meaningful words guarantees matches across all list entries.
 */
export const extractFirstTwoWords = (text) => {
  if (!text) return '';
  const withoutParens = String(text)
    .replace(/\([^)]*\)/g, ' ') // strip parenthetical descriptions or numbering like (1)
    .replace(/---+/g, ' ')       // collapse separator dashes like "---Meaning..."
    .replace(/[–—]/g, ' ')       // normalize en/em dashes into spaces
    .trim();

  const tokens = withoutParens
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ''))
    .filter((word) => /[a-zA-Z0-9]/.test(word));

  return tokens.slice(0, 2).join(' ');
};

