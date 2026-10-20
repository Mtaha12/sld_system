const CITATION_PATTERN = /(?:\(\s*)?(\d{4})(?:\s*\))?\s+(?:(\d{1,4})\s+)?([A-Za-z][A-Za-z.-]*)\s+(\d+)\b/;

const formatOneCitation = (value) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const match = text.match(CITATION_PATTERN);
  if (!match) return text;
  return `${match[1]} ${match[3].toUpperCase()} ${match[4]}`;
};

export const formatCitations = (mapYearPage = [], publications = []) => {
  const source = Array.isArray(mapYearPage) && mapYearPage.length
    ? mapYearPage
    : (Array.isArray(publications) ? publications.map((p) => (
      [p?.year || p?.vol, p?.mag, p?.page].filter(Boolean).join(' ')
    )) : []);
  const seen = new Set();
  return source
    .map(formatOneCitation)
    .filter((citation) => {
      const key = citation.toLowerCase();
      if (!citation || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export default formatCitations;
