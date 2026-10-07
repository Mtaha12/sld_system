import React, { useState, useEffect, useMemo } from 'react';
import { Eye, ExternalLink, Bell, AlertCircle, RotateCcw, FileText, Calendar } from 'lucide-react';
import { caseService } from '../features/cases/services/caseService';
import { notificationService } from '../features/notifications/services/notificationService';
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

const NotificationSearchPage = () => {
  // Search Form State
  const [number, setNumber] = useState('');
  const [year, setYear] = useState('');
  const [date, setDate] = useState('');
  const [selectLaw, setSelectLaw] = useState('');
  const [text, setText] = useState('');

  // Results State
  const [caseResults, setCaseResults] = useState(null);
  const [notificationResults, setNotificationResults] = useState(null);
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'notifications'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [viewNotification, setViewNotification] = useState(null);

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

  // Handle Search Submission
  const handleSearch = async () => {
    setError(null);

    const hasAny = Boolean(number.trim() || year.trim() || date.trim() || selectLaw.trim() || text.trim());
    if (!hasAny) {
      setError('Please fill in at least one field (Number, Year, Date, Law, or Text) to search.');
      return;
    }

    setLoading(true);
    setCaseResults(null);
    setNotificationResults(null);

    try {
      // 1. Search Cases matching the notification criteria
      const filters = {
        number: number.trim() || undefined,
        year: year.trim() || undefined,
        date: date.trim() || undefined,
        selectLaw: selectLaw.trim() || undefined,
        keywords: text.trim() || undefined,
      };

      const notifQueryStr = [number, year, date, selectLaw, text].filter(Boolean).join(' ');

      const [casesData, notifsData] = await Promise.allSettled([
        caseService.searchCases(filters),
        notificationService.getNotifications({
          query: notifQueryStr,
          limit: 50
        })
      ]);

      const cases = casesData.status === 'fulfilled' ? (casesData.value || []) : [];
      const notifs = notifsData.status === 'fulfilled' ? (notifsData.value || []) : [];

      setCaseResults(cases);
      setNotificationResults(notifs);
      setActiveTab('cases');
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
    setText('');
    setCaseResults(null);
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
      {/* ── Top Header: Title on Left & Search Button on Right ───────────── */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
          Notification Search
        </h1>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-5 py-1.5 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-sm font-semibold rounded transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* ── Card Container with Soft Cyan/Sky Blue Panel ─────────────────── */}
      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        
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

          {/* Row 2: Select Law · Enter Text (2 columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <SelectField
              value={selectLaw}
              onChange={(e) => setSelectLaw(e.target.value)}
              options={lawOptions}
              placeholder="Select Law"
            />
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

        </div>
      </div>

      {/* ── Search Results ──────────────────────────────────────────────── */}
      {(caseResults !== null || notificationResults !== null) && (
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
              {notificationResults && notificationResults.length > 0 && (
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeTab === 'notifications'
                      ? 'bg-[#3d4a7a] text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                  }`}
                >
                  Notification Records ({notificationResults.length})
                </button>
              )}
            </div>

            <span className="px-2.5 py-1 bg-[#a8cfe0] text-[#1e3a5a] text-xs font-bold rounded-full">
              {activeTab === 'cases'
                ? `${caseResults?.length || 0} Case${caseResults?.length !== 1 ? 's' : ''} Found`
                : `${notificationResults?.length || 0} Notification Record${notificationResults?.length !== 1 ? 's' : ''} Found`
              }
            </span>
          </div>

          {/* TAB 1: Cases View Table */}
          {activeTab === 'cases' && (
            <div>
              {(!caseResults || caseResults.length === 0) ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm font-medium">No legal cases found matching this notification search.</p>
                  <p className="text-xs text-gray-400 mt-1">Try searching with a broader keyword, notification number or law.</p>
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

          {/* TAB 2: Notification Records View */}
          {activeTab === 'notifications' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#3d4a7a] text-white">
                    <th className="px-3 py-2.5 font-semibold">SR #</th>
                    <th className="px-3 py-2.5 font-semibold">Number</th>
                    <th className="px-3 py-2.5 font-semibold">SRO #</th>
                    <th className="px-3 py-2.5 font-semibold">Year</th>
                    <th className="px-3 py-2.5 font-semibold">Subject / Heading</th>
                    <th className="px-3 py-2.5 font-semibold">Law Date</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notificationResults.map((n, idx) => (
                    <tr key={n.id || idx} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-200">
                        {n.srNumber || n.id}
                      </td>
                      <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {n.number || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-brand-orange font-semibold whitespace-nowrap">
                        {n.sroNumber || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {n.year || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 max-w-[280px]">
                        <p className="line-clamp-2">{n.subject || '—'}</p>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                        {n.lawDate || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => setViewNotification(n)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-[11px] font-semibold rounded transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> View Notification
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

      {/* ── Notification Details View Modal ─────────────────────────────── */}
      <Modal
        isOpen={Boolean(viewNotification)}
        onClose={() => setViewNotification(null)}
        title="Notification Details"
        subtitle={`SR #${viewNotification?.srNumber || viewNotification?.id} • Year ${viewNotification?.year}`}
        icon={Bell}
      >
        {viewNotification && (
          <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Number
                </span>
                <p className="font-bold text-gray-900 dark:text-white">
                  {viewNotification.number || '—'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  SRO Number
                </span>
                <p className="font-bold text-brand-orange">
                  {viewNotification.sroNumber || '—'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Year / Date
                </span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {viewNotification.year} {viewNotification.lawDate ? `• ${viewNotification.lawDate}` : ''}
                </p>
              </div>
            </div>

            {viewNotification.subject && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Subject / Heading
                </span>
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                  {viewNotification.subject}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Law / Statute
                </span>
                <p className="text-gray-800 dark:text-gray-200">
                  {viewNotification.lawStatute || '—'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Section
                </span>
                <p className="text-gray-800 dark:text-gray-200">
                  {viewNotification.section || '—'}
                </p>
              </div>
            </div>

            {Array.isArray(viewNotification.blocks) && viewNotification.blocks.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Notification Text & Details
                </h4>
                {viewNotification.blocks.map((b, bi) => (
                  <div key={bi} className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
                    {b.date && (
                      <p className="font-semibold text-gray-500 dark:text-gray-400 mb-1">Date: {b.date}</p>
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

export default NotificationSearchPage;
