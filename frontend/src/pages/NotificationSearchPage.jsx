import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Eye, Bell, AlertCircle, RotateCcw, FileText, Calendar, History, Trash2, Clock, 
  Printer, ExternalLink, Download 
} from 'lucide-react';
import { notificationService } from '../features/notifications/services/notificationService';
import Modal from '../components/ui/Modal';
import { formatWordDocumentDisplay } from '../utils/wordFormatter';
import { downloadOrViewAttachment, getAttachmentDisplayName } from '../utils/attachmentDownloader';

/* ── Shared form field styles ────────────────────────────────────────── */
const inp =
  'w-full bg-white dark:bg-[#1a2234] text-gray-800 dark:text-gray-100 placeholder-gray-400 text-sm px-3.5 py-2 rounded-lg ' +
  'border border-slate-200/90 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#3d4a7a]/50 h-[38px] shadow-2xs transition-all';

const HISTORY_KEY = 'sld_notification_search_history_v1';

const escapeRegex = (string) => String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const cleanSnippetText = (html) => {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractRelevantNotificationSnippet = (notification, term1, term2) => {
  const candidates = [];
  if (Array.isArray(notification?.blocks)) {
    notification.blocks.forEach(b => {
      if (b?.detail) candidates.push(b.detail);
    });
  }
  if (notification?.content) candidates.push(notification.content);
  if (notification?.text) candidates.push(notification.text);
  if (notification?.subject) candidates.push(notification.subject);

  const searchTerms = [term1, term2]
    .filter(t => t && t.trim())
    .map(t => t.trim().toLowerCase());

  // If terms searched, look for first matching candidate
  if (searchTerms.length > 0) {
    for (const c of candidates) {
      const raw = cleanSnippetText(c);
      const lower = raw.toLowerCase();
      for (const term of searchTerms) {
        const idx = lower.indexOf(term);
        if (idx !== -1) {
          const start = Math.max(0, idx - 60);
          const end = Math.min(raw.length, idx + term.length + 140);
          return (start > 0 ? '…' : '') + raw.slice(start, end) + (end < raw.length ? '…' : '');
        }
      }
    }
  }

  // Fallback to first available candidate text
  if (candidates.length > 0) {
    const raw = cleanSnippetText(candidates[0]);
    return raw.slice(0, 180) + (raw.length > 180 ? '…' : '');
  }
  return '—';
};

const renderHighlightedText = (snippet, term1, term2) => {
  if (!snippet || snippet === '—') return '—';
  const terms = [term1, term2]
    .filter(t => t && t.trim())
    .map(t => t.trim());

  if (terms.length === 0) return snippet;

  const escaped = terms.map(escapeRegex).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = snippet.split(regex);

  return parts.map((part, i) => {
    if (terms.some(t => t.toLowerCase() === part.toLowerCase())) {
      return (
        <mark key={i} className="bg-amber-200 dark:bg-amber-500/40 text-stone-900 dark:text-stone-100 font-bold px-0.5 rounded">
          {part}
        </mark>
      );
    }
    return part;
  });
};

const NotificationSearchPage = () => {
  // Search Form State (Law and Section removed as requested in SS2; 2 text inputs added)
  const [number, setNumber] = useState('');
  const [year, setYear]     = useState('');
  const [date, setDate]     = useState('');
  const [text, setText]     = useState('');
  const [text2, setText2]   = useState('');

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

  // Auto-search if URL parameters are passed
  useEffect(() => {
    const numQ = urlSearchParams.get('number');
    const txtQ = urlSearchParams.get('query') || urlSearchParams.get('text');
    const txt2Q = urlSearchParams.get('text2');
    const yrQ = urlSearchParams.get('year');
    if (numQ || txtQ || txt2Q || yrQ) {
      if (numQ) setNumber(numQ);
      if (txtQ) setText(txtQ);
      if (txt2Q) setText2(txt2Q);
      if (yrQ) setYear(yrQ);

      setLoading(true);
      setError(null);
      notificationService.getNotifications({
        limit: 100,
        ...(numQ ? { number: numQ } : {}),
        ...(txtQ ? { text: txtQ } : {}),
        ...(txt2Q ? { text2: txt2Q } : {}),
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

  // Save query to localStorage search history
  const saveToHistory = useCallback((params, count) => {
    const parts = [];
    if (params.number) parts.push(`No. ${params.number}`);
    if (params.year) parts.push(`Year ${params.year}`);
    if (params.date) parts.push(`Date: ${params.date}`);
    if (params.text) parts.push(`"${params.text}"`);
    if (params.text2) parts.push(`"${params.text2}"`);

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
    setText(f.text || '');
    setText2(f.text2 || '');
    handleSearch({
      number: f.number || '',
      year: f.year || '',
      date: f.date || '',
      text: f.text || '',
      text2: f.text2 || ''
    });
  };

  // Handle Search Submission
  const handleSearch = async (overrideParams = null) => {
    setError(null);

    const activeNum   = overrideParams ? (overrideParams.number || '') : number;
    const activeYr    = overrideParams ? (overrideParams.year || '') : year;
    const activeDt    = overrideParams ? (overrideParams.date || '') : date;
    const activeText  = overrideParams ? (overrideParams.text || '') : text;
    const activeText2 = overrideParams ? (overrideParams.text2 || '') : text2;

    const hasAny = Boolean(activeNum.trim() || activeYr.trim() || activeDt.trim() || activeText.trim() || activeText2.trim());
    if (!hasAny) {
      setError('Please fill in at least one field (Number, Year, Date, or Text) to search.');
      return;
    }

    setLoading(true);
    setNotificationResults(null);

    try {
      const searchParams = { limit: 100 };
      if (activeNum.trim())   searchParams.number = activeNum.trim();
      if (activeYr.trim())    searchParams.year   = activeYr.trim();
      if (activeDt.trim())    searchParams.date   = activeDt.trim();
      if (activeText.trim())  searchParams.text   = activeText.trim();
      if (activeText2.trim()) searchParams.text2  = activeText2.trim();

      const notifs = await notificationService.getNotifications(searchParams);
      const list = Array.isArray(notifs) ? notifs : [];

      setNotificationResults(list);
      saveToHistory({
        number: activeNum.trim(),
        year: activeYr.trim(),
        date: activeDt.trim(),
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
    setNumber('');
    setYear('');
    setDate('');
    setText('');
    setText2('');
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

            {/* Row 2: Two Text Search Boxes (Law & Section removed as requested in SS2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                onClick={handleClearHistory}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Clear Search History"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                <Clock className="w-8 h-8 mb-2 stroke-1 text-gray-300 dark:text-gray-600" />
                <p className="text-xs">No recent searches</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectHistory(item)}
                  className="p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-700/20 hover:border-[#3d4a7a]/40 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-all text-xs group"
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#3d4a7a] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
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
                    {/* Law & Section columns removed; Relevant SRO Content added (SS2) */}
                    <th className="px-3 py-2.5 font-semibold">Relevant SRO Content</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notificationResults.map((n, idx) => {
                    const rawDate = n.dated || n.date || '';
                    const displayDate = rawDate ? rawDate.slice(0, 10) : '—';
                    const sroNum = n.sroNumber || '—';
                    const snippet = extractRelevantNotificationSnippet(n, text, text2);

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
                        <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 max-w-[220px]">
                          <p className="line-clamp-2 font-medium">{n.subject || '—'}</p>
                        </td>
                        <td className="px-3 py-2.5 text-stone-700 dark:text-stone-300 max-w-[340px]">
                          <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-700/60 text-[11px] leading-relaxed line-clamp-3 font-serif">
                            {renderHighlightedText(snippet, text, text2)}
                          </div>
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

      {/* ── Notification Details View Modal (SS3 updates) ───────────────── */}
      <Modal
        isOpen={Boolean(viewNotification)}
        onClose={() => setViewNotification(null)}
        title="Notification Details"
        subtitle={`SRO: ${viewNotification?.sroNumber || viewNotification?.number || 'Official Record'}`}
        icon={Bell}
        maxWidth="max-w-3xl"
        footer={
          viewNotification && (
            <div className="flex items-center justify-between w-full gap-2">
              <a
                href={`/notifications/view/${viewNotification._id || viewNotification.id || viewNotification.notificationId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#3d4a7a] text-[#3d4a7a] dark:text-blue-400 hover:bg-[#3d4a7a] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full View</span>
              </a>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printUrl = `/notifications/view/${viewNotification._id || viewNotification.id || viewNotification.notificationId}`;
                    window.open(printUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#f15a24] hover:bg-[#d94817] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewNotification(null)}
                  className="px-4 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )
        }
      >
        {viewNotification && (
          <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            {/* Subject Card */}
            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Subject / Heading
              </span>
              <p className="font-bold text-gray-900 dark:text-white text-base leading-snug">
                {viewNotification.subject || '—'}
              </p>
            </div>

            {/* SRO # Block ONLY (Number, Date, Law, Section removed as requested in SS3) */}
            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                SRO #
              </span>
              <p className="font-semibold text-brand-orange text-sm leading-relaxed whitespace-pre-line">
                {viewNotification.sroNumber || viewNotification.number || '—'}
              </p>
            </div>

            {/* Notification Text & Blocks */}
            {Array.isArray(viewNotification.blocks) && viewNotification.blocks.length > 0 && (
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Notification Text & Blocks
                </h4>
                {viewNotification.blocks.map((b, bi) => (
                  <div key={bi} className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                    {b.detail && (
                      <div 
                        dangerouslySetInnerHTML={{ __html: formatWordDocumentDisplay(b.detail) }} 
                        className="word-document-content text-gray-800 dark:text-gray-200 leading-relaxed font-serif text-xs" 
                      />
                    )}
                    {Array.isArray(b.attachments) && b.attachments.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
                        {b.attachments.map((att, ai) => {
                          const attName = getAttachmentDisplayName(att);
                          return (
                            <button 
                              key={ai}
                              type="button"
                              onClick={() => downloadOrViewAttachment(att)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-amber-500/30"
                              title={`Open ${attName} in new tab`}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{attName}</span>
                            </button>
                          );
                        })}
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
