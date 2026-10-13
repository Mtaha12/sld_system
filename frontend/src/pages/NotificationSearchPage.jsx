import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Bell, AlertCircle, RotateCcw, FileText, Calendar } from 'lucide-react';
import { notificationService } from '../features/notifications/services/notificationService';
import { settingService } from '../services/settingService';
import { LAW_OPTIONS } from '../data/laws';
import { ALL_SECTIONS } from '../data/sections';
import Modal from '../components/ui/Modal';

/* ── Shared form field styles ────────────────────────────────────────── */
const inp =
  'w-full bg-white dark:bg-[#1a2234] text-gray-800 dark:text-gray-100 placeholder-gray-400 text-sm px-3.5 py-2 rounded-lg ' +
  'border border-slate-200/90 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#3d4a7a]/50 h-[38px] shadow-2xs transition-all';

const sel =
  'w-full bg-white dark:bg-[#1a2234] text-gray-800 dark:text-gray-100 text-sm pl-3.5 pr-8 py-2 rounded-lg ' +
  'border border-slate-200/90 dark:border-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-[#3d4a7a]/50 h-[38px] shadow-2xs transition-all';

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
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8l4 4 4-4" />
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
  const [section, setSection] = useState('');
  const [text, setText] = useState('');
  const [sectionOptions, setSectionOptions] = useState(ALL_SECTIONS || []);

  // Results State
  const [notificationResults, setNotificationResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewNotification, setViewNotification] = useState(null);

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

    settingService.getSections({ status: 'active', limit: 10000 })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setSectionOptions(res.data.map(s => s.name));
        }
      })
      .catch(err => console.warn('Sections load warning:', err));

    return () => { isMounted = false; };
  }, []);

  // Handle Search Submission
  const handleSearch = async () => {
    setError(null);

    const hasAny = Boolean(number.trim() || year.trim() || date.trim() || selectLaw.trim() || section.trim() || text.trim());
    if (!hasAny) {
      setError('Please fill in at least one field (Number, Year, Date, Law, Section, or Text) to search.');
      return;
    }

    setLoading(true);
    setNotificationResults(null);

    try {
      const searchParams = { limit: 100 };
      if (selectLaw.trim()) searchParams.lawStatute = selectLaw.trim();
      if (section.trim()) searchParams.section = section.trim();
      if (number.trim()) searchParams.number = number.trim();
      if (year.trim()) searchParams.year = year.trim();
      if (date.trim()) searchParams.date = date.trim();
      if (text.trim()) searchParams.text = text.trim();

      const notifs = await notificationService.getNotifications(searchParams);

      setNotificationResults(Array.isArray(notifs) ? notifs : []);
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

          {/* Row 2: Select Law · Enter Section · Enter Text (3 columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SelectField
              value={selectLaw}
              onChange={(e) => setSelectLaw(e.target.value)}
              options={lawOptions}
              placeholder="Select Law"
            />
            <div className="w-full">
              <input
                className={inp}
                placeholder="Enter Section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                list="notification-search-sections-list"
              />
              <datalist id="notification-search-sections-list">
                {sectionOptions.map((secName, idx) => (
                  <option key={idx} value={secName} />
                ))}
              </datalist>
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
      {/* ── Search Results: Notifications Only ───────────────────────── */}
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
                    <th className="px-3 py-2.5 font-semibold">SR #</th>
                    <th className="px-3 py-2.5 font-semibold">Number</th>
                    <th className="px-3 py-2.5 font-semibold">SRO #</th>
                    <th className="px-3 py-2.5 font-semibold">Year</th>
                    <th className="px-3 py-2.5 font-semibold">Subject / Heading</th>
                    <th className="px-3 py-2.5 font-semibold">Law Date</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Attachment</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notificationResults.map((n, idx) => {
                    const hasAtt = (Array.isArray(n.attachments) && n.attachments.length > 0) ||
                                   Boolean(n.attachment) ||
                                   Boolean(n.attachmentName) ||
                                   (Array.isArray(n.blocks) && n.blocks.some(b => Array.isArray(b?.attachments) ? b.attachments.length > 0 : Boolean(b?.attachment)));

                    return (
                      <tr key={n.id || idx} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-3 py-2.5 text-gray-400">{idx + 1}</td>
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
                          {hasAtt ? (
                            <button
                              type="button"
                              onClick={() => setViewNotification(n)}
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
                            href={`/notifications/view/${n.mongoId || n._id || n.id || n.notificationId || n.srNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white text-[11px] font-semibold rounded transition-colors cursor-pointer shadow-xs"
                          >
                            <Eye className="w-3 h-3" /> View Notification
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
                      b.detail.includes('<') && b.detail.includes('>') ? (
                        <div dangerouslySetInnerHTML={{ __html: b.detail }} className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed text-xs" />
                      ) : (
                        <p className="whitespace-pre-line text-gray-700 dark:text-gray-300 leading-relaxed">{b.detail}</p>
                      )
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
                            <FileText className="w-3 h-3" />
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
