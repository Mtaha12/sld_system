import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Search, RotateCcw, BookOpen, Layers, Type, Bookmark, Scale, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import settingService from '../../../services/settingService';

const TAB_CONFIG = [
  { key: 'articles', label: 'ARTICLES', count: 1544, icon: BookOpen },
  { key: 'topics', label: 'TOPICS', count: 403, icon: Layers },
  { key: 'words-phrases', label: 'WORDS & PHRASES', count: 282, icon: Type },
  { key: 'legal-terms', label: 'LEGAL TERMS', count: 96, icon: Bookmark },
  { key: 'maxims', label: 'MAXIMS', count: 1124, icon: Scale },
];

const PAGE_SIZE = 25;

const LegalReferenceModal = ({ isOpen, onClose, initialTab = 'articles' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [data, setData]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      setPage(1);
      setSearch('');
    }
  }, [initialTab, isOpen]);

  const fetchData = useCallback(async (tabKey, pageNum, searchTerm) => {
    setLoading(true);
    setError(null);
    try {
      let res;
      const params = { page: pageNum, limit: PAGE_SIZE, search: searchTerm };
      switch (tabKey) {
        case 'articles':
          res = await settingService.getArticles(params);
          break;
        case 'topics':
          res = await settingService.getTopics(params);
          break;
        case 'words-phrases':
          res = await settingService.getWordsPhrases(params);
          break;
        case 'legal-terms':
          res = await settingService.getLegalTerms(params);
          break;
        case 'maxims':
          res = await settingService.getLegalMaxims(params);
          break;
        default:
          res = { data: [], total: 0 };
      }
      setData(res?.data || []);
      setTotal(res?.total || 0);
    } catch (err) {
      console.error('Failed to load legal reference data:', err);
      setError('Could not load records from server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      fetchData(activeTab, page, search);
    }, 150);
    return () => clearTimeout(timeout);
  }, [isOpen, activeTab, page, search, fetchData]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearch('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-5xl h-[88vh] max-h-[820px] flex flex-col overflow-hidden animate-scale-in">
        
        {/* ── Modal Top Header ─────────────────────────────────────────────── */}
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3d4a7a] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              SLD
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                Legal Reference Library
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Official Directory of Articles, Topics, Words & Phrases, Legal Terms, and Maxims
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            title="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 5 Tabs Strip: Matches image styling with green active line ──── */}
        <div className="flex items-center overflow-x-auto border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 scrollbar-none">
          {TAB_CONFIG.map((t, idx) => {
            const isActive = activeTab === t.key;
            return (
              <React.Fragment key={t.key}>
                <button
                  type="button"
                  onClick={() => handleTabChange(t.key)}
                  className={`px-4 py-3 text-xs sm:text-sm font-bold tracking-wider transition-all whitespace-nowrap cursor-pointer relative flex items-center gap-2 ${
                    isActive
                      ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-500'
                      : 'text-gray-600 dark:text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                  }`}
                >
                  <span>{t.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {t.count}
                  </span>
                </button>
                {idx < TAB_CONFIG.length - 1 && (
                  <span className="text-gray-300 dark:text-gray-600 px-1 font-light select-none">|</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Search & Filter Bar ─────────────────────────────────────────── */}
        <div className="px-5 py-3 bg-gray-50/70 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={`Search in ${TAB_CONFIG.find(t => t.key === activeTab)?.label.toLowerCase()}...`}
              className="w-full bg-white dark:bg-[#1a2234] text-gray-800 dark:text-gray-100 placeholder-gray-400 text-xs sm:text-sm pl-9 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/40 h-[36px]"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
            Showing <strong className="text-gray-800 dark:text-gray-200">{data.length}</strong> of{' '}
            <strong className="text-gray-800 dark:text-gray-200">{total}</strong> records
          </div>
        </div>

        {/* ── Table Content Area ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-24 text-center text-gray-400 dark:text-gray-500">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Loading records...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-red-500 text-sm">
              <p>{error}</p>
              <button
                onClick={() => fetchData(activeTab, page, search)}
                className="mt-3 text-xs text-emerald-600 underline font-semibold"
              >
                Retry
              </button>
            </div>
          ) : data.length === 0 ? (
            <div className="py-20 text-center text-gray-400 dark:text-gray-500">
              <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium">No entries found matching your search.</p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mt-2 text-xs text-emerald-600 hover:underline font-semibold"
                >
                  Clear search keyword
                </button>
              )}
            </div>
          ) : activeTab === 'articles' ? (
            /* ── ARTICLES TABLE (3 COLUMNS: Year, Title, Author) ── */
            <table className="w-full text-xs text-left">
              <thead className="bg-[#3d4a7a] text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 font-semibold w-12 text-center">#</th>
                  <th className="px-3 py-2.5 font-semibold w-24 text-center">Year</th>
                  <th className="px-4 py-2.5 font-semibold">Title</th>
                  <th className="px-4 py-2.5 font-semibold min-w-[200px] w-64">Author</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {data.map((item, idx) => (
                  <tr key={item._id || item.id || idx} className="hover:bg-blue-50/40 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-3 py-2.5 text-center text-gray-400 font-mono">
                      {item.srNumber || (page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-brand-orange whitespace-nowrap">
                      {item.year || '—'}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100 leading-snug">
                      {item.title}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                      {item.author || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* ── 2 COLUMNS TABLE FOR TOPICS, WORDS & PHRASES, LEGAL TERMS, MAXIMS ── */
            <table className="w-full text-xs text-left">
              <thead className="bg-[#3d4a7a] text-white sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5 font-semibold w-16 text-center">Sr. No</th>
                  <th className="px-4 py-2.5 font-semibold">
                    {activeTab === 'topics'
                      ? 'Topic / Heading'
                      : activeTab === 'words-phrases'
                      ? 'Word & Phrase'
                      : activeTab === 'legal-terms'
                      ? 'Legal Term'
                      : 'Legal Maxim'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {data.map((item, idx) => (
                  <tr key={item._id || item.id || idx} className="hover:bg-blue-50/40 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-2.5 text-center font-bold text-gray-500 dark:text-gray-400 font-mono">
                      {item.srNumber || (page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100 leading-snug font-medium">
                      {item.heading || item.name || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination Footer ───────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between text-xs">
          <div className="text-gray-500 dark:text-gray-400">
            Page <strong className="text-gray-800 dark:text-gray-200">{page}</strong> of{' '}
            <strong className="text-gray-800 dark:text-gray-200">{totalPages}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LegalReferenceModal;
