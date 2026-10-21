const CITATION_PATTERNS = [
  /^(?:\(\s*)?(\d{4})(?:\s*\))?\s+(?:\d{1,4}\s+)?([A-Za-z][A-Za-z.-]*)\s+(\d+)$/i,
  /^([A-Za-z][A-Za-z.-]*)\s+(\d{4})\s+(\d+)$/i
];

const formatOneCitation = (value) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  for (const pattern of CITATION_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    if (pattern === CITATION_PATTERNS[1]) {
      return `${match[2]} ${match[1].toUpperCase()} ${match[3]}`;
    }
    return `${match[1]} ${match[2].toUpperCase()} ${match[3]}`;
  }
  return text;
};

export const formatCitations = (mapYearPage = [], publications = []) => {
  const mappedCitations = Array.isArray(mapYearPage) ? mapYearPage : [];
  const publicationCitations = Array.isArray(publications) ? publications.map((p) => (
    [p?.year || p?.vol, p?.mag, p?.page].filter(Boolean).join(' ')
  )) : [];
  const source = [...mappedCitations, ...publicationCitations];
  const seen = new Set();
  return source
    .map(formatOneCitation)
    .filter((citation) => {
      const key = citation.replace(/[()]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!citation || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const getCitationSortKey = (mapYearPage = [], publications = [], magazine = '') => {
  const cleanMagazine = String(magazine || '').trim().toLowerCase();
  const citations = formatCitations(mapYearPage, publications);
  const matching = citations
    .filter((citation) => !cleanMagazine || citation.toLowerCase().split(/\s+/).includes(cleanMagazine))
    .map((citation) => {
      const match = citation.match(/^(\d{4})\s+[A-Za-z][A-Za-z.-]*\s+(\d+)$/);
      return match ? { year: Number(match[1]), page: Number(match[2]) } : null;
    })
    .filter(Boolean);

  if (matching.length === 0) return { year: -1, page: -1 };
  return matching.reduce((best, current) => (
    current.year > best.year || (current.year === best.year && current.page > best.page)
      ? current
      : best
  ));
};

export default formatCitations;
