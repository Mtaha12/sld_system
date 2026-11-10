import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Search,
  Calendar,
  ExternalLink,
  Download,
  FileText,
  LayoutGrid,
  Table2,
  BookOpen,
  RotateCcw,
  Sparkles,
  Tag
} from 'lucide-react';
import { newsletterService } from '../features/newsletters/services/newsletterService';
import Pagination from '../components/ui/Pagination';
import SquareLoader from '../components/ui/SquareLoader';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import {
  formatNewsletterDate,
  detectTopicBadge,
  getNewsletterLinkRows,
  openNewsletterLink
} from '../features/newsletters/utils/newsletterLinks';

const TOPIC_FILTERS = [
  'All',
  'Income Tax',
  'Sales Tax',
  'Customs',
  'Federal Excise',
  'Banking',
  'Corporate',
  'Civil',
  'Criminal',
  'Labour',
  'News Updates'
];

const ClientEmailsPage = () => {
  const [newsletters, setNewsletters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    newsletterService
      .getNewsletters()
      .then((data) => {
        if (mounted) {
          setNewsletters(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.error('[ClientEmailsPage] Fetch error:', err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Pre-extract structured link rows once cleanly per dataset
  const enrichedDigests = useMemo(() => {
    return newsletters.map((nl) => ({
      ...nl,
      _linkRows: getNewsletterLinkRows(nl),
      _displayDate: formatNewsletterDate(nl.date)
    }));
  }, [newsletters]);

  // Aggregate live stats
  const totalLinkCount = useMemo(
    () => enrichedDigests.reduce((acc, d) => acc + d._linkRows.length, 0),
    [enrichedDigests]
  );

  const latestDigestDate = enrichedDigests[0]?._displayDate || '—';

  // Filter digests & individual rows by keyword and topic filter
  const filteredDigests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const topicLower = selectedTopic.toLowerCase();

    return enrichedDigests
      .map((digest) => {
        const digestMatchesMeta =
          q &&
          (String(digest.subject || '').toLowerCase().includes(q) ||
            String(digest._displayDate || '').toLowerCase().includes(q) ||
            String(digest.date || '').toLowerCase().includes(q) ||
            String(digest.srNumber || '').toLowerCase().includes(q));

        const matchingRows = digest._linkRows.filter((row) => {
          const badge = detectTopicBadge(row.heading);
          const topicOk = selectedTopic === 'All' || badge.label.toLowerCase() === topicLower;
          if (!topicOk) return false;
          if (!q || digestMatchesMeta) return true;
          return (
            String(row.heading || '').toLowerCase().includes(q) ||
            String(row.link || '').toLowerCase().includes(q) ||
            badge.label.toLowerCase().includes(q)
          );
        });

        // Include digest if it has matching rows OR if 'All' topic selected and metadata matched
        if (matchingRows.length > 0) {
          return { ...digest, _visibleRows: matchingRows };
        }
        if (selectedTopic === 'All' && (!q || digestMatchesMeta) && digest._linkRows.length === 0) {
          return { ...digest, _visibleRows: [] };
        }
        return null;
      })
      .filter(Boolean);
  }, [enrichedDigests, searchQuery, selectedTopic]);

  const totalItems = filteredDigests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedDigests = filteredDigests.slice(startIndex, startIndex + itemsPerPage);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTopic('All');
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col w-full animate-fade-in gap-4 pb-10">
      {/* ── Premium Hero Header ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e293b] via-[#2b3a67] to-[#3d4a7a] text-white shadow-md border border-slate-700/40 p-5 sm:p-6">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-orange-200">
              <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
              <span>SLD Official Email Digest Archive</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Daily Legal Email Updates & Case Law PDFs
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-2xl">
              Browse daily curated tax, corporate, banking, customs, and high court judgments by date and practice area. Click any heading or link to open its PDF immediately.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs text-center">
              <div className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Digests</div>
              <div className="text-lg sm:text-xl font-extrabold text-white mt-0.5">{enrichedDigests.length.toLocaleString()}</div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs text-center">
              <div className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">PDF Links</div>
              <div className="text-lg sm:text-xl font-extrabold text-orange-300 mt-0.5">{totalLinkCount.toLocaleString()}</div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs text-center">
              <div className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Latest</div>
              <div className="text-xs sm:text-sm font-bold text-emerald-300 mt-1.5 whitespace-nowrap">{latestDigestDate}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search, Topic Filter Pills & Layout Switcher ────────────── */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-xs p-3.5 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[230px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by topic, case law email #, date (e.g. 22/06/2026), or heading..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-theme-surface-alt border border-theme-border rounded-lg text-xs sm:text-sm text-theme-main focus:outline-none focus:border-brand-orange transition-colors"
            />
          </div>

          {(searchQuery || selectedTopic !== 'All') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-theme-border hover:bg-gray-100 dark:hover:bg-theme-surface-hover rounded-lg text-xs font-semibold text-theme-main cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}

          {/* Card / Table Switcher */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-theme-surface-alt p-1 rounded-lg border border-theme-border">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                viewMode === 'cards'
                  ? 'bg-[#3d4a7a] text-white shadow-xs'
                  : 'text-theme-muted hover:text-theme-main'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Digest Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#3d4a7a] text-white shadow-xs'
                  : 'text-theme-muted hover:text-theme-main'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" /> Structured List
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-theme-muted">
            <span>Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 bg-theme-surface border border-theme-border rounded-lg text-xs font-semibold text-theme-main focus:outline-none focus:border-brand-orange"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Practice Area Topic Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-theme-muted mr-1">
            <Tag className="w-3 h-3 text-brand-orange" /> Topics:
          </span>
          {TOPIC_FILTERS.map((topic) => {
            const active = selectedTopic === topic;
            return (
              <button
                key={topic}
                type="button"
                onClick={() => {
                  setSelectedTopic(topic);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                  active
                    ? 'bg-brand-orange text-white border-brand-orange shadow-xs'
                    : 'bg-slate-50 dark:bg-theme-surface-alt text-slate-700 dark:text-gray-300 border-slate-200 dark:border-theme-border hover:border-brand-orange/60'
                }`}
              >
                {topic}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Content Area ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl py-16 flex flex-col items-center justify-center gap-3 shadow-xs">
          <SquareLoader />
          <span className="text-xs font-semibold text-theme-muted">Loading Email Digest Archive...</span>
        </div>
      ) : paginatedDigests.length === 0 ? (
        <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl py-16 text-center shadow-xs">
          <Mail className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-theme-main">No email digests match your current filter</p>
          <p className="text-xs text-theme-muted mt-1">Try clearing your search keyword or selecting &ldquo;All&rdquo; topics.</p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 px-4 py-1.5 bg-[#3d4a7a] text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-[#2e3a6a]"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="space-y-4">
          {paginatedDigests.map((digest) => {
            const nlId = digest.mongoId || digest.id || digest.newsletterId;
            return (
              <section
                key={nlId}
                className="bg-white dark:bg-theme-surface border border-theme-border rounded-2xl shadow-xs hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Digest Header Banner */}
                <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-slate-50 via-blue-50/40 to-orange-50/30 dark:from-theme-surface-alt/70 dark:to-theme-surface-alt/40 border-b border-theme-border flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#3d4a7a] text-white text-xs font-extrabold tracking-wide shadow-2xs">
                      SR #{digest.srNumber || digest.id}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-theme-surface border border-slate-200 dark:border-theme-border text-xs font-bold text-slate-800 dark:text-gray-200 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-brand-orange" />
                      {digest._displayDate}
                    </span>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {digest.subject || 'CASE LAWS & NEWS Updates'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 text-xs font-bold border border-orange-200/80 dark:border-orange-800">
                      {digest._visibleRows.length} Document{digest._visibleRows.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <a
                    href={`/newsletters/view/${digest.srNumber || nlId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white dark:bg-theme-surface border border-slate-300 dark:border-theme-border hover:border-[#3d4a7a] hover:text-[#3d4a7a] text-xs font-bold text-slate-700 dark:text-gray-200 transition-colors shadow-2xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-brand-orange" />
                    <span>Read Full Summary</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                </div>

                {/* Digest Rows List */}
                {digest._visibleRows.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-theme-border">
                    {digest._visibleRows.map((row, rIdx) => {
                      const topic = detectTopicBadge(row.heading);
                      return (
                        <div
                          key={rIdx}
                          className="px-4 sm:px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-blue-50/40 dark:hover:bg-theme-surface-hover/40 transition-colors"
                        >
                          <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                            <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-theme-surface-alt text-slate-500 dark:text-slate-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                              {rIdx + 1}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border shrink-0 whitespace-nowrap ${topic.cls}`}>
                              {topic.label}
                            </span>
                            {row.link ? (
                              <a
                                href={row.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openNewsletterLink(row.link, row.heading, { download: false });
                                }}
                                className="text-[13px] sm:text-sm font-bold text-slate-800 dark:text-gray-100 hover:text-brand-orange transition-colors leading-snug break-words"
                              >
                                {row.heading}
                              </a>
                            ) : (
                              <span className="text-[13px] sm:text-sm font-semibold text-slate-700 dark:text-gray-200 leading-snug">
                                {row.heading}
                              </span>
                            )}
                          </div>

                          {row.link && (
                            <div className="flex items-center gap-1.5 shrink-0 pl-8 sm:pl-0">
                              <a
                                href={row.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openNewsletterLink(row.link, row.heading, { download: false });
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f15a24] hover:bg-orange-600 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                                title="Open document in new tab"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Open PDF</span>
                                <ExternalLink className="w-3 h-3 opacity-85" />
                              </a>
                              <a
                                href={row.link}
                                download={row.attachmentName || row.heading || 'document.pdf'}
                                onClick={(e) => {
                                  e.preventDefault();
                                  openNewsletterLink(row.link, row.attachmentName || row.heading, { download: true });
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-theme-border text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-theme-surface-hover transition-colors cursor-pointer"
                                title="Download file"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 py-4 text-xs text-theme-muted italic">
                    Click &ldquo;Read Full Summary&rdquo; above to view this newsletter update.
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        /* ── Clean Structured Spreadsheet-Style Archive Table for Clients ── */
        <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#3d4a7a] text-white">
                  <th className="px-3 py-3 font-bold text-center w-16">SR#</th>
                  <th className="px-3 py-3 font-bold w-28 whitespace-nowrap">Dated</th>
                  <th className="px-3 py-3 font-bold w-32">Category</th>
                  <th className="px-3 py-3 font-bold">Heading</th>
                  <th className="px-3 py-3 font-bold text-center w-36">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-theme-border">
                {paginatedDigests.map((digest) => {
                  const nlId = digest.mongoId || digest.id || digest.newsletterId;
                  const rows = digest._visibleRows;
                  return rows.map((row, rIdx) => {
                    const topic = detectTopicBadge(row.heading);
                    const isFirst = rIdx === 0;
                    return (
                      <tr
                        key={`${nlId}_${rIdx}`}
                        className={`hover:bg-blue-50/40 dark:hover:bg-theme-surface-hover/40 transition-colors ${
                          isFirst ? 'border-t-2 border-slate-300 dark:border-slate-600' : ''
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center font-extrabold text-[#3d4a7a] dark:text-blue-300 whitespace-nowrap align-top">
                          {isFirst ? (digest.srNumber || digest.id) : ''}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-gray-300 whitespace-nowrap align-top">
                          {isFirst ? digest._displayDate : ''}
                        </td>
                        <td className="px-3 py-2.5 align-top whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${topic.cls}`}>
                            {topic.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-gray-100 align-top">
                          {row.link ? (
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.preventDefault();
                                openNewsletterLink(row.link, row.heading, { download: false });
                              }}
                              className="hover:text-brand-orange hover:underline transition-colors"
                            >
                              {row.heading}
                            </a>
                          ) : (
                            row.heading
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap align-top">
                          {row.link && (
                            <div className="inline-flex items-center gap-1.5">
                              <a
                                href={row.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openNewsletterLink(row.link, row.heading, { download: false });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f15a24] hover:bg-orange-600 text-white text-xs font-bold rounded-md shadow-2xs cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3" /> Open
                              </a>
                              <a
                                href={row.link}
                                download={row.attachmentName || row.heading || 'document.pdf'}
                                onClick={(e) => {
                                  e.preventDefault();
                                  openNewsletterLink(row.link, row.attachmentName || row.heading, { download: true });
                                }}
                                className="p-1 rounded border border-slate-200 dark:border-theme-border text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                                title="Download file"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Bottom Pagination ────────────────────────────────────────── */}
      {!isLoading && totalItems > 0 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={(p) => setCurrentPage(Math.max(1, Math.min(totalPages, p)))}
        />
      )}

      <AdminFooter />
    </div>
  );
};

export default ClientEmailsPage;
