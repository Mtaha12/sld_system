import React, { useState, useEffect, useMemo } from 'react';
import { Eye, ExternalLink, BookOpen, AlertCircle, RotateCcw, X, Search as SearchIcon, FileText } from 'lucide-react';
import { caseService } from '../features/cases/services/caseService';
import { statuteService } from '../features/statutes/services/statuteService';
import { settingService } from '../services/settingService';
import { LAW_OPTIONS } from '../data/laws';
import CaseDocumentModal from '../components/ui/CaseDocumentModal';
import Modal from '../components/ui/Modal';

/* ── Shared form field styles ────────────────────────────────────────── */
const inp =
  'w-full bg-white text-gray-700 placeholder-gray-400 text-sm px-3 py-2 rounded-md ' +
  'border-0 outline-none focus:ring-2 focus:ring-[#4a7a9b]/40 h-[38px] transition-all';

const sel =
  'w-full bg-white text-gray-700 text-sm px-3 py-2 rounded-md ' +
  'border-0 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-[#4a7a9b]/40 h-[38px] transition-all';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const SelectField = React.memo(({ value, onChange, options = [], placeholder = 'Select Law' }) => {
  const allOptions = useMemo(() => {
    const list = [...options];
    if (value && !list.some(o => o.value === value)) {
      list.push({ value, label: value });
    }
    return list;
  }, [options, value]);

  return (
    <div className="relative w-full">
      <select className={sel} value={value} onChange={onChange}>
        <option value="">{placeholder}</option>
        {allOptions.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"/>
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

  // Alphabetical Filter State
  const [activeLetter, setActiveLetter] = useState(null);

  // Results State
  const [caseResults, setCaseResults] = useState(null);
  const [statuteResults, setStatuteResults] = useState(null);
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'statutes'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [viewStatute, setViewStatute] = useState(null);

  // Laws Options State
  const [lawOptions, setLawOptions] = useState([]);

  // Fetch Laws from backend, with local dataset fallback
  useEffect(() => {
    let isMounted = true;
    settingService.getLaws({ status: 'active', limit: 5000 })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const list = res.data.map(l => ({ value: l.name, label: l.name }));
          setLawOptions(list);
        } else {
          // Fallback to static law options
          const fallback = LAW_OPTIONS.filter(l => l.value).map(l => ({ value: l.value, label: l.label }));
          setLawOptions(fallback);
        }
      })
      .catch(() => {
        if (isMounted) {
          const fallback = LAW_OPTIONS.filter(l => l.value).map(l => ({ value: l.value, label: l.label }));
          setLawOptions(fallback);
        }
      });

    return () => { isMounted = false; };
  }, []);

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
    setCaseResults(null);
    setStatuteResults(null);

    try {
      // 1. Search Cases matching the Statute / Section / Text criteria
      const filters = {
        selectLaw: selectLaw.trim() || undefined,
        section: section.trim() || undefined,
        keywords: text.trim() || undefined,
        keywords2: text2.trim() || undefined,
      };

      const [casesData, statutesData] = await Promise.allSettled([
        caseService.searchCases(filters),
        statuteService.getStatutes({
          query: [selectLaw, section, text].filter(Boolean).join(' '),
          limit: 50
        })
      ]);

      const cases = casesData.status === 'fulfilled' ? (casesData.value || []) : [];
      const statutes = statutesData.status === 'fulfilled' ? (statutesData.value || []) : [];

      setCaseResults(cases);
      setStatuteResults(statutes);
      setActiveTab('cases');
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
    setCaseResults(null);
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
              <input
                className={inp}
                placeholder="Enter Section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
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
      {(caseResults !== null || statuteResults !== null) && (
        <div className="mt-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
          
          {/* Header & Tabs */}
          <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('cases')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'cases'
                    ? 'bg-[#3d4a7a] text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                }`}
              >
                Cases ({caseResults?.length || 0})
              </button>
              {statuteResults && statuteResults.length > 0 && (
                <button
                  onClick={() => setActiveTab('statutes')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeTab === 'statutes'
                      ? 'bg-[#3d4a7a] text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                  }`}
                >
                  Statute Provisions ({statuteResults.length})
                </button>
              )}
            </div>

            <span className="px-2.5 py-1 bg-[#a8cfe0] text-[#1e3a5a] text-xs font-bold rounded-full">
              {activeTab === 'cases'
                ? `${caseResults?.length || 0} Case${caseResults?.length !== 1 ? 's' : ''} Found`
                : `${statuteResults?.length || 0} Statute Record${statuteResults?.length !== 1 ? 's' : ''} Found`
              }
            </span>
          </div>

          {/* TAB 1: Cases View Table */}
          {activeTab === 'cases' && (
            <div>
              {(!caseResults || caseResults.length === 0) ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm font-medium">No legal cases found matching this statute and section.</p>
                  <p className="text-xs text-gray-400 mt-1">Try broadening your section number or text keywords.</p>
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
                        <th className="px-3 py-2.5 font-semibold whitespace-nowrap">SLD #</th>
                        <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Citation</th>
                        <th className="px-3 py-2.5 font-semibold">Court</th>
                        <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Case No.</th>
                        <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Date</th>
                        <th className="px-3 py-2.5 font-semibold">Head Note</th>
                        <th className="px-3 py-2.5 font-semibold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {caseResults.map((c, i) => (
                        <tr key={c.id || c._id || i} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                            {c.sldNumber || '—'}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {(Array.isArray(c.mapYearPage) ? c.mapYearPage : []).map((cit, j) => (
                              <span key={j} className="inline-block mr-1 px-1.5 py-0.5 bg-[#a8cfe0]/50 dark:bg-blue-900/40 text-[#1e3a5a] dark:text-blue-200 rounded text-[11px] font-semibold">
                                {cit}
                              </span>
                            ))}
                          </td>
                          <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 max-w-[170px] truncate">
                            {c.court || '—'}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 max-w-[140px] truncate">
                            {Array.isArray(c.caseNumber) ? c.caseNumber.join(', ') : (c.caseNumber || '—')}
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                            {c.dated ? String(c.dated).split('T')[0] : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 max-w-[280px]">
                            <p className="line-clamp-2">{c.headNote || '—'}</p>
                          </td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewId(c.id || c._id || c.sldNumber)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-[11px] font-semibold rounded transition-colors cursor-pointer"
                                title="Quick Preview Case"
                              >
                                <Eye className="w-3 h-3" /> View
                              </button>
                              <a
                                href={`/cases/view/${c.id || c._id || c.sldNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                title="Open in new window"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Statute Records View */}
          {activeTab === 'statutes' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#3d4a7a] text-white">
                    <th className="px-3 py-2.5 font-semibold">SR #</th>
                    <th className="px-3 py-2.5 font-semibold">Law</th>
                    <th className="px-3 py-2.5 font-semibold">Section</th>
                    <th className="px-3 py-2.5 font-semibold">Heading / Subject</th>
                    <th className="px-3 py-2.5 font-semibold">Department</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {statuteResults.map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-200">
                        {s.srNumber || s.id}
                      </td>
                      <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 max-w-[200px]">
                        {s.law || '—'}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-brand-orange whitespace-nowrap">
                        Section {s.section || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 max-w-[280px]">
                        <p className="line-clamp-2">{s.heading || s.sectionHeading || '—'}</p>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                        {s.department || 'Tax'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => setViewStatute(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-[11px] font-semibold rounded transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> View Statute
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

      {/* ── Case Document Full Preview Modal ─────────────────────────────── */}
      <CaseDocumentModal caseId={viewId} onClose={() => setViewId(null)} />

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
                      <p className="whitespace-pre-line text-gray-700 dark:text-gray-300 leading-relaxed">{b.detail}</p>
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
