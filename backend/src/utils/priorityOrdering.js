/**
 * Canonical priority sequences for Statute/Law lists and Magazine lists.
 * Single source of truth for backend seeding, distinct sorting, and search aliases.
 */

export const PRIORITY_STATUTE_LAWS = [
  'Income Tax Ordinance, 2001',
  'Sales Tax Act, 1990',
  'Income Tax Rules, 2002',
  'Sales Tax Rules, 2006',
  'Punjab Sales Tax on Services Act, 2012',
  'Sindh Sales Tax on Services Act, 2011',
  'Khyber Pakhtunkhwa Sales Tax on Services Act, 2022',
  'Balochistan Sales Tax on Services Act 2015',
  'Companies Act, 2017',
  'Customs Act, 1969',
  'Federal Excise Act, 2005',
  'Federal Excise Rules, 2005',
  'Customs Rules, 2001'
];

export const PRIORITY_MAGAZINES = [
  'SLD',
  'PTD',
  'TAX',
  'PTCL',
  'SCMR',
  'CLD',
  'PLC',
  'ITR',
  'PTR',
  'PTCLR',
  'TAX FORUM',
  'TAXMAN',
  'PLD',
  'CLC',
  'PLJ',
  'PCRLJ',
  'AIR',
  'IHC',
  'PDS',
  'SCC',
  'NLR',
  'KLR',
  'SBLR',
  'LHC',
  'SCAJK',
  'PHC',
  'SCP',
  'SCR',
  'SHC',
  'PLJ (CIVIL NOTES)',
  'PLJ (CRIM NOTES)'
];

const normalizeKey = (val) => String(val ?? '').trim().toLowerCase();

export const PRIORITY_LAW_RANK = new Map(
  PRIORITY_STATUTE_LAWS.map((name, idx) => [normalizeKey(name), idx])
);

export const PRIORITY_MAGAZINE_RANK = new Map(
  PRIORITY_MAGAZINES.map((name, idx) => [normalizeKey(name), idx])
);

const sortByPriorityRank = (items = [], rankMap, getName = (x) => x, fallbackCompare = null) => {
  if (!Array.isArray(items) || items.length <= 1) return Array.isArray(items) ? [...items] : [];
  return [...items].sort((a, b) => {
    const nameA = String(getName(a) ?? '').trim();
    const nameB = String(getName(b) ?? '').trim();
    const rankA = rankMap.has(nameA.toLowerCase()) ? rankMap.get(nameA.toLowerCase()) : Number.MAX_SAFE_INTEGER;
    const rankB = rankMap.has(nameB.toLowerCase()) ? rankMap.get(nameB.toLowerCase()) : Number.MAX_SAFE_INTEGER;

    if (rankA !== rankB) return rankA - rankB;
    if (fallbackCompare) {
      const diff = fallbackCompare(a, b, nameA, nameB);
      if (diff !== 0) return diff;
    }
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
  });
};

export const sortLawNamesWithPriority = (names = []) =>
  sortByPriorityRank(names, PRIORITY_LAW_RANK, (item) => item);

export const sortLawDocsWithPriority = (docs = []) =>
  sortByPriorityRank(docs, PRIORITY_LAW_RANK, (d) => d?.name, (a, b) => {
    const ordA = Number.isFinite(Number(a?.ordering)) ? Number(a.ordering) : Number.MAX_SAFE_INTEGER;
    const ordB = Number.isFinite(Number(b?.ordering)) ? Number(b.ordering) : Number.MAX_SAFE_INTEGER;
    return ordA - ordB;
  });

export const sortMagazineDocsWithPriority = (docs = []) =>
  sortByPriorityRank(docs, PRIORITY_MAGAZINE_RANK, (d) => d?.name, (a, b) => {
    const ordA = Number.isFinite(Number(a?.ordering)) ? Number(a.ordering) : Number.MAX_SAFE_INTEGER;
    const ordB = Number.isFinite(Number(b?.ordering)) ? Number(b.ordering) : Number.MAX_SAFE_INTEGER;
    return ordA - ordB;
  });

/**
 * Expands known historical spelling variations when querying citations in Case records
 * (e.g., legacy TAXFORUM vs TAX FORUM, PCTLR vs PTCLR) without altering display labels.
 */
export const expandMagazineSearchAliases = (magName = '') => {
  const raw = String(magName || '').trim();
  if (!raw) return [];
  const upper = raw.toUpperCase();
  const aliasGroups = [
    ['PTCLR', 'PCTLR'],
    ['TAX FORUM', 'TAXFORUM']
  ];
  const terms = new Set([raw]);
  for (const group of aliasGroups) {
    if (group.includes(upper)) {
      group.forEach((v) => terms.add(v));
    }
  }
  return Array.from(terms);
};
