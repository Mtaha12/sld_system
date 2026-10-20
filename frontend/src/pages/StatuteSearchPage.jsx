import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, BookOpen, AlertCircle, RotateCcw, X, Search as SearchIcon, FileText, Paperclip, History, Trash2, Clock } from 'lucide-react';
import { statuteService } from '../features/statutes/services/statuteService';
import SearchableLawSelect from '../features/statutes/components/SearchableLawSelect';
import Modal from '../components/ui/Modal';
import { formatWordDocumentDisplay } from '../utils/wordFormatter';

/* ── Shared form field styles ────────────────────────────────────────── */
const inp =
  'w-full bg-white dark:bg-[#1a2234] text-gray-800 dark:text-gray-100 placeholder-gray-400 text-sm px-3.5 py-2 rounded-lg ' +
  'border border-slate-200/90 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#3d4a7a]/50 h-[38px] shadow-2xs transition-all';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const HISTORY_KEY = 'sld_statute_search_history_v1';

/* ── Yellow Word Highlighting Component ─────────────────────────────────── */
const Highlight = React.memo(({ text, terms = [] }) => {
  if (!text) return null;
  const str = String(text);

  const tokens = useMemo(() => {
    const set = new Set();
    (Array.isArray(terms) ? terms : [terms]).forEach(t => {
      if (!t) return;
      const clean = String(t).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (clean.length >= 2) {
        set.add(clean);
        clean.split(/\s+/).forEach(word => {
          if (word.length >= 2) set.add(word);
        });
      }
    });
    return Array.from(set);
  }, [terms]);

  if (tokens.length === 0) return <span>{str}</span>;

  try {
    const regex = new RegExp(`(${tokens.join('|')})`, 'gi');
    const parts = str.split(regex);
    const lowerTokenSet = new Set(tokens.map(t => t.toLowerCase()));

    return (
      <span>
        {parts.map((part, i) => {
          if (!part) return null;
          const isMatch = lowerTokenSet.has(part.toLowerCase());
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

const StatuteSearchPage = () => {
  // Search Form State
  const [selectLaw, setSelectLaw]   = useState('');
  const [section, setSection]       = useState('');
  const [text, setText]             = useState('');
  const [text2, setText2]           = useState('');

  // Alphabetical Filter State
  const [activeLetter, setActiveLetter] = useState(null);

  // Results State
  const [statuteResults, setStatuteResults] = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [viewStatute, setViewStatute]       = useState(null);

  // Search History from localStorage
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [urlSearchParams] = useSearchParams();

  // Laws Options State
  const [lawOptions, setLawOptions] = useState([]);

  // Auto-search if URL parameters are passed (e.g. from featured cards)
  useEffect(() => {
    const lawQ = urlSearchParams.get('law') || urlSearchParams.get('query');
    const secQ = urlSearchParams.get('section');
    const txtQ = urlSearchParams.get('text');
    if (lawQ || secQ || txtQ) {
      if (lawQ) setSelectLaw(lawQ);
      if (secQ) setSection(secQ);
      if (txtQ) setText(txtQ);

      setLoading(true);
      setError(null);
      statuteService.getStatutes({
        limit: 100,
        ...(lawQ ? { law: lawQ } : {}),
        ...(secQ ? { section: secQ } : {}),
        ...(txtQ ? { text: txtQ } : {})
      }).then(res => {
        setStatuteResults(Array.isArray(res) ? res : []);
      }).catch(err => {
        setError(err?.response?.data?.message || 'Search execution encountered an error.');
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [urlSearchParams]);

  // Fetch Laws that have records in the statutes database
  useEffect(() => {
    let isMounted = true;
    statuteService.getDistinctLaws()
      .then(laws => {
        if (isMounted && Array.isArray(laws)) {
          const list = laws
            .map(l => String(l || '').trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            .map(l => ({ value: l, label: l }));
          setLawOptions(list);
        }
      })
      .catch(err => {
        console.warn('Could not load distinct statute laws:', err);
      });

    return () => { isMounted = false; };
  }, []);

  // Filtered laws by selected alphabetical letter
  const lawsForActiveLetter = useMemo(() => {
    if (!activeLetter) return [];
    return lawOptions.filter(l => (l.label || l.value).trim().toUpperCase().startsWith(activeLetter));
  }, [activeLetter, lawOptions]);

  // Save query to localStorage search history
  const saveToHistory = useCallback((params, count) => {
    const parts = [];
    if (params.law) parts.push(params.law);
    if (params.section) parts.push(`Sec ${params.section}`);
    if (params.text) parts.push(`"${params.text}"`);
    if (params.text2) parts.push(`"${params.text2}"`);

    const title = parts.join(' • ') || 'General Statute Search';
    const entry = {
      id: Date.now(),
      title,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      count,
      filters: { ...params }
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

  const handleSelectHistory = (entry) => {
    if (!entry?.filters) return;
    const f = entry.filters;
    setSelectLaw(f.law || '');
    setSection(f.section || '');
    setText(f.text || '');
    setText2(f.text2 || '');
    handleSearch({
      law: f.law || '',
      section: f.section || '',
      text: f.text || '',
      text2: f.text2 || ''
    });
  };

  // Handle Search Submission
  const handleSearch = async (overrideParams = null) => {
    setError(null);

    const activeLaw   = overrideParams ? (overrideParams.law || '') : selectLaw;
    const activeSec   = overrideParams ? (overrideParams.section || '') : section;
    const activeText  = overrideParams ? (overrideParams.text || '') : text;
    const activeText2 = overrideParams ? (overrideParams.text2 || '') : text2;

    const hasAny = Boolean(activeLaw.trim() || activeSec.trim() || activeText.trim() || activeText2.trim());
    if (!hasAny) {
      setError('Please select a Law or enter a Section / Text keyword to search.');
      return;
    }

    setLoading(true);
    setStatuteResults(null);

    try {
      const searchParams = { limit: 100 };
      if (activeLaw.trim())   searchParams.law     = activeLaw.trim();
      if (activeSec.trim())   searchParams.section = activeSec.trim();
      if (activeText.trim())  searchParams.text    = activeText.trim();
      if (activeText2.trim()) searchParams.text2   = activeText2.trim();

      const statutes = await statuteService.getStatutes(searchParams);
      const list = Array.isArray(statutes) ? statutes : [];

      setStatuteResults(list);
      saveToHistory({
        law: activeLaw.trim(),
        section: activeSec.trim(),
        text: activeText.trim(),
        text2: activeText2.trim()
      }, list.length);
    } catch (err) {
      setError(err?.response?.data?.message || 'Search execution encountered an error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectLaw('');
    setSection('');
    setText('');
    setText2('');
    setActiveLetter(null);
    setStatuteResults(null);
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleLetterClick = (letter) => {
    if (activeLetter === letter) {
      setActiveLetter(null);
    } else {
      setActiveLetter(letter);
    }
  };

  const getAttachmentUrl = (f) => {
    if (!f) return null;
    if (typeof f === 'string') {
      if (f.startsWith('http://') || f.startsWith('https://') || f.startsWith('data:') || f.startsWith('blob:')) return f;
      return f.startsWith('/') ? f : `/uploads/${f}`;
    }
    if (f.url) return f.url;
    if (f.path) return f.path.startsWith('/') ? f.path : `/${f.path}`;
    if (f.name) return `/uploads/${f.name}`;
    return null;
  };

  const findRowAttachment = (block, statute) => {
    if (Array.isArray(block?.attachments) && block.attachments.length > 0) {
      return block.attachments[0];
    }
    if (block?.attachment) return block.attachment;
    if (Array.isArray(statute?.attachments) && statute.attachments.length > 0) {
      return statute.attachments[0];
    }
    if (statute?.attachment) return statute.attachment;
    if (statute?.attachmentName) return statute.attachmentName;
    return null;
  };

  const formatDisplayDate = (dVal) => {
    if (!dVal) return '—';
    const d = new Date(dVal);
    if (isNaN(d.getTime())) {
      return String(dVal);
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  /**
   * Block-based flattened rows:
   * If a statute has 4 blocks, it is expanded into 4 entries.
   * Sorted with the latest date on top, then all others descending according to date.
   */
  const flattenedRows = useMemo(() => {
    if (!Array.isArray(statuteResults)) return [];
    const rows = [];

    const parseDateVal = (dStr) => {
      if (!dStr) return 0;
      const t = new Date(dStr).getTime();
      return isNaN(t) ? 0 : t;
    };

    statuteResults.forEach((s, sIdx) => {
      const rawBlocks = Array.isArray(s.blocks) && s.blocks.length > 0
        ? [...s.blocks]
        : [{
            sectionHeading: s.sectionHeading || s.heading || '',
            fromDate: s.dated || s.fromDate || '',
            toDate: s.toDate || '',
            detail: s.detail || '',
            attachments: s.attachments || []
          }];

      // Sort blocks of each statute so latest date is on top, then descending by date
      const sortedBlocks = rawBlocks.sort((a, b) => {
        const timeA = parseDateVal(a.fromDate || a.toDate || s.dated || s.fromDate);
        const timeB = parseDateVal(b.fromDate || b.toDate || s.dated || s.fromDate);
        return timeB - timeA;
      });

      sortedBlocks.forEach((b, bIdx) => {
        const att = findRowAttachment(b, s);
        const blockDate = b.fromDate || s.dated || s.fromDate || '';
        rows.push({
          rowKey: `${s.id || s._id || sIdx}-block-${bIdx}-${parseDateVal(blockDate)}`,
          statute: s,
          block: b,
          blockIndex: bIdx,
          totalBlocks: sortedBlocks.length,
          srNumber: s.srNumber || s.id || (sIdx + 1),
          statuteId: s.statuteId || s.statute_id || s.srNumber || '',
          law: s.law || '—',
          chapter: s.chapter || '—',
          section: s.section || '—',
          sectionHeading: b.sectionHeading || s.heading || s.sectionHeading || '—',
          detail: b.detail || '',
          fromDate: blockDate,
          toDate: b.toDate || '',
          sortTime: parseDateVal(blockDate),
          attachment: att
        });
      });
    });

    // Overall sort: latest date on top, then all others according to date
    return rows.sort((a, b) => {
      if (b.sortTime !== a.sortTime) {
        return b.sortTime - a.sortTime;
      }
      return 0;
    });
  }, [statuteResults]);

  const hasTextSearch = Boolean(text.trim() || text2.trim());

  const handleRowViewAction = (row) => {
    const attUrl = getAttachmentUrl(row.attachment);
    if (attUrl) {
      window.open(attUrl, '_blank', 'noopener,noreferrer');
    } else {
      const id = row.statute?.mongoId || row.statute?._id || row.statute?.id || row.statute?.statuteId || row.statute?.srNumber;
      window.open(`/statutes/view/${id}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 animate-fade-in" onKeyDown={handleKeyDown}>
      {/* ── Page Title ───────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 tracking-tight">
        Statute Search
      </h1>

      {/* ── Main Two-Column Layout: Search Form on Left + Search History on Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5 items-start">
        
        {/* Left Column (9 cols): Search Form ── */}
        <div className="lg:col-span-9 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          
          {/* Top Bar */}
          <div className="bg-white dark:bg-gray-800 px-6 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Law + Section Search
            </span>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-5 py-1.5 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-sm font-semibold rounded transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          {/* Light Cyan/Sky Blue Search Panel */}
          <div className="bg-[#a8cfe0] dark:bg-[#2b4c63] px-6 sm:px-8 py-6 transition-colors">
            
            {error && (
              <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Row 1: Select Law (wide) · Enter Section (text input typed by user) */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center">
              <div className="w-full sm:w-[70%]">
                <SearchableLawSelect
                  value={selectLaw}
                  onChange={setSelectLaw}
                  options={lawOptions}
                  placeholder="Select or enter Law/Statute..."
                />
              </div>
              <div className="w-full sm:flex-1">
                <input
                  type="text"
                  className={inp}
                  placeholder="Enter Section (e.g. 2, 23, 23C)..."
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Enter Text · Enter Text 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <input
                className={inp}
                placeholder="Enter Text (e.g. sales tax, exemption)..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <input
                className={inp}
                placeholder="Enter Text 2 (optional)..."
                value={text2}
                onChange={(e) => setText2(e.target.value)}
              />
            </div>

            {/* Centered Search Button + Reset Button */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleReset}
                className="px-5 py-1.5 border border-white/70 text-gray-800 dark:text-white text-sm font-medium rounded hover:bg-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="px-10 py-2 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-sm font-semibold rounded transition-colors disabled:opacity-60 min-w-[120px] shadow-sm cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Searching…
                  </span>
                ) : 'Search'}
              </button>
            </div>

            {/* Alphabetical Order Section */}
            <div className="mt-7 pt-4 border-t border-white/30 text-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                Alphabetical Order
              </h3>

              <div className="flex flex-wrap items-center justify-center gap-1 text-sm font-bold text-gray-800 dark:text-gray-200 select-none">
                {ALPHABET.map((letter, idx) => (
                  <React.Fragment key={letter}>
                    <button
                      type="button"
                      onClick={() => handleLetterClick(letter)}
                      className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                        activeLetter === letter
                          ? 'bg-[#3d4a7a] text-white scale-110 shadow-sm'
                          : 'hover:text-[#3d4a7a] hover:bg-white/40'
                      }`}
                      title={`Browse laws starting with ${letter}`}
                    >
                      {letter}
                    </button>
                    {idx < ALPHABET.length - 1 && (
                      <span className="text-gray-600 dark:text-gray-400 font-normal">|</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Alphabetical Laws Drawer */}
              {activeLetter && (
                <div className="mt-3 p-3 bg-white/95 dark:bg-gray-800/95 rounded-lg shadow-md border border-white/40 max-w-3xl mx-auto text-left animate-fade-in">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Laws starting with letter &ldquo;<strong>{activeLetter}</strong>&rdquo; ({lawsForActiveLetter.length})
                    </span>
                    <button
                      onClick={() => setActiveLetter(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {lawsForActiveLetter.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2 text-center">
                      No laws found beginning with letter {activeLetter}.
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto pr-1 space-y-1 text-xs">
                      {lawsForActiveLetter.map((lawItem, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectLaw(lawItem.value);
                            setActiveLetter(null);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                            selectLaw === lawItem.value
                              ? 'bg-[#3d4a7a] text-white font-medium'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {lawItem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Column (3 cols): Search History Panel */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xs p-4 flex flex-col h-full max-h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
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
                  className="p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-[#3d4a7a]/50 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 cursor-pointer transition-all group shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight group-hover:text-[#3d4a7a]">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded shrink-0">
                      {item.count} {item.count === 1 ? 'record' : 'records'}
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
            <p className="text-[10px] text-center text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
              Click any query above to re-run instantly
            </p>
          )}
        </div>

      </div>

      {/* ── Search Results Area ─────────────────────────────────────────── */}
      {statuteResults !== null && (
        <div className="mt-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
          
          {/* Results Header */}
          <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-gray-700 dark:text-gray-200">
                Statute Provisions Search Results
              </span>
            </div>

            <span className="px-2.5 py-1 bg-[#a8cfe0] text-[#1e3a5a] text-xs font-bold rounded-full">
              {flattenedRows.length} Statute Provision{flattenedRows.length !== 1 ? 's' : ''} Found
            </span>
          </div>

          {flattenedRows.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium">No Statute Provisions found matching this search criteria.</p>
              <p className="text-xs text-gray-400 mt-1">Try selecting a different Law or entering broader section / text keywords.</p>
              <button onClick={handleReset} className="mt-3 text-[#3d4a7a] dark:text-blue-400 hover:underline text-xs font-medium cursor-pointer">
                Clear and try another search
              </button>
            </div>
          ) : hasTextSearch ? (
            /* ── TEXT SEARCH MODE: Shows ONLY Case No and Block column with words highlighted (Requirement 3) ── */
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#3d4a7a] text-white">
                    <th className="px-3 py-2.5 font-semibold w-12 text-center">#</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap min-w-[140px]">Case / SR No.</th>
                    <th className="px-3 py-2.5 font-semibold min-w-[340px]">Block</th>
                    <th className="px-3 py-2.5 font-semibold text-center w-28 whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {flattenedRows.map((row, idx) => (
                    <tr key={row.rowKey || idx} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-3 py-3 text-gray-400 text-center align-top">{idx + 1}</td>
                      <td className="px-3 py-3 font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs">{row.srNumber || row.statuteId || '—'}</span>
                          {row.totalBlocks > 1 && (
                            <span className="text-[10px] text-brand-orange font-semibold">
                              Block {row.blockIndex + 1} of {row.totalBlocks}
                            </span>
                          )}
                          {row.fromDate && (
                            <span className="text-[10px] text-gray-400 font-normal">
                              {formatDisplayDate(row.fromDate)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-200 align-top">
                        <div className="space-y-1.5">
                          {row.sectionHeading && (
                            <p className="font-bold text-xs text-gray-900 dark:text-white">
                              <Highlight text={row.sectionHeading} terms={[text, text2]} />
                            </p>
                          )}
                          {row.detail ? (
                            <div className="text-xs leading-relaxed line-clamp-4 bg-yellow-50/50 dark:bg-yellow-950/20 p-2.5 rounded border border-yellow-200/70 dark:border-yellow-900/40">
                              <Highlight text={row.detail.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()} terms={[text, text2]} />
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">No block provision text available</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap align-top">
                        <button
                          type="button"
                          onClick={() => handleRowViewAction(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-[11px] font-semibold rounded transition-colors cursor-pointer shadow-xs"
                          title={row.attachment ? "Open Attachment in new tab" : "View Statute in new tab"}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── STANDARD MODE (Law / Section search): Shows all standard columns ── */
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#3d4a7a] text-white">
                    <th className="px-3 py-2.5 font-semibold">#</th>
                    <th className="px-3 py-2.5 font-semibold">ID / SR #</th>
                    <th className="px-3 py-2.5 font-semibold">Law</th>
                    <th className="px-3 py-2.5 font-semibold">Chapter</th>
                    <th className="px-3 py-2.5 font-semibold">Section</th>
                    <th className="px-3 py-2.5 font-semibold min-w-[280px]">Heading</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Date</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {flattenedRows.map((row, idx) => (
                    <tr key={row.rowKey || idx} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-3 py-2.5 text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        {row.srNumber}
                        {row.totalBlocks > 1 && (
                          <span className="ml-1 text-[10px] text-brand-orange font-semibold">
                            (B{row.blockIndex + 1})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 max-w-[220px] font-medium">
                        {row.law}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                        {row.chapter}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-brand-orange whitespace-nowrap">
                        {String(row.section || '—').replace(/^section\s+/i, '')}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-200 min-w-[280px]">
                        <p className="line-clamp-2 font-medium">{row.sectionHeading}</p>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap font-medium">
                        {formatDisplayDate(row.fromDate)}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleRowViewAction(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-[11px] font-semibold rounded transition-colors cursor-pointer shadow-xs"
                          title={row.attachment ? "Open Attachment in new tab" : "View Statute in new tab"}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Statute</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ── Statute Details View Modal ───────────────────────────────────── */}
      <Modal
        isOpen={Boolean(viewStatute)}
        onClose={() => setViewStatute(null)}
        title="Statute Details"
        subtitle={`SR #${viewStatute?.srNumber || viewStatute?.id} • Section ${viewStatute?.section}`}
        icon={BookOpen}
      >
        {viewStatute && (
          <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Law / Act
              </span>
              <p className="font-bold text-gray-900 dark:text-white text-base">
                {viewStatute.law}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Section
                </span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Section {viewStatute.section}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Department
                </span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {viewStatute.department || 'Tax'}
                </p>
              </div>
            </div>

            {(viewStatute.heading || viewStatute.sectionHeading) && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Heading / Description
                </span>
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                  {viewStatute.heading || viewStatute.sectionHeading}
                </p>
              </div>
            )}

            {Array.isArray(viewStatute.blocks) && viewStatute.blocks.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Provisions & Details
                </h4>
                {viewStatute.blocks.map((b, bi) => (
                  <div key={bi} className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
                    {b.sectionHeading && (
                      <p className="font-bold text-gray-900 dark:text-white mb-1.5">{b.sectionHeading}</p>
                    )}
                    {b.detail && (
                      <div 
                        dangerouslySetInnerHTML={{ __html: formatWordDocumentDisplay(b.detail) }} 
                        className="word-document-content text-gray-700 dark:text-gray-300 leading-relaxed text-xs" 
                      />
                    )}
                    {Array.isArray(b.attachments) && b.attachments.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
                        {b.attachments.map((att, ai) => (
                          <a 
                            key={ai}
                            href={att.url || `/uploads/${att.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 rounded text-[11px] font-medium transition-colors"
                          >
                            <span>{att.name || 'Attachment'}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StatuteSearchPage;
