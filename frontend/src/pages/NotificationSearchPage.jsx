import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Bell, AlertCircle, RotateCcw, FileText, Calendar, History, Trash2, Clock } from 'lucide-react';
import { notificationService } from '../features/notifications/services/notificationService';
import { settingService } from '../services/settingService';
import { LAW_OPTIONS } from '../data/laws';
import { ALL_SECTIONS } from '../data/sections';
import SearchableSectionSelect from '../components/ui/SearchableSectionSelect';
import Modal from '../components/ui/Modal';
import { formatWordDocumentDisplay } from '../utils/wordFormatter';

/* ── Shared form field styles ────────────────────────────────────────── */
const inp =
  'w-full bg-white dark:bg-[#1a2234] text-gray-800 dark:text-gray-100 placeholder-gray-400 text-sm px-3.5 py-2 rounded-lg ' +
  'border border-slate-200/90 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#3d4a7a]/50 h-[38px] shadow-2xs transition-all';

import SearchableCombobox from '../components/ui/SearchableCombobox';

const SelectField = React.memo(({ value, onChange, options = [], placeholder = 'Select Law' }) => {
  const handleChange = (val) => {
    if (onChange) {
      if (typeof val === 'string') {
        onChange({ target: { value: val } });
      } else {
        onChange(val);
      }
    }
  };

  return (
    <SearchableCombobox
      value={value}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      inputSize="sm"
      allowCustom={true}
    />
  );
});

const NotificationSearchPage = () => {
  // Search Form State
  const [number, setNumber]         = useState('');
  const [year, setYear]             = useState('');
  const [date, setDate]             = useState('');
  const [selectLaw, setSelectLaw]   = useState('');
  const [section, setSection]       = useState('');
  const [text, setText]             = useState('');
  const [sectionOptions, setSectionOptions] = useState(ALL_SECTIONS || []);

  // Results State
  const [notificationResults, setNotificationResults] = useState(null);
  const [loading, setLoading]                         = useState(false);
  const [error, setError]                             = useState(null);
  const [viewNotification, setViewNotification]       = useState(null);

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
    const numQ = urlSearchParams.get('number');
    const txtQ = urlSearchParams.get('query') || urlSearchParams.get('text');
    const lawQ = urlSearchParams.get('law') || urlSearchParams.get('lawStatute');
    const yrQ = urlSearchParams.get('year');
    if (numQ || txtQ || lawQ || yrQ) {
      if (numQ) setNumber(numQ);
      if (txtQ) setText(txtQ);
      if (lawQ) setSelectLaw(lawQ);
      if (yrQ) setYear(yrQ);

      setLoading(true);
      setError(null);
      notificationService.getNotifications({
        limit: 100,
        ...(numQ ? { number: numQ } : {}),
        ...(txtQ ? { text: txtQ } : {}),
        ...(lawQ ? { lawStatute: lawQ } : {}),
        ...(yrQ ? { year: yrQ } : {})
      }).then(res => {
        setNotificationResults(Array.isArray(res) ? res : []);
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

  // Save query to localStorage search history
  const saveToHistory = useCallback((params, count) => {
    const parts = [];
    if (params.number) parts.push(`No. ${params.number}`);
    if (params.year) parts.push(`Year ${params.year}`);
    if (params.date) parts.push(`Date: ${params.date}`);
    if (params.lawStatute) parts.push(params.lawStatute);
    if (params.section) parts.push(`Sec ${params.section}`);
    if (params.text) parts.push(`"${params.text}"`);

    const title = parts.join(' • ') || 'General Notification Search';
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
    setNumber(f.number || '');
    setYear(f.year || '');
    setDate(f.date || '');
    setSelectLaw(f.lawStatute || '');
    setSection(f.section || '');
    setText(f.text || '');
    handleSearch({
      number: f.number || '',
      year: f.year || '',
      date: f.date || '',
      lawStatute: f.lawStatute || '',
      section: f.section || '',
      text: f.text || ''
    });
  };

  // Handle Search Submission
  const handleSearch = async (overrideParams = null) => {
    setError(null);

    const activeNum     = overrideParams ? (overrideParams.number || '') : number;
    const activeYr      = overrideParams ? (overrideParams.year || '') : year;
    const activeDt      = overrideParams ? (overrideParams.date || '') : date;
    const activeLaw     = overrideParams ? (overrideParams.lawStatute || '') : selectLaw;
    const activeSec     = overrideParams ? (overrideParams.section || '') : section;
    const activeText    = overrideParams ? (overrideParams.text || '') : text;

    const hasAny = Boolean(activeNum.trim() || activeYr.trim() || activeDt.trim() || activeLaw.trim() || activeSec.trim() || activeText.trim());
    if (!hasAny) {
      setError('Please fill in at least one field (Number, Year, Date, Law, Section, or Text) to search.');
      return;
    }

    setLoading(true);
    setNotificationResults(null);

    try {
      const searchParams = { limit: 100 };
      if (activeLaw.trim())  searchParams.lawStatute = activeLaw.trim();
      if (activeSec.trim())  searchParams.section    = activeSec.trim();
      if (activeNum.trim())  searchParams.number     = activeNum.trim();
      if (activeYr.trim())   searchParams.year       = activeYr.trim();
      if (activeDt.trim())   searchParams.date       = activeDt.trim();
      if (activeText.trim()) searchParams.text       = activeText.trim();

      const notifs = await notificationService.getNotifications(searchParams);
      const list = Array.isArray(notifs) ? notifs : [];

      setNotificationResults(list);
      saveToHistory({
        number: activeNum.trim(),
        year: activeYr.trim(),
        date: activeDt.trim(),
        lawStatute: activeLaw.trim(),
        section: activeSec.trim(),
        text: activeText.trim()
      }, list.length);
    } catch (err) {
      setError(err?.response?.data?.message || 'Search execution encountered an error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setNumber('');
    setYear('');
    setDate('');
    setSelectLaw('');
    setSection('');
    setText('');
    setNotificationResults(null);
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 animate-fade-in" onKeyDown={handleKeyDown}>
      {/* ── Page Title ───────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 tracking-tight">
        Notification Search
      </h1>

      {/* ── Main Two-Column Layout: Search Form on Left + Search History on Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5 items-start">
        
        {/* Left Column (9 cols): Search Form */}
        <div className="lg:col-span-9 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          
          <div className="bg-white dark:bg-gray-800 px-6 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Notification & SRO Search
            </span>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-5 py-1.5 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-sm font-semibold rounded transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          <div className="bg-[#a8cfe0] dark:bg-[#2b4c63] px-6 sm:px-8 py-6 transition-colors">
            
            {error && (
              <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Row 1: Enter Number · Enter Year · Select Date (3 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                className={inp}
                placeholder="Enter Number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
              <input
                className={inp}
                placeholder="Enter Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
              <div className="relative w-full">
                <input
                  className={`${inp} pr-8`}
                  placeholder="Select Date"
                  type="text"
                  onFocus={(e) => { e.target.type = 'date'; }}
                  onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Row 2: Select Law · Enter Section · Enter Text (3 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <SelectField
                value={selectLaw}
                onChange={(e) => setSelectLaw(e.target.value)}
                options={lawOptions}
                placeholder="Select Law"
              />
              <div className="w-full">
                <SearchableSectionSelect
                  value={section}
                  onChange={setSection}
                  options={sectionOptions}
                  placeholder="Section #"
                  inputSize="sm"
                />
              </div>
              <input
                className={inp}
                placeholder="Enter Text"
                value={text}
                onChange={(e) => setText(e.target.value)}
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
      {notificationResults !== null && (
        <div className="mt-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-gray-700 dark:text-gray-200">
                Notification Search Results
              </span>
            </div>

            <span className="px-2.5 py-1 bg-[#a8cfe0] text-[#1e3a5a] text-xs font-bold rounded-full">
              {notificationResults.length} Notification Record{notificationResults.length !== 1 ? 's' : ''} Found
            </span>
          </div>

          {notificationResults.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium">No Notifications found matching this search criteria.</p>
              <p className="text-xs text-gray-400 mt-1">Try searching with a broader keyword, notification number, SRO # or year.</p>
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
                    <th className="px-3 py-2.5 font-semibold">Number</th>
                    <th className="px-3 py-2.5 font-semibold">SRO #</th>
                    <th className="px-3 py-2.5 font-semibold">Dated</th>
                    <th className="px-3 py-2.5 font-semibold">Year</th>
                    <th className="px-3 py-2.5 font-semibold">Subject / Heading</th>
                    <th className="px-3 py-2.5 font-semibold">Law</th>
                    <th className="px-3 py-2.5 font-semibold">Section</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notificationResults.map((n, idx) => {
                    const rawDate = n.dated || n.date || '';
                    const displayDate = rawDate ? rawDate.slice(0, 10) : '—';
                    const sroNum = n.sroNumber || '—';
                    const sec = n.section || '—';

                    return (
                      <tr key={n.id || n._id || idx} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-3 py-2.5 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                          {n.number || n.srNumber || '—'}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-brand-orange whitespace-nowrap">
                          {sroNum}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {displayDate}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                          {n.year || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 max-w-[260px]">
                          <p className="line-clamp-2 font-medium">{n.subject || '—'}</p>
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 max-w-[160px] truncate">
                          {n.lawStatute || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap font-medium">
                          {sec}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setViewNotification(n)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-[11px] font-semibold rounded transition-colors cursor-pointer shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
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

      {/* ── Notification Details View Modal ─────────────────────────────── */}
      <Modal
        isOpen={Boolean(viewNotification)}
        onClose={() => setViewNotification(null)}
        title="Notification Details"
        subtitle={`Number: ${viewNotification?.number || viewNotification?.sroNumber || 'N/A'}`}
        icon={Bell}
      >
        {viewNotification && (
          <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Subject
              </span>
              <p className="font-bold text-gray-900 dark:text-white text-base">
                {viewNotification.subject || '—'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Number
                </span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {viewNotification.number || '—'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  SRO #
                </span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {viewNotification.sroNumber || '—'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Dated
                </span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {viewNotification.dated || viewNotification.date || '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Law / Statute
                </span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {viewNotification.lawStatute || '—'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Section
                </span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {viewNotification.section || '—'}
                </p>
              </div>
            </div>

            {Array.isArray(viewNotification.blocks) && viewNotification.blocks.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Notification Text & Blocks
                </h4>
                {viewNotification.blocks.map((b, bi) => (
                  <div key={bi} className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
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

export default NotificationSearchPage;
