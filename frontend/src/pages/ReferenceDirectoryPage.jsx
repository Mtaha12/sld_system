import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, X, BookOpen, Layers, Type, Bookmark, Scale, ChevronLeft, ChevronRight, ArrowLeft, Eye, Calculator } from 'lucide-react';
import { settingService } from '../services/settingService';
import { openReferenceView } from '../utils/referenceViewUtil';

const CATEGORIES = [
  { key: 'articles', label: 'ARTICLES', count: '1,544', icon: BookOpen },
  { key: 'topics', label: 'TOPICS', count: '403', icon: Layers },
  { key: 'words-phrases', label: 'WORDS & PHRASES', count: '282', icon: Type },
  { key: 'legal-terms', label: 'LEGAL TERMS', count: '96', icon: Bookmark },
  { key: 'maxims', label: 'MAXIMS', count: '1,124', icon: Scale },
];

const PAGE_SIZE = 50;

const ReferenceDirectoryPage = () => {
  const { category = 'articles' } = useParams();
  const navigate = useNavigate();

  const activeCategory = useMemo(() => {
    const valid = CATEGORIES.some(c => c.key === category);
    return valid ? category : 'articles';
  }, [category]);

  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchData = useCallback(async (catKey, pageNum, searchTerm) => {
    setLoading(true);
    setError(null);
    try {
      let res;
      const params = { page: pageNum, limit: PAGE_SIZE, search: searchTerm };
      switch (catKey) {
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
    setPage(1);
    setSearch('');
  }, [activeCategory]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchData(activeCategory, page, search);
    }, 150);
    return () => clearTimeout(timeout);
  }, [activeCategory, page, search, fetchData]);

  const handleSelectTab = (key) => {
    navigate(`/reference/${key}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeConfig = CATEGORIES.find(c => c.key === activeCategory) || CATEGORIES[0];

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 animate-fade-in flex flex-col gap-4">
      {/* ── Top Bar with Back Link & Title ───────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.close()}
            className="p-1.5 rounded-lg border border-theme-border text-theme-muted hover:text-theme-main hover:bg-theme-surface transition-colors cursor-pointer text-xs flex items-center gap-1"
            title="Close this tab"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Close Tab</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              SLD Legal Reference Library
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Complete Official Directory • {activeConfig.label} ({total} entries)
            </p>
          </div>
        </div>
      </div>

      {/* ── 5 Category Tabs Strip (Matches design in user screenshot) ───── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 px-3 py-1 flex items-center overflow-x-auto scrollbar-none gap-1 sm:gap-2">
        {CATEGORIES.map((cat, idx) => {
          const isActive = activeCategory === cat.key;
          return (
            <React.Fragment key={cat.key}>
              <button
                type="button"
                onClick={() => handleSelectTab(cat.key)}
                className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-extrabold tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border-b-2 ${
                  isActive
                    ? 'text-emerald-800 dark:text-emerald-400 border-emerald-600 dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40'
                    : 'text-gray-600 dark:text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-300 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono shadow-2xs ${
                  isActive
                    ? 'bg-emerald-200 text-emerald-950 dark:bg-emerald-800 dark:text-emerald-100'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {cat.count}
                </span>
              </button>
              {idx < CATEGORIES.length - 1 && (
                <span className="text-gray-300 dark:text-gray-600 font-light select-none">|</span>
              )}
            </React.Fragment>
          );
        })}

        {/* Tax Calculator Button - Positioned next to MAXIMS */}
        <span className="text-gray-300 dark:text-gray-600 font-light select-none">|</span>
        <a
          href="https://pakistan-tax-calculator-mmca.ai.studio/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-emerald-500/20 active:scale-95 shrink-0 border border-emerald-400/30 cursor-pointer ml-auto"
          title="Open Pakistan Tax Calculator in New Tab"
        >
          <Calculator className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
          <span className="whitespace-nowrap">Tax Calculator</span>
        </a>
      </div>

      {/* ── Main Catalog Container ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        
        {/* Search Toolbar */}
        <div className="px-5 py-3.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={`Search ${activeConfig.label.toLowerCase()}...`}
              className="w-full bg-white dark:bg-[#1a2234] text-gray-800 dark:text-gray-100 placeholder-gray-400 text-xs sm:text-sm pl-9 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/40 h-[38px] shadow-2xs"
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

          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Showing <strong className="text-gray-800 dark:text-gray-200">{data.length}</strong> of{' '}
            <strong className="text-gray-800 dark:text-gray-200">{total}</strong> records
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[460px]">
          {loading ? (
            <div className="py-24 text-center text-gray-400 dark:text-gray-500">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Loading records...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-red-500 text-sm">
              <p>{error}</p>
              <button
                onClick={() => fetchData(activeCategory, page, search)}
                className="mt-3 text-xs text-emerald-600 underline font-semibold"
              >
                Retry
              </button>
            </div>
          ) : data.length === 0 ? (
            <div className="py-20 text-center text-gray-400 dark:text-gray-500">
              <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium">No records found matching your search.</p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mt-2 text-xs text-emerald-600 hover:underline font-semibold"
                >
                  Clear search keyword
                </button>
              )}
            </div>
          ) : activeCategory === 'articles' ? (
            /* ── ARTICLES TABLE (Columns: Year, Title, Author, View) ── */
            <table className="w-full text-xs text-left">
              <thead className="bg-[#3d4a7a] text-white">
                <tr>
                  <th className="px-3 py-3 font-semibold w-14 text-center">#</th>
                  <th className="px-4 py-3 font-semibold w-24 text-center whitespace-nowrap">Year</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold w-72">Author</th>
                  <th className="px-4 py-3 font-semibold w-24 text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {data.map((item, idx) => (
                  <tr key={item._id || item.id || idx} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-3 py-3 text-center text-gray-400 font-mono">
                      {item.srNumber || (page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-brand-orange whitespace-nowrap">
                      {item.year || '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100 leading-relaxed">
                      {item.title}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">
                      {item.author || '—'}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {item.viewData ? (
                        <button
                          type="button"
                          onClick={() => openReferenceView(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900 transition-all shadow-2xs hover:scale-105 cursor-pointer"
                          title="Click to open attachment / link / text in new tab"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* ── TABLE FOR TOPICS, WORDS & PHRASES, LEGAL TERMS, MAXIMS (With View Column) ── */
            <table className="w-full text-xs text-left">
              <thead className="bg-[#3d4a7a] text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold w-20 text-center">Sr. No</th>
                  <th className="px-4 py-3 font-semibold">
                    {activeCategory === 'topics'
                      ? 'Topic / Heading'
                      : activeCategory === 'words-phrases'
                      ? 'Word & Phrase'
                      : activeCategory === 'legal-terms'
                      ? 'Legal Term'
                      : 'Legal Maxim'}
                  </th>
                  {activeCategory === 'maxims' && (
                    <th className="px-4 py-3 font-semibold">Meaning</th>
                  )}
                  <th className="px-4 py-3 font-semibold w-24 text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {data.map((item, idx) => (
                  <tr key={item._id || item.id || idx} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-3 text-center font-bold text-gray-500 dark:text-gray-400 font-mono">
                      {item.srNumber || (page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 leading-relaxed font-semibold">
                      {item.heading || item.name || '—'}
                    </td>
                    {activeCategory === 'maxims' && (
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 leading-relaxed">
                        {item.meaning || '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {item.viewData ? (
                        <button
                          type="button"
                          onClick={() => openReferenceView(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900 transition-all shadow-2xs hover:scale-105 cursor-pointer"
                          title="Click to open attachment / link / text in new tab"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
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
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReferenceDirectoryPage;
