import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, RotateCcw, Search as SearchIcon, History, Trash2, Calendar, FileText, Gavel, Scale, Clock } from 'lucide-react';
import { caseService } from '../features/cases/services/caseService';
import { settingService } from '../services/settingService';
import { magazineService, courtService } from '../services/adminSettingsServices';
import CaseDocumentModal from '../components/ui/CaseDocumentModal';
import Pagination from '../components/ui/Pagination';
import DatePicker from '../components/ui/DatePicker';
import { ALL_SECTIONS } from '../data/sections';
import SearchableSectionSelect from '../components/ui/SearchableSectionSelect';
import { formatCitations } from '../utils/citationFormatter';
import { sortLawsWithPriority, sortMagazinesWithPriority } from '../utils/priorityOrdering';

/* ── Shared form field styles ────────────────────────────────────────────── */
const inp =
  'w-full bg-white dark:bg-[#1a2234] text-gray-800 dark:text-gray-100 placeholder-gray-400 text-sm px-3.5 py-2 rounded-lg ' +
  'border border-slate-200/90 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#3d4a7a]/50 h-[38px] shadow-2xs transition-all';

import SearchableCombobox from '../components/ui/SearchableCombobox';

const SelectField = React.memo(({ value, onChange, options = [], placeholder = 'Select or write...', allowCustom = true, readOnly = false }) => {
  return (
    <SearchableCombobox
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      inputSize="sm"
      allowCustom={allowCustom}
      readOnly={readOnly}
    />
  );
});

const STOP_WORDS = new Set([
  'of', 'the', 'in', 'on', 'at', 'to', 'by', 'for', 'from', 'with', 'about',
  'against', 'between', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'under', 'and', 'or', 'an', 'a', 'is', 'as', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'but', 'if', 'then', 'else', 'when', 'up', 'out', 'no', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just',
  'should', 'now', 'court', 'pakistan'
]);

/* ── Yellow Word / Phrase Highlighting Component ────────────────────────── */
const Highlight = React.memo(({ text, terms = [] }) => {
  if (!text) return null;
  const str = String(text);

  const tokenSpecs = useMemo(() => {
    const list = [];
    (Array.isArray(terms) ? terms : [terms]).forEach(item => {
      if (!item) return;
      const rawVal = typeof item === 'object' && item.value !== undefined ? item.value : item;
      const isPhrase = typeof item === 'object' && item.isPhrase === true;
      const clean = String(rawVal).replace(/["'“”]/g, '').trim();
      if (!clean || clean.length < 2) return;
      list.push({ clean, isPhrase });
    });
    return list;
  }, [terms]);

  const regex = useMemo(() => {
    if (tokenSpecs.length === 0) return null;
    const patterns = [];

    tokenSpecs.forEach(({ clean, isPhrase }) => {
      const lower = clean.toLowerCase();
      // Skip generic isolated stop words if not explicitly marked as phrase
      if (!isPhrase && !clean.includes(' ') && STOP_WORDS.has(lower)) {
        return;
      }
      // Exact word/phrase boundary matching without splitting phrases into isolated words
      const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      patterns.push(`\\b${escaped}\\b`);
    });

    if (patterns.length === 0) return null;
    patterns.sort((a, b) => b.length - a.length);

    try {
      return new RegExp(`(${patterns.join('|')})`, 'gi');
    } catch {
      return null;
    }
  }, [tokenSpecs]);

  if (!regex) return <span>{str}</span>;

  try {
    const parts = str.split(regex);
    return (
      <span>
        {parts.map((part, i) => {
          if (!part) return null;
          regex.lastIndex = 0;
          const isMatch = regex.test(part);
          return isMatch ? (
            <mark key={i} className="bg-yellow-300 text-slate-950 font-bold px-0.5 rounded shadow-2xs">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </span>
    );
  } catch (e) {
    return <span>{str}</span>;
  }
});

/* ── Extract relevant matching paragraph from judgment text ────────────── */
const extractRelevantParagraph = (judgmentText, headNoteText, searchTerms) => {
  const termsList = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
  const queryWords = termsList
    .map(t => (typeof t === 'object' && t?.value ? t.value : t))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));

  if (queryWords.length === 0) return null;

  const content = judgmentText || headNoteText || '';
  if (!content) return null;

  const cleanContent = content.replace(/<[^>]*>/g, ' ');
  const paragraphs = cleanContent.split(/\n\s*\n|\r\n\r\n/);

  for (const para of paragraphs) {
    const lowerPara = para.toLowerCase();
    const hasMatch = queryWords.some(w => lowerPara.includes(w));
    if (hasMatch && para.trim().length > 30) {
      const trimmed = para.trim();
      return trimmed.length > 380 ? trimmed.slice(0, 380) + '...' : trimmed;
    }
  }

  for (const w of queryWords) {
    const idx = cleanContent.toLowerCase().indexOf(w);
    if (idx !== -1) {
      const start = Math.max(0, idx - 80);
      const end = Math.min(cleanContent.length, idx + 240);
      return (start > 0 ? '...' : '') + cleanContent.slice(start, end).trim() + '...';
    }
  }

  return null;
};

/* ── Memoized Case Table Row Component ───────────────────────────────────── */
const CaseTableRow = React.memo(({
  c,
  i,
  matchedPara,
  searchTerms,
  showLawColumns,
  showJudgeColumn,
  showLawyerColumn,
  showPetitionerColumn,
  isTextSearchMode
}) => {
  const statutesList = useMemo(() => {
    return Array.isArray(c.laws) && c.laws.length > 0
      ? c.laws.map(l => l.lawStatute).filter(Boolean)
      : (c.principleLaw ? [c.principleLaw] : []);
  }, [c.laws, c.principleLaw]);

  const sectionsList = useMemo(() => {
    return Array.isArray(c.laws) && c.laws.length > 0
      ? c.laws.map(l => l.section).filter(Boolean)
      : [];
  }, [c.laws]);

  const citations = useMemo(() => {
    return formatCitations(c.mapYearPage, c.publications);
  }, [c.mapYearPage, c.publications]);

  const caseNumStr = useMemo(() => {
    return Array.isArray(c.caseNumber) ? c.caseNumber.join(', ') : (c.caseNumber || '—');
  }, [c.caseNumber]);

  const headNoteDisplay = useMemo(() => {
    const raw = (c.headNote && String(c.headNote).trim()) || (matchedPara && String(matchedPara).trim()) || '';
    return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }, [c.headNote, matchedPara]);

  return (
    <tr className="hover:bg-blue-50/40 transition-colors">
      <td className="px-2.5 py-3 text-gray-500 text-center font-semibold align-top text-[13px]">{i + 1}</td>
      <td className="px-2.5 py-3 font-bold text-gray-900 whitespace-nowrap align-top text-[13px]">
        {c.sldNumber || '—'}
      </td>

      {/* Citation Column with Yellow Highlighting */}
      <td className="px-2.5 py-3 whitespace-nowrap align-top">
        <div className="flex flex-col gap-1">
          {citations.map((cit, j) => (
            <span
              key={j}
              className="inline-block px-2 py-0.5 bg-[#a8cfe0]/65 text-[#1e3a5a] rounded text-xs font-bold border border-[#a8cfe0]"
            >
              <Highlight text={cit} terms={searchTerms?.citation} />
            </span>
          ))}
        </div>
      </td>

      {/* Court Column (Always displayed right after Citation) */}
      <td className="px-2.5 py-3 text-gray-800 min-w-[140px] max-w-[190px] break-words font-semibold align-top text-[13px]">
        <Highlight text={c.court || '—'} terms={searchTerms?.court} />
      </td>

      {/* Dated (Hidden in Text Search Mode) */}
      {!isTextSearchMode && (
        <td className="px-2.5 py-3 whitespace-nowrap align-top text-center font-mono text-[13px] text-gray-800 font-medium">
          {c.dated || c.date ? String(c.dated || c.date).split('T')[0] : '—'}
        </td>
      )}

      {/* Dynamic Law & Compact Sections Columns */}
      {showLawColumns && (
        <>
          <td className="px-2.5 py-3 text-gray-900 max-w-[170px] break-words align-top text-[13px]">
            {statutesList.length > 0 ? (
              <div className="space-y-1 font-semibold leading-snug">
                {statutesList.slice(0, 3).map((st, sIdx) => (
                  <div key={sIdx}>
                    <Highlight text={st} terms={searchTerms?.law} />
                  </div>
                ))}
              </div>
            ) : '—'}
          </td>
          <td className="px-2 py-3 text-gray-800 w-[135px] max-w-[145px] whitespace-normal align-top">
            {sectionsList.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {sectionsList.map((sec, secIdx) => (
                  <span key={secIdx} className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[11px] font-bold leading-tight">
                    Sec <Highlight text={sec} terms={searchTerms?.section} />
                  </span>
                ))}
              </div>
            ) : '—'}
          </td>
        </>
      )}

      {/* Dynamic Judges Column */}
      {showJudgeColumn && (
        <td className="px-2.5 py-3 text-gray-800 max-w-[155px] break-words font-semibold align-top text-[13px]">
          {Array.isArray(c.judges) && c.judges.length > 0 ? (
            <Highlight text={c.judges.join('; ')} terms={searchTerms?.judge} />
          ) : '—'}
        </td>
      )}

      {/* Dynamic Lawyers Column */}
      {showLawyerColumn && (
        <td className="px-2.5 py-3 text-gray-800 max-w-[155px] break-words font-semibold align-top text-[13px]">
          {Array.isArray(c.lawyers) && c.lawyers.length > 0 ? (
            <Highlight text={c.lawyers.join('; ')} terms={searchTerms?.lawyer} />
          ) : '—'}
        </td>
      )}

      {/* Dynamic Petitioner Column */}
      {showPetitionerColumn && (
        <td className="px-2.5 py-3 text-gray-800 max-w-[155px] break-words font-semibold align-top text-[13px]">
          {Array.isArray(c.petitioners) && c.petitioners.length > 0 ? (
            <Highlight text={c.petitioners.join('; ')} terms={searchTerms?.petitioner} />
          ) : '—'}
        </td>
      )}

      {isTextSearchMode ? (
        /* Text / Phrase Search Mode: Show ONLY Head Notes instead of Dated, Court, Case No., Lawyer/Petitioner/Author */
        <td className="px-3 py-3 text-gray-800 break-words align-top leading-relaxed text-[13px] sm:text-sm">
          {headNoteDisplay ? (
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2.5">
              <Highlight text={headNoteDisplay} terms={searchTerms?.headNote} />
            </div>
          ) : (
            <span className="text-gray-400 italic">No headnote available</span>
          )}
        </td>
      ) : (
        <>
          {/* Case No */}
          <td className="px-2.5 py-3 text-gray-800 max-w-[205px] break-words font-medium align-top leading-relaxed text-[13px]">
            <Highlight
              text={caseNumStr}
              terms={searchTerms?.caseNumber}
            />
          </td>

          {/* Lawyer / Petitioner / Author Information */}
          <td className="px-2.5 py-3 text-gray-800 max-w-[330px] break-words align-top">
            <div className="space-y-2 text-[13px]">
              {/* Petitioner / Parties */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70 inline-block mb-0.5">
                  Petitioner / Parties
                </span>
                <p className="font-semibold text-gray-900 leading-snug">
                  <Highlight text={c.petitioners || c.parties || '—'} terms={searchTerms?.petitioner} />
                </p>
              </div>

              {/* Author Judge */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block mb-0.5">
                  Author Judge
                </span>
                <p className="text-gray-800 font-medium leading-snug">
                  <Highlight
                    text={c.authorJudge || (c.judges && c.judges.length > 0 ? (Array.isArray(c.judges) ? c.judges.join('; ') : c.judges) : '—')}
                    terms={searchTerms?.judge}
                  />
                </p>
              </div>

              {/* Lawyer */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/70 inline-block mb-0.5">
                  Lawyer / Legal Counsel
                </span>
                <p className="text-gray-800 leading-snug">
                  <Highlight
                    text={c.lawyers && c.lawyers.length > 0 ? (Array.isArray(c.lawyers) ? c.lawyers.join('; ') : c.lawyers) : '—'}
                    terms={searchTerms?.lawyer}
                  />
                </p>
              </div>
            </div>
          </td>
        </>
      )}

      {/* Action View */}
      <td className="px-2.5 py-3 text-center whitespace-nowrap w-[85px] align-top">
        <a
          href={`/cases/view/${c.id || c._id || c.sldNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </a>
      </td>
    </tr>
  );
});

/* ── Initial Empty Search State ─────────────────────────────────────────── */
const EMPTY = {
  yearVolume: '', magazine: '', page: '',
  selectLaw: '', section: '', section2: '',
  court: '', caseNumber: '', fromDate: '', toDate: '',
  text: '', text2: '', phrase: '',
  judges: '', lawyers: '', petitioner: '',
  principleLaw: '',
};

const HISTORY_KEY = 'sld_case_search_history_v2';

const SearchCaseLawPage = () => {
  const [f, setF]               = useState(EMPTY);
  const [submittedFilters, setSubmittedFilters] = useState(null);
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [viewId, setViewId]     = useState(null);
  const [currentPage, setCurrentPage]   = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const searchAbortRef          = React.useRef(null);

  // Search History from localStorage
  const [history, setHistory]   = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dynamic dropdown options
  const [magazineOptions, setMagazineOptions] = useState([
    { value: '', label: 'Select Magazine' },
    { value: 'SLD', label: 'SLD' },
    { value: 'PTD', label: 'PTD' },
    { value: 'TAX', label: 'TAX' },
    { value: 'SCMR', label: 'SCMR' },
    { value: 'PLD', label: 'PLD' },
    { value: 'CLC', label: 'CLC' },
    { value: 'PCrLJ', label: 'PCrLJ' },
    { value: 'MLD', label: 'MLD' },
    { value: 'YLR', label: 'YLR' }
  ]);
  const [courtOptions, setCourtOptions] = useState([{ value: '', label: 'Select Court' }]);
  const [lawOptions, setLawOptions] = useState([{ value: '', label: 'Select Law' }]);
  const [principleOptions, setPrincipleOptions] = useState([{ value: '', label: 'Select Principle Law' }]);
  const [sectionOptions, setSectionOptions] = useState(ALL_SECTIONS || []);

  // Load dropdown options
  useEffect(() => {
    let isMounted = true;

    magazineService.getMagazines({ status: 'active' })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const sortedMags = sortMagazinesWithPriority(res.data, m => m.name)
            .map(m => ({ value: m.name.toUpperCase(), label: m.name.toUpperCase() }));
          setMagazineOptions([
            { value: '', label: 'Select Magazine' },
            ...sortedMags
          ]);
        }
      })
      .catch(err => console.warn('Magazines load warning:', err));

    courtService.getCourts({ status: 'active' })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const sortedCourts = res.data
            .map(c => ({ value: c.name, label: c.name }))
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
          setCourtOptions([
            { value: '', label: 'Select Court' },
            ...sortedCourts
          ]);
        }
      })
      .catch(err => console.warn('Courts load warning:', err));

    settingService.getLaws({ status: 'active', limit: 10000 })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const fetchedLaws = sortLawsWithPriority(res.data, l => l.name)
            .map(l => ({ value: l.name, label: l.name }));
          setLawOptions([
            { value: '', label: 'Select Law' },
            ...fetchedLaws
          ]);
          setPrincipleOptions([
            { value: '', label: 'Select Principle Law' },
            ...fetchedLaws
          ]);
        }
      })
      .catch(err => console.warn('Laws load warning:', err));

    settingService.getSections({ status: 'active', limit: 30000 })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const names = res.data.map(s => s.name).filter(Boolean);
          const combined = Array.from(new Set([...names, ...(ALL_SECTIONS || [])])).sort((a, b) =>
            String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
          );
          setSectionOptions(combined);
        }
      })
      .catch(err => console.warn('Sections load warning:', err));

    return () => { isMounted = false; };
  }, []);

  const sectionSelectOptions = useMemo(() => [
    { value: '', label: 'Select Section' },
    ...sectionOptions.map(s => ({
      value: String(s),
      label: String(s).startsWith('Section') ? String(s) : `Section ${s}`
    }))
  ], [sectionOptions]);

  const section2SelectOptions = useMemo(() => [
    { value: '', label: 'Select Section 2' },
    ...sectionOptions.map(s => ({
      value: String(s),
      label: String(s).startsWith('Section') ? String(s) : `Section ${s}`
    }))
  ], [sectionOptions]);

  const set = useCallback(field => e => {
    const val = (e && typeof e === 'object' && 'target' in e) ? e.target.value : e;
    setF(p => ({ ...p, [field]: val ?? '' }));
  }, []);

  // Extract active search terms targeted specifically per column (avoids false-positive keyword bleeding)
  const colSource = submittedFilters || f;
  const searchTerms = useMemo(() => {
    return {
      headNote: [
        colSource.phrase ? { value: colSource.phrase, isPhrase: true } : null,
        colSource.text ? { value: colSource.text, isPhrase: false } : null,
        colSource.text2 ? { value: colSource.text2, isPhrase: false } : null,
        colSource.caseNumber ? { value: colSource.caseNumber, isPhrase: false } : null
      ].filter(Boolean),
      citation: [colSource.yearVolume, colSource.magazine, colSource.page].filter(Boolean),
      court: colSource.court ? [colSource.court] : [],
      law: [colSource.selectLaw, colSource.principleLaw].filter(Boolean),
      section: [colSource.section, colSource.section2].filter(Boolean),
      judge: colSource.judges ? [colSource.judges] : [],
      lawyer: colSource.lawyers ? [colSource.lawyers] : [],
      petitioner: colSource.petitioner ? [colSource.petitioner] : [],
      caseNumber: colSource.caseNumber ? [colSource.caseNumber] : []
    };
  }, [colSource]);

  // Determine dynamic column visibility from executed query
  const showLawColumns = Boolean(colSource.selectLaw || colSource.principleLaw || colSource.section || colSource.section2);
  const showJudgeColumn = Boolean(colSource.judges && colSource.judges.trim());
  const showLawyerColumn = Boolean(colSource.lawyers && colSource.lawyers.trim());
  const showPetitionerColumn = Boolean(colSource.petitioner && colSource.petitioner.trim());
  const hasTextSearch = Boolean(
    (colSource.text && String(colSource.text).trim()) ||
    (colSource.text2 && String(colSource.text2).trim()) ||
    (colSource.phrase && String(colSource.phrase).trim())
  );

  const totalResultsCount = Array.isArray(results) ? results.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalResultsCount / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedResults = useMemo(
    () => (Array.isArray(results) ? results.slice(startIndex, startIndex + itemsPerPage) : []),
    [results, startIndex, itemsPerPage]
  );

  const saveToHistory = useCallback((filtersObj, count) => {
    // Generate human readable summary label
    const parts = [];
    if (filtersObj.yearVolume && filtersObj.magazine && filtersObj.page) {
      parts.push(`${filtersObj.yearVolume} ${filtersObj.magazine} ${filtersObj.page}`);
    }
    if (filtersObj.selectLaw) parts.push(filtersObj.selectLaw + (filtersObj.section ? ` Sec ${filtersObj.section}` : ''));
    if (filtersObj.court) parts.push(filtersObj.court);
    if (filtersObj.caseNumber) parts.push(`Case ${filtersObj.caseNumber}`);
    if (filtersObj.judges) parts.push(`Judge: ${filtersObj.judges}`);
    if (filtersObj.lawyers) parts.push(`Lawyer: ${filtersObj.lawyers}`);
    if (filtersObj.petitioner) parts.push(`Petitioner: ${filtersObj.petitioner}`);
    if (filtersObj.text || filtersObj.phrase) parts.push(`"${filtersObj.phrase || filtersObj.text}"`);

    const title = parts.join(' • ') || 'General Filter';
    const entry = {
      id: Date.now(),
      title,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      count,
      filters: { ...filtersObj }
    };

    setHistory(prev => {
      const filtered = prev.filter(p => p.title !== title);
      const updated = [entry, ...filtered].slice(0, 15);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {}
  };

  const handleSearch = async (overrideFilters = null) => {
    setError(null);
    setResults(null);

    const activeForm = overrideFilters || f;

    // Rule: First 3 blocks (Year/Vol, Magazine, Page) must ALL be filled if any is filled
    // Single field search is NOT allowed in the first three blocks
    const b1 = Boolean(activeForm.yearVolume && String(activeForm.yearVolume).trim());
    const b2 = Boolean(activeForm.magazine && String(activeForm.magazine).trim());
    const b3 = Boolean(activeForm.page && String(activeForm.page).trim());

    if (b1 || b2 || b3) {
      if (!b1 || !b2 || !b3) {
        setError('All 3 first blocks (Year/Vol, Magazine, and Page) must be filled together for citation search. Single field search is not allowed in the first three blocks.');
        return;
      }
    }

    const filters = {
      yearVolume:   activeForm.yearVolume   || undefined,
      magazine:     activeForm.magazine     || undefined,
      page:         activeForm.page         || undefined,
      selectLaw:    activeForm.selectLaw    || undefined,
      section:      activeForm.section      || undefined,
      section2:     activeForm.section2     || undefined,
      court:        activeForm.court        || undefined,
      caseNumber:   activeForm.caseNumber   || undefined,
      fromDate:     activeForm.fromDate     || undefined,
      toDate:       activeForm.toDate       || undefined,
      keywords:     activeForm.text         || undefined,
      keywords2:    activeForm.text2        || undefined,
      phrase:       activeForm.phrase       || undefined,
      judges:       activeForm.judges       || undefined,
      lawyers:      activeForm.lawyers      || undefined,
      petitioner:   activeForm.petitioner   || undefined,
      principleLaw: activeForm.principleLaw || undefined,
    };

    const hasAny = Object.values(filters).some(v => v);
    if (!hasAny) {
      setError('Please fill in at least one search field or block.');
      return;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const abortCtrl = new AbortController();
    searchAbortRef.current = abortCtrl;

    setLoading(true);
    try {
      let data = await caseService.searchCases(filters, { signal: abortCtrl.signal });

      // If exact 3-block citation search was requested, guarantee only the exact match is displayed
      if (b1 && b2 && b3 && Array.isArray(data)) {
        const yv = String(activeForm.yearVolume).trim().toLowerCase();
        const mg = String(activeForm.magazine).trim().toLowerCase();
        const pg = String(activeForm.page).trim().toLowerCase();

        const filteredExact = data.filter(c => {
          const pubs = c.publications || [];
          const hasExactPub = pubs.some(p => {
            const pMag = String(p.mag || p.magazine || '').trim().toLowerCase();
            const pPage = String(p.page || '').trim().toLowerCase();
            const pYear = String(p.year || '').trim().toLowerCase();
            const pVol = String(p.vol || '').trim().toLowerCase();
            const magMatches = pMag === mg || (!pMag && mg === 'sld') || pMag.replace(/[^a-z0-9]/g, '') === mg.replace(/[^a-z0-9]/g, '');
            const pageMatches = pPage === pg || (Number(pPage) > 0 && Number(pPage) === Number(pg));
            const yearMatches = pYear === yv || pVol === yv || (Number(pYear) > 0 && Number(pYear) === Number(yv)) || (Number(pVol) > 0 && Number(pVol) === Number(yv));
            return magMatches && pageMatches && yearMatches;
          });
          if (hasExactPub) return true;

          const mapEntries = Array.isArray(c.mapYearPage) ? c.mapYearPage : (c.mapYearPage ? [c.mapYearPage] : []);
          return mapEntries.some(m => {
            const low = String(m).toLowerCase();
            const yearRegex = new RegExp(`(?:^|\\D)${yv}(?:\\D|$)`, 'i');
            const pageRegex = new RegExp(`(?:^|\\D)0*${pg}(?:\\D|$)`, 'i');
            const magClean = mg.replace(/[^a-z0-9]/g, '');
            const magMatches = low.includes(mg) || (magClean && low.replace(/[^a-z0-9]/g, '').includes(magClean)) || mg === 'sld';
            return yearRegex.test(low) && pageRegex.test(low) && magMatches;
          });
        });

        // Unconditionally assign filteredExact so an exact 3-block search NEVER returns mismatched years
        data = filteredExact;
      }

      // Guarantee Court filter is strictly respected on returned dataset (never match empty courts)
      if (activeForm.court && String(activeForm.court).trim() && Array.isArray(data)) {
        const courtLower = String(activeForm.court).trim().toLowerCase();
        data = data.filter(c => {
          const cCourt = String(c.court || '').trim().toLowerCase();
          if (!cCourt) return false;
          return cCourt === courtLower || cCourt.includes(courtLower) || (cCourt.length >= 6 && courtLower.includes(cCourt));
        });
      }

      setSubmittedFilters({ ...activeForm });
      setCurrentPage(1);
      setResults(data);
      saveToHistory(activeForm, Array.isArray(data) ? data.length : 0);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err?.code === 'ERR_CANCELED') {
        return; // Safe ignore aborted previous query
      }
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        setError(apiMsg);
      } else if (err?.response?.status === 504 || err?.code === 'ECONNABORTED') {
        setError('Search timed out on the database server. Please refine your criteria or search by citation/case number.');
      } else {
        setError('Search execution failed. Please verify criteria.');
      }
    } finally {
      if (searchAbortRef.current === abortCtrl) {
        setLoading(false);
      }
    }
  };

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const qPhrase = searchParams.get('phrase') || searchParams.get('searchPhrase') || searchParams.get('text') || searchParams.get('q');
    if (qPhrase && String(qPhrase).trim()) {
      const clean = String(qPhrase).trim();
      const newF = { ...EMPTY, phrase: clean };
      setF(newF);
      handleSearch(newF);
    }
  }, [searchParams]);

  const handleReset = () => {
    setF(EMPTY);
    setSubmittedFilters(null);
    setCurrentPage(1);
    setResults(null);
    setError(null);
  };

  const handleSelectHistory = (entry) => {
    setF({ ...EMPTY, ...entry.filters });
    handleSearch({ ...EMPTY, ...entry.filters });
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="flex flex-col w-full animate-fade-in pb-16" onKeyDown={handleKeyDown}>

      {/* ── Top Header Bar with Refresh & Search Controls ────────────────── */}
      <div className="bg-white px-6 py-3.5 flex flex-wrap items-center justify-between border-b border-gray-200 rounded-t-xl shadow-xs gap-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-[#3d4a7a]" />
          <span className="text-sm font-bold text-gray-800">
            Case Law Search Studio
          </span>
          <span className="text-xs text-gray-500 hidden sm:inline">
            (Select single or multiple blocks to query legal archive)
          </span>
        </div>

        {/* Action Buttons: Refresh / Clear Blocks + Search */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            title="Clear all fields and reset search"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-6 py-1.5 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <span>Searching…</span>
              </>
            ) : (
              <>
                <SearchIcon className="w-3.5 h-3.5" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Two-Column Layout: Search Blocks Squeezed on Left + Search History on Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3">

        {/* ── Left Squeezed Search Form Panel (Col 9) ────────────────────── */}
        <div className="lg:col-span-9 bg-[#a8cfe0] px-4 sm:px-6 py-5 rounded-b-xl shadow-xs flex flex-col justify-between">

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-100 border border-red-300 text-red-800 text-xs font-semibold rounded-lg shadow-2xs">
              {error}
            </div>
          )}

          {/* ── Row 1: Year/vol · Select Magazine · Page (First 3 Blocks) ── */}
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="flex justify-center">
              <div className="w-[85%]">
                <input 
                  className={inp} 
                  placeholder="Year / Vol" 
                  value={f.yearVolume} 
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  onInput={(e) => {
                    const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 4);
                    e.target.value = cleanVal;
                    setF(prev => ({ ...prev, yearVolume: cleanVal }));
                  }}
                  onKeyDown={(e) => {
                    if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(e.key)) return;
                    if (!/^\d$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 4);
                    e.target.value = text;
                    setF(prev => ({ ...prev, yearVolume: text }));
                  }}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setF(prev => ({ ...prev, yearVolume: cleanVal }));
                  }} 
                  title="First Block: Enter 4-digit Year or Volume (e.g. 2026)"
                />
              </div>
            </div>
            <SelectField 
              value={f.magazine ? String(f.magazine).toUpperCase() : ''} 
              onChange={(val) => setF(prev => ({ ...prev, magazine: String(val || '').toUpperCase() }))} 
              options={magazineOptions} 
              placeholder="Select Magazine..."
              allowCustom={false}
              readOnly={true}
            />
            <div className="flex justify-center">
              <div className="w-[85%]">
                <input 
                  className={inp} 
                  placeholder="Page" 
                  value={f.page} 
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  onInput={(e) => {
                    const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 4);
                    e.target.value = cleanVal;
                    setF(prev => ({ ...prev, page: cleanVal }));
                  }}
                  onKeyDown={(e) => {
                    if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(e.key)) return;
                    if (!/^\d$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 4);
                    e.target.value = text;
                    setF(prev => ({ ...prev, page: text }));
                  }}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setF(prev => ({ ...prev, page: cleanVal }));
                  }} 
                  title="Third Block: Enter up to 4-digit page number (e.g. 5178)"
                />
              </div>
            </div>
          </div>

          {/* ── Row 2: Select Law (wide) · Select Section · Select Section 2 ─ */}
          <div className="flex gap-4 mb-3 items-center">
            <div className="w-[58%]">
              <SelectField value={f.selectLaw} onChange={set('selectLaw')} options={lawOptions} placeholder="Select Law / Statute..." />
            </div>
            <div className="flex-1">
              <SearchableSectionSelect
                value={f.section}
                onChange={(val) => setF(p => ({ ...p, section: val }))}
                options={sectionOptions}
                placeholder="Section #"
                inputSize="sm"
              />
            </div>
            <div className="flex-1">
              <SearchableSectionSelect
                value={f.section2}
                onChange={(val) => setF(p => ({ ...p, section2: val }))}
                options={sectionOptions}
                placeholder="Section 2 #"
                inputSize="sm"
              />
            </div>
          </div>

          {/* ── Row 3: Select Court · Enter Case # · From Date · To Date (Calendar Selectors) ─ */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 mb-3 items-center">
            <div className="w-full sm:w-[46%]">
              <SelectField value={f.court} onChange={set('court')} options={courtOptions} placeholder="Court (e.g. Supreme Court, High Court...)" />
            </div>
            <div className="w-full sm:w-[22%]">
              <input className={inp} placeholder="Enter Case #" value={f.caseNumber} onChange={set('caseNumber')} />
            </div>
            <div className="w-full sm:w-[16%]">
              <DatePicker 
                selectedDate={f.fromDate}
                onChange={(val) => setF(p => ({ ...p, fromDate: val }))}
                placeholder="From Date"
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-[16%]">
              <DatePicker 
                selectedDate={f.toDate}
                onChange={(val) => setF(p => ({ ...p, toDate: val }))}
                placeholder="To Date"
                className="w-full"
              />
            </div>
          </div>

          {/* ── Row 4: Enter Text · Enter Text 2 · Phrase Search ─────────── */}
          <div className="grid grid-cols-3 gap-4 mb-3">
            <input className={inp} placeholder="Enter Text" value={f.text} onChange={set('text')} />
            <input className={inp} placeholder="Enter Text 2" value={f.text2} onChange={set('text2')} />
            <input className={inp} placeholder="Phrase Search" value={f.phrase} onChange={set('phrase')} />
          </div>

          {/* ── Row 5: Judges · Lawyers · Petitioner ─────────────────────── */}
          <div className="grid grid-cols-3 gap-4 mb-3 px-[4%]">
            <input className={inp} placeholder="Judges" value={f.judges} onChange={set('judges')} />
            <input className={inp} placeholder="Lawyers" value={f.lawyers} onChange={set('lawyers')} />
            <input className={inp} placeholder="Petitioner" value={f.petitioner} onChange={set('petitioner')} />
          </div>

          {/* ── Row 6: Select Principle Law — centered wide ───────────────── */}
          <div className="flex justify-center mb-5">
            <div className="w-[72%]">
              <SelectField value={f.principleLaw} onChange={set('principleLaw')} options={principleOptions} placeholder="Select Principle of Law..." />
            </div>
          </div>

          {/* ── Bottom Search & Refresh Controls ─────────────────────────── */}
          <div className="flex justify-center items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-6 py-2 border border-white/80 text-white hover:bg-white/20 text-sm font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-12 py-2 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-sm font-bold rounded-lg transition-colors shadow-md disabled:opacity-60 min-w-[150px] cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <span>Searching…</span>
                </>
              ) : (
                <>
                  <SearchIcon className="w-4 h-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* ── Right Column: Search History Panel (Col 3) ─────────────────── */}
        <div className="lg:col-span-3 bg-white dark:bg-theme-surface border border-gray-200 dark:border-theme-border rounded-xl shadow-xs p-4 flex flex-col h-full max-h-[460px]">
          
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-theme-border">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#3d4a7a] dark:text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                Search History
              </h3>
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                title="Clear all search history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1 scrollbar-thin">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <Clock className="w-8 h-8 mb-2 stroke-1 opacity-50" />
                <p className="text-xs font-medium">No recent searches</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Your searches will appear here for fast re-run</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectHistory(item)}
                  className="p-2.5 rounded-lg border border-gray-100 dark:border-theme-border/60 hover:border-[#3d4a7a]/50 hover:bg-blue-50/50 dark:hover:bg-theme-surface-hover cursor-pointer transition-all group shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight group-hover:text-[#3d4a7a]">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded shrink-0">
                      {item.count} {item.count === 1 ? 'case' : 'cases'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>{item.date}</span>
                    <span>{item.timestamp}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {history.length > 0 && (
            <p className="text-[10px] text-center text-gray-400 pt-2 border-t border-gray-100 dark:border-theme-border">
              Click any query above to re-run instantly
            </p>
          )}

        </div>

      </div>

      {/* ── Results Table Area with Dynamic Columns & Yellow Highlighting ── */}
      {results !== null && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
          
          <div className="flex flex-wrap items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 gap-2">
            <div className="flex items-center gap-3">
              <span className="text-sm sm:text-base font-bold text-gray-900">
                Official Case Records
              </span>
              <span className="px-3 py-0.5 bg-[#a8cfe0] text-[#1e3a5a] text-xs sm:text-[13px] font-extrabold rounded-full shadow-2xs">
                {results.length} record{results.length !== 1 ? 's' : ''} found
              </span>
            </div>
            <div className="flex items-center gap-3">
              {results.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-gray-600">
                  <span>Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-xs sm:text-[13px] font-medium text-gray-800 focus:outline-none"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                  </select>
                </div>
              )}
              <button
                onClick={handleReset}
                className="text-xs sm:text-[13px] font-semibold text-[#3d4a7a] hover:underline cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm font-medium">No judicial records match your search criteria.</p>
              <button 
                onClick={handleReset} 
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#3d4a7a] text-white hover:bg-[#2e3a6a] text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear and try again
              </button>
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-[13px] sm:text-sm text-left divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-[#3d4a7a] text-white select-none text-[13px]">
                      <th className="px-2.5 py-3 font-bold w-11 text-center">#</th>
                      <th className="px-2.5 py-3 font-bold whitespace-nowrap w-[72px]">SLD #</th>
                      <th className="px-2.5 py-3 font-bold whitespace-nowrap w-[135px]">Citation</th>
                      <th className="px-2.5 py-3 font-bold min-w-[140px] max-w-[190px]">Court</th>
                      {!hasTextSearch && (
                        <th className="px-2.5 py-3 font-bold whitespace-nowrap w-[95px] text-center">Dated</th>
                      )}

                      {/* Dynamic Columns based on queried fields */}
                      {showLawColumns && (
                        <>
                          <th className="px-2.5 py-3 font-bold max-w-[170px]">Law</th>
                          <th className="px-2 py-3 font-bold w-[135px] max-w-[145px]">Sections</th>
                        </>
                      )}

                      {showJudgeColumn && (
                        <th className="px-2.5 py-3 font-bold max-w-[155px]">Judges</th>
                      )}

                      {showLawyerColumn && (
                        <th className="px-2.5 py-3 font-bold max-w-[155px]">Lawyers</th>
                      )}

                      {showPetitionerColumn && (
                        <th className="px-2.5 py-3 font-bold max-w-[155px]">Petitioner</th>
                      )}

                      {hasTextSearch ? (
                        <th className="px-3 py-3 font-bold">Head Notes</th>
                      ) : (
                        <>
                          <th className="px-2.5 py-3 font-bold max-w-[205px]">Case No.</th>
                          <th className="px-2.5 py-3 font-bold max-w-[330px]">Lawyer / Petitioner / Author</th>
                        </>
                      )}
                      <th className="px-2.5 py-3 font-bold w-[85px] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedResults.map((c, i) => {
                      const rowIdx = startIndex + i;
                      const matchedPara = c.relevantParagraph || (hasTextSearch
                        ? extractRelevantParagraph(c.judgment, c.headNote, [colSource.text, colSource.text2, colSource.phrase])
                        : null);

                      return (
                        <CaseTableRow
                          key={c.id || c._id || rowIdx}
                          c={c}
                          i={rowIdx}
                          matchedPara={matchedPara}
                          searchTerms={searchTerms}
                          showLawColumns={showLawColumns}
                          showJudgeColumn={showJudgeColumn}
                          showLawyerColumn={showLawyerColumn}
                          showPetitionerColumn={showPetitionerColumn}
                          isTextSearchMode={hasTextSearch}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalResultsCount > itemsPerPage && (
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  totalItems={totalResultsCount}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(p) => setCurrentPage(Math.max(1, Math.min(totalPages, p)))}
                />
              )}
            </>
          )}
        </div>
      )}

      <CaseDocumentModal caseId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
};

export default SearchCaseLawPage;
