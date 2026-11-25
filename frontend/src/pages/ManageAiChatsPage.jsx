import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  MessageSquare,
  Search,
  RefreshCw,
  Trash2,
  Calendar,
  User,
  Mail,
  Building2,
  Clock,
  Shield,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Paperclip,
  LayoutList,
  Table2,
  Bot,
  Filter,
  X
} from 'lucide-react';
import { aiChatAuditService } from '../features/ai-chats/services/aiChatAuditService';
import Pagination from '../components/ui/Pagination';
import SquareLoader from '../components/ui/SquareLoader';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import AdminFooter from '../features/dashboard/components/AdminFooter';

const ManageAiChatsPage = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalQueries: 0,
    todayQueries: 0,
    weekQueries: 0,
    uniqueUsersCount: 0,
    latestQueryAt: null
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  const [expandedLogIds, setExpandedLogIds] = useState(new Set());
  const [copiedKey, setCopiedKey] = useState('');
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchStats = useCallback(async () => {
    try {
      const data = await aiChatAuditService.getStats();
      setStats(data);
    } catch (err) {
      console.warn('Failed to fetch AI chat stats:', err);
    }
  }, []);

  const fetchLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await aiChatAuditService.getLogs({
        page,
        limit: 20,
        search: searchQuery,
        startDate,
        endDate
      });
      if (res?.success) {
        setLogs(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI chat logs:', err);
      showToast('Error loading chat queries.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchLogs(1);
    fetchStats();
  }, [fetchLogs, fetchStats]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  const toggleExpand = (id) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
    showToast('Copied to clipboard!');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalItem?._id) return;
    setIsDeleting(true);
    try {
      await aiChatAuditService.deleteLog(deleteModalItem._id);
      setLogs((prev) => prev.filter((l) => l._id !== deleteModalItem._id));
      setDeleteModalItem(null);
      showToast('Query log deleted successfully.');
      fetchStats();
    } catch (err) {
      showToast('Failed to delete query record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (_) {
      return String(dateStr);
    }
  };

  return (
    <div className="flex flex-col w-full animate-fade-in gap-5 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-700 animate-slide-up text-sm">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Page Header & Hero ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b0c10] via-[#1a2035] to-[#252f4a] text-white p-6 sm:p-7 shadow-lg border border-slate-700/50">
        <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-xs font-semibold text-orange-300 mb-2">
              <Bot className="w-3.5 h-3.5 text-brand-orange" />
              <span>SLD Artificial Intelligence Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              AI Chat Queries & Responses Audit
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Inspect all questions submitted by clients and registered users to the SLD Legal Chatbot, review AI legal analyses, and audit user search behavior without email dependency.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              onClick={() => {
                fetchLogs(pagination.page);
                fetchStats();
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs px-3.5 py-2 inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-theme-border bg-theme-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Total Queries</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-theme-main">
            {stats.totalQueries?.toLocaleString() || 0}
          </div>
          <span className="text-xs text-theme-muted mt-1 block">Lifetime prompt interactions</span>
        </div>

        <div className="rounded-xl border border-theme-border bg-theme-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Today's Inquiries</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {stats.todayQueries?.toLocaleString() || 0}
          </div>
          <span className="text-xs text-theme-muted mt-1 block">Asked in last 24 hours</span>
        </div>

        <div className="rounded-xl border border-theme-border bg-theme-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Active Users</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-theme-main">
            {stats.uniqueUsersCount?.toLocaleString() || 0}
          </div>
          <span className="text-xs text-theme-muted mt-1 block">Unique accounts querying AI</span>
        </div>

        <div className="rounded-xl border border-theme-border bg-theme-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Latest Query</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-sm font-bold text-theme-main truncate" title={formatDate(stats.latestQueryAt)}>
            {stats.latestQueryAt ? formatDate(stats.latestQueryAt) : 'No recent activity'}
          </div>
          <span className="text-xs text-theme-muted mt-1 block">Most recent question</span>
        </div>
      </div>

      {/* ── Filters & Controls Toolbar ────────────────────────────────────── */}
      <div className="rounded-xl border border-theme-border bg-theme-surface p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by user name, login ID, email, question, or response..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-theme-border bg-theme-surface-alt/60 text-theme-main placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-main"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button type="submit" variant="primary" className="text-xs px-3.5 py-2 shrink-0">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-theme-muted bg-theme-surface-alt px-2.5 py-1.5 rounded-lg border border-theme-border">
            <Calendar className="w-3.5 h-3.5 text-brand-orange" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-theme-main text-xs focus:outline-none"
              title="From Date"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-theme-main text-xs focus:outline-none"
              title="To Date"
            />
          </div>

          {(searchQuery || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-theme-border text-theme-muted hover:text-brand-orange transition-colors"
            >
              Reset Filters
            </button>
          )}

          <div className="flex items-center bg-theme-surface-alt p-0.5 rounded-lg border border-theme-border ml-auto">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-theme-surface text-brand-orange shadow-xs font-bold'
                  : 'text-theme-muted hover:text-theme-main'
              }`}
              title="Card View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-theme-surface text-brand-orange shadow-xs font-bold'
                  : 'text-theme-muted hover:text-theme-main'
              }`}
              title="Compact Table View"
            >
              <Table2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-theme-surface rounded-2xl border border-theme-border">
          <SquareLoader message="Loading AI Chat inquiries..." />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-theme-surface rounded-2xl border border-theme-border text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-brand-orange flex items-center justify-center mb-4">
            <Bot className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-theme-main">No AI Chat Queries Found</h3>
          <p className="text-xs sm:text-sm text-theme-muted max-w-md mt-1">
            {searchQuery || startDate || endDate
              ? 'No user inquiries matched your active search or date filters. Try resetting the filters.'
              : 'User questions asked in the AI Chatbot will be recorded and displayed here in real time.'}
          </p>
          {(searchQuery || startDate || endDate) && (
            <Button variant="outline" onClick={handleResetFilters} className="mt-4 text-xs">
              Reset Filters
            </Button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* ── Structured Cards View ── */
        <div className="space-y-4">
          {logs.map((log) => {
            const isExpanded = expandedLogIds.has(log._id);
            const hasAttachments = Array.isArray(log.attachments) && log.attachments.length > 0;
            const hasAnalysis = Boolean(log.legalAnalysis && Object.keys(log.legalAnalysis).length > 0);

            return (
              <div
                key={log._id}
                className="rounded-2xl border border-theme-border bg-theme-surface shadow-xs hover:border-slate-400/50 dark:hover:border-slate-700 transition-all overflow-hidden"
              >
                {/* User & Query Meta Bar */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-theme-surface-alt/70 via-theme-surface-alt/30 to-transparent border-b border-theme-border flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-brand-orange font-bold flex items-center justify-center text-sm shrink-0">
                      {(log.userName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-theme-main">{log.userName || 'Registered User'}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          ID: {log.userLogin || 'N/A'}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 font-medium border border-orange-200 dark:border-orange-800">
                          {log.userRole || 'User'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-theme-muted mt-1">
                        {log.userEmail && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3 text-brand-orange" />
                            <a href={`mailto:${log.userEmail}`} className="hover:underline">
                              {log.userEmail}
                            </a>
                          </span>
                        )}
                        {log.userCity && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-theme-muted" />
                            {log.userCity} {log.userAgency ? `• ${log.userAgency}` : ''}
                          </span>
                        )}
                        {log.ipAddress && (
                          <span className="text-[11px] text-theme-disabled">IP: {log.ipAddress}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right text-xs text-theme-muted shrink-0">
                      <div className="flex items-center gap-1 justify-end font-medium text-theme-main">
                        <Clock className="w-3 h-3 text-brand-orange" />
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteModalItem(log)}
                      className="p-1.5 rounded-lg text-theme-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors ml-1"
                      title="Delete this query record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content Box */}
                <div className="p-5 space-y-4">
                  {/* User Question */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>User Question / Prompt:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(log.question, `q_${log._id}`)}
                        className="text-xs text-theme-muted hover:text-brand-orange inline-flex items-center gap-1"
                      >
                        {copiedKey === `q_${log._id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === `q_${log._id}` ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="p-3.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/70 dark:border-orange-900/40 text-sm text-theme-main whitespace-pre-wrap leading-relaxed">
                      {log.question || '(No text prompt - file attached)'}
                    </div>

                    {hasAttachments && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs text-theme-muted font-medium">Attached Documents:</span>
                        {log.attachments.map((att, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-medium"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{att.name || 'document'}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AI Assistant Legal Response */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-brand-orange" />
                        <span>SLD AI Assistant Response:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(log.response, `r_${log._id}`)}
                        className="text-xs text-theme-muted hover:text-brand-orange inline-flex items-center gap-1"
                      >
                        {copiedKey === `r_${log._id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === `r_${log._id}` ? 'Copied' : 'Copy Response'}</span>
                      </button>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                      {log.response || '(No response text generated)'}
                    </div>
                  </div>

                  {/* Optional Detailed Legal Analysis Drawer */}
                  {hasAnalysis && (
                    <div className="border-t border-theme-border pt-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(log._id)}
                        className="text-xs text-theme-muted hover:text-brand-orange font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <span>{isExpanded ? 'Hide' : 'View'} Structured Legal Match Details</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3 rounded-lg bg-theme-surface-alt/70 border border-theme-border text-xs text-theme-main font-mono overflow-x-auto">
                          <pre>{typeof log.legalAnalysis === 'string' ? log.legalAnalysis : JSON.stringify(log.legalAnalysis, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Compact Table View ── */
        <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-theme-surface-alt/80 border-b border-theme-border text-theme-muted uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User / Agency</th>
                  <th className="px-4 py-3">User Prompt</th>
                  <th className="px-4 py-3">AI Response Summary</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-theme-surface-alt/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-theme-muted font-medium">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-theme-main">{log.userName || 'User'}</div>
                      <div className="text-[11px] text-theme-muted">{log.userEmail || log.userLogin || '—'}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-theme-main font-medium">
                      {log.question || '(Document Attachment)'}
                    </td>
                    <td className="px-4 py-3 max-w-md truncate text-theme-muted">
                      {log.response?.slice(0, 140) || '—'}...
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`Question:\n${log.question}\n\nResponse:\n${log.response}`, `row_${log._id}`)}
                        className="p-1 rounded text-theme-muted hover:text-brand-orange transition-colors mr-1"
                        title="Copy Q&A"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteModalItem(log)}
                        className="p-1 rounded text-theme-muted hover:text-red-500 transition-colors"
                        title="Delete log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-2">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => fetchLogs(p)}
          />
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(deleteModalItem)}
        onClose={() => setDeleteModalItem(null)}
        title="Delete AI Query Record"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Are you sure you want to permanently delete this AI query audit record?</span>
          </div>
          {deleteModalItem && (
            <div className="text-xs text-theme-muted bg-theme-surface-alt p-3 rounded-lg border border-theme-border space-y-1">
              <div><strong>User:</strong> {deleteModalItem.userName} ({deleteModalItem.userEmail})</div>
              <div className="truncate"><strong>Prompt:</strong> {deleteModalItem.question}</div>
              <div><strong>Date:</strong> {formatDate(deleteModalItem.createdAt)}</div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteModalItem(null)} disabled={isDeleting} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Admin Footer */}
      <AdminFooter />
    </div>
  );
};

export default ManageAiChatsPage;
