import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, BookOpen, AlertCircle, RotateCcw, X, Search as SearchIcon, FileText } from 'lucide-react';
import { statuteService } from '../features/statutes/services/statuteService';
import { settingService } from '../services/settingService';
import { LAW_OPTIONS } from '../data/laws';
import { ALL_SECTIONS } from '../data/sections';
import Modal from '../components/ui/Modal';
import { formatWordDocumentDisplay } from '../utils/wordFormatter';

/* ── Shared form field styles ────────────────────────────────────────── */
const inp =
  'w-full bg-white dark:bg-[#1a2234] text-gray-800 dark:text-gray-100 placeholder-gray-400 text-sm px-3.5 py-2 rounded-lg ' +
  'border border-slate-200/90 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#3d4a7a]/50 h-[38px] shadow-2xs transition-all';

const sel =
  'w-full bg-white dark:bg-[#1a2234] text-gray-800 dark:text-gray-100 text-sm pl-3.5 pr-8 py-2 rounded-lg ' +
  'border border-slate-200/90 dark:border-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange hover:border-brand-orange/40 h-[38px] shadow-2xs transition-all';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const SelectField = React.memo(({ value, onChange, options = [], placeholder = 'Select Law' }) => {
  const allOptions = useMemo(() => {
    const list = [...options];
    if (value && !list.some(o => o.value === value)) {
      list.push({ value, label: value });
    }

    const placeholders = [];
    const regular = [];
    const seen = new Set();

    for (const opt of list) {
      if (!opt) continue;
      const key = String(opt.value ?? '');
      if (seen.has(key)) continue;
      seen.add(key);

      const isPlaceholder = opt.value === '' || opt.value === 'all' || 
        String(opt.label || '').toLowerCase().startsWith('select ') || 
        String(opt.label || '').toLowerCase().startsWith('choose ');
      if (isPlaceholder) {
        placeholders.push(opt);
      } else {
        regular.push(opt);
      }
    }

    regular.sort((a, b) => 
      String(a.label || a.value || '').localeCompare(
        String(b.label || b.value || ''), 
        undefined, 
        { numeric: true, sensitivity: 'base' }
      )
    );

    return [...placeholders, ...regular];
  }, [options, value]);

  return (
    <div className="relative w-full">
      <select className={sel} value={value} onChange={onChange}>
        <option value="" className="bg-theme-surface text-theme-main py-1">{placeholder}</option>
        {allOptions.map(o => (
          <option key={o.value} value={o.value} className="bg-theme-surface text-theme-main py-1">
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8l4 4 4-4" />
        </svg>
      </span>
    </div>
  );
});

const StatuteSearchPage = () => {
  // Search Form State
  const [selectLaw, setSelectLaw] = useState('');
  const [section, setSection] = useState('');
  const [text, setText] = useState('');
  const [text2, setText2] = useState('');
  const [sectionOptions, setSectionOptions] = useState(ALL_SECTIONS || []);

  // Alphabetical Filter State
  const [activeLetter, setActiveLetter] = useState(null);

  // Results State
  const [statuteResults, setStatuteResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewStatute, setViewStatute] = useState(null);

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

  // Fetch Laws from backend, with local dataset fallback
  useEffect(() => {
    let isMounted = true;
    settingService.getLaws({ status: 'active', limit: 5000 })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const list = res.data
            .map(l => ({ value: l.name, label: l.name }))
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
          setLawOptions(list);
        } else {
          // Fallback to static law options
          const fallback = LAW_OPTIONS.filter(l => l.value)
            .map(l => ({ value: l.value, label: l.label }))
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
          setLawOptions(fallback);
        }
      })
      .catch(() => {
        if (isMounted) {
          const fallback = LAW_OPTIONS.filter(l => l.value)
            .map(l => ({ value: l.value, label: l.label }))
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
          setLawOptions(fallback);
        }
      });

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

  // Filtered laws by selected alphabetical letter
  const lawsForActiveLetter = useMemo(() => {
    if (!activeLetter) return [];
    return lawOptions.filter(l => (l.label || l.value).trim().toUpperCase().startsWith(activeLetter));
  }, [activeLetter, lawOptions]);

  // Handle Search Submission
  const handleSearch = async () => {
    setError(null);

    const hasAny = Boolean(selectLaw.trim() || section.trim() || text.trim() || text2.trim());
    if (!hasAny) {
      setError('Please select a Law or enter a Section / Text keyword to search.');
      return;
    }

    setLoading(true);
    setStatuteResults(null);

    try {
      const searchParams = { limit: 100 };
      if (selectLaw.trim()) searchParams.law = selectLaw.trim();
      if (section.trim()) searchParams.section = section.trim();
      if (text.trim()) searchParams.text = text.trim();
      if (text2.trim()) searchParams.text2 = text2.trim();

      const statutes = await statuteService.getStatutes(searchParams);

      setStatuteResults(Array.isArray(statutes) ? statutes : []);
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

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 animate-fade-in" onKeyDown={handleKeyDown}>
      {/* ── Page Title ───────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 tracking-tight">
        Statute Search
      </h1>

      {/* ── Card Container ──────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        
        {/* ── Top Bar: Law + Section & Search Button ──────────────────────── */}
        <div className="bg-white dark:bg-gray-800 px-6 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Law + Section
          </span>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-5 py-1.5 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-sm font-semibold rounded transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* ── Light Cyan/Sky Blue Search Panel ───────────────────────────── */}
        <div className="bg-[#a8cfe0] dark:bg-[#2b4c63] px-6 sm:px-8 py-6 transition-colors">
          
          {error && (
            <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Select Law (wide) · Enter Section */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center">
            <div className="w-full sm:w-[70%]">
              <SelectField
                value={selectLaw}
                onChange={(e) => setSelectLaw(e.target.value)}
                options={lawOptions}
                placeholder="Select Law"
              />
            </div>
            <div className="w-full sm:flex-1">
              <SelectField
                value={section}
                onChange={(e) => setSection(e.target.value)}
                options={sectionSelectOptions}
                placeholder="Select Section"
              />
            </div>
          </div>

          {/* Row 2: Enter Text · Enter Text 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <input
              className={inp}
              placeholder="Enter Text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <input
              className={inp}
              placeholder="Enter Text 2"
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
              onClick={handleSearch}
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

          {/* ── Alphabetical Order Section ──────────────────────────────── */}
          <div className="mt-7 pt-4 border-t border-white/30 text-center">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
              Alphabetical Order
            </h3>

            {/* Letter Bar */}
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

            {/* Alphabetical Laws Drawer / Dropdown Helper */}
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

      {/* ── Search Results ──────────────────────────────────────────────── */}
      {/* ── Search Results: Statutes Only ─────────────────────────── */}
      {statuteResults !== null && (
        <div className="mt-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-gray-700 dark:text-gray-200">
                Statute Provisions Search Results
              </span>
            </div>

            <span className="px-2.5 py-1 bg-[#a8cfe0] text-[#1e3a5a] text-xs font-bold rounded-full">
              {statuteResults.length} Statute Record{statuteResults.length !== 1 ? 's' : ''} Found
            </span>
          </div>

          {statuteResults.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium">No Statute Provisions found matching this search criteria.</p>
              <p className="text-xs text-gray-400 mt-1">Try selecting a different Law or entering broader section / text keywords.</p>
              <button onClick={handleReset} className="mt-3 text-[#3d4a7a] dark:text-blue-400 hover:underline text-xs font-medium cursor-pointer">
                Clear and try another search
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#3d4a7a] text-white">
                    <th className="px-3 py-2.5 font-semibold">#</th>
                    <th className="px-3 py-2.5 font-semibold">ID / SR #</th>
                    <th className="px-3 py-2.5 font-semibold">Law</th>
                    <th className="px-3 py-2.5 font-semibold">Chapter</th>
                    <th className="px-3 py-2.5 font-semibold">Section</th>
                    <th className="px-3 py-2.5 font-semibold">Heading / Subject</th>
                    <th className="px-3 py-2.5 font-semibold">Department</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Attachment</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {statuteResults.map((s, idx) => {
                    const hasAtt = (Array.isArray(s.attachments) && s.attachments.length > 0) ||
                                   Boolean(s.attachment) ||
                                   Boolean(s.attachmentName) ||
                                   (Array.isArray(s.blocks) && s.blocks.some(b => Array.isArray(b?.attachments) ? b.attachments.length > 0 : Boolean(b?.attachment)));

                    return (
                      <tr key={s.id || idx} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-3 py-2.5 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-200">
                          {s.srNumber || s.id}
                        </td>
                        <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 max-w-[200px] font-medium">
                          {s.law || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                          {s.chapter || '—'}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-brand-orange whitespace-nowrap">
                          Section {s.section || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 max-w-[280px]">
                          <p className="line-clamp-2">{s.heading || s.sectionHeading || '—'}</p>
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                          {s.department || 'Tax'}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {hasAtt ? (
                            <button
                              type="button"
                              onClick={() => setViewStatute(s)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#7c4dff]/20 hover:bg-[#7c4dff]/30 text-[#651fff] dark:text-[#b388ff] border border-[#7c4dff]/40 shadow-sm transition-all cursor-pointer"
                              title="View Attachment"
                            >
                              <Eye className="w-3 h-3 shrink-0" />
                              <span>view</span>
                            </button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <a
                            href={`/statutes/view/${s.mongoId || s._id || s.id || s.statuteId || s.srNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-[11px] font-semibold rounded transition-colors cursor-pointer shadow-xs"
                          >
                            <Eye className="w-3 h-3" /> View Statute
                          </a>
                        </td>
                      </tr>
                    );
                  })}
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
