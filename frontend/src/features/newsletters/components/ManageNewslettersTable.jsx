import React, { useState, useMemo } from 'react';
import { 
  Eye, 
  Pencil, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Mail,
  Paperclip,
  DownloadCloud,
  X,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Plus,
  LayoutList,
  Table2
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import SquareLoader from '../../../components/ui/SquareLoader';
import Pagination from '../../../components/ui/Pagination';
import { newsletterService } from '../services/newsletterService';
import NewsletterMessageViewer from './NewsletterMessageViewer';
import {
  formatNewsletterDate,
  getNewsletterLinkRows,
  openNewsletterLink
} from '../utils/newsletterLinks';

const TableHeader = ({ title, sortKey, sortConfig, onSort, className = "" }) => {
  const isSorted = Boolean(sortKey && sortConfig?.key === sortKey);
  const direction = isSorted ? sortConfig?.direction : null;

  return (
    <th 
      onClick={() => sortKey && onSort?.(sortKey)}
      className={`px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted select-none ${className} ${
        sortKey ? 'cursor-pointer hover:bg-theme-surface-alt/80 transition-colors group' : ''
      }`}
    >
      <div className="flex items-center gap-1">
        <span className={isSorted ? 'text-brand-orange font-bold' : ''}>{title}</span>
        {sortKey && (
          <span className="shrink-0">
            {direction === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-orange" /> :
             direction === 'desc' ? <ArrowDown className="w-3 h-3 text-brand-orange" /> :
             <ArrowUpDown className="w-3 h-3 text-theme-disabled group-hover:text-brand-orange transition-colors" />}
          </span>
        )}
      </div>
    </th>
  );
};

const getTodayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ManageNewslettersTable = ({
  newsletters = [],
  onEdit,
  onDeleted,
  onNewsletterUpdated,
  onNewsletterCreated,
  toastMessage,
  setToastMessage,
  isLoading = false
}) => {
  const [viewModalItem, setViewModalItem] = useState(null);
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [displayMode, setDisplayMode] = useState('links'); // 'links' (SR# | DATED | HEADING | LINK | ATTACHMENT) | 'classic'
  const [sortConfig, setSortConfig] = useState({ key: 'srNumber', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Per-row inline upload / edit / copy states
  const [uploadingRowKey, setUploadingRowKey] = useState('');
  const [copiedRowKey, setCopiedRowKey] = useState('');
  const [draftEdits, setDraftEdits] = useState({}); // { [newsletterId]: { heading: '', link: '' } }
  const [editingCellKey, setEditingCellKey] = useState(''); // e.g. `${nlId}_${rowIdx}`
  const [cellValues, setCellValues] = useState({}); // temporary controlled inputs while editing an existing row

  // Quick-add brand new SR# / Dated group row at top of table
  const [quickDate, setQuickDate] = useState(getTodayIso());
  const [quickHeading, setQuickHeading] = useState('');
  const [quickLink, setQuickLink] = useState('');
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  const showToast = (msg) => {
    if (!setToastMessage) return;
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: null, direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedList = useMemo(() => {
    if (!newsletters || !newsletters.length) return [];
    if (!sortConfig.key || !sortConfig.direction) return newsletters;

    return [...newsletters].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'srNumber') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [newsletters, sortConfig]);

  const totalItems = sortedList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedList = sortedList.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalItem) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const targetId = deleteModalItem.mongoId || deleteModalItem.id || deleteModalItem.newsletterId;
      await newsletterService.deleteNewsletter(targetId);
      if (onDeleted) onDeleted(targetId);
      if (setToastMessage) setToastMessage(`Deleted "${deleteModalItem.subject}"`);
      setDeleteModalItem(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message || 'Failed to delete record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const persistLinkRows = async (newsletterItem, nextRows, successMsg) => {
    const targetId = newsletterItem.mongoId || newsletterItem.id || newsletterItem.newsletterId;
    const updated = await newsletterService.updateNewsletterLinks(targetId, { linkItems: nextRows });
    if (updated && onNewsletterUpdated) {
      onNewsletterUpdated(updated);
    }
    if (successMsg) showToast(successMsg);
    return updated;
  };

  // Handle "Choose File" upload on an EXISTING row or the AUTO-APPENDED BLANK draft row of a newsletter
  const handleRowChooseFiles = async (newsletterItem, rowIdx, isNewDraftRow, fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const nlId = newsletterItem.mongoId || newsletterItem.id || newsletterItem.newsletterId;
    const rowKey = `${nlId}_${isNewDraftRow ? 'new' : rowIdx}`;
    setUploadingRowKey(rowKey);

    try {
      const existingRows = getNewsletterLinkRows(newsletterItem);
      const uploadedEntries = [];

      for (const file of files) {
        const res = await newsletterService.uploadAttachment(file);
        const up = res?.data || res;
        if (up?.url) {
          const cleanName = (up.name || file.name || 'Document').replace(/\.[^.]+$/, '');
          uploadedEntries.push({
            heading: cleanName,
            link: up.url,
            attachmentName: up.name || file.name,
            size: up.size || 0,
            type: up.type || file.type || ''
          });
        }
      }

      if (uploadedEntries.length === 0) return;

      let nextRows;
      if (isNewDraftRow) {
        const typedHeading = String(draftEdits[nlId]?.heading || '').trim();
        const firstEntry = {
          ...uploadedEntries[0],
          heading: typedHeading || uploadedEntries[0].heading
        };
        nextRows = [...existingRows, firstEntry, ...uploadedEntries.slice(1)];
        setDraftEdits(prev => ({ ...prev, [nlId]: { heading: '', link: '' } }));
      } else {
        const currentRow = existingRows[rowIdx] || {};
        const firstUpdated = {
          ...uploadedEntries[0],
          heading: String(currentRow.heading || '').trim() || uploadedEntries[0].heading
        };
        nextRows = [
          ...existingRows.slice(0, rowIdx),
          firstUpdated,
          ...uploadedEntries.slice(1),
          ...existingRows.slice(rowIdx + 1)
        ];
      }

      await persistLinkRows(
        newsletterItem,
        nextRows,
        `Added ${uploadedEntries.length} attachment link${uploadedEntries.length > 1 ? 's' : ''} to SR #${newsletterItem.srNumber}. New row ready below!`
      );
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Upload failed.');
    } finally {
      setUploadingRowKey('');
    }
  };

  // Save a manually typed draft row (Heading + Link URL without file upload)
  const handleSaveManualDraftRow = async (newsletterItem) => {
    const nlId = newsletterItem.mongoId || newsletterItem.id || newsletterItem.newsletterId;
    const draft = draftEdits[nlId] || {};
    const h = String(draft.heading || '').trim();
    const l = String(draft.link || '').trim();
    if (!h && !l) return;

    const existingRows = getNewsletterLinkRows(newsletterItem);
    const nextRows = [
      ...existingRows,
      {
        heading: h || l.split('/').pop() || 'Document Link',
        link: l,
        attachmentName: l ? l.split('/').pop() : ''
      }
    ];
    setUploadingRowKey(`${nlId}_new`);
    try {
      await persistLinkRows(newsletterItem, nextRows, `Link row added to SR #${newsletterItem.srNumber}.`);
      setDraftEdits(prev => ({ ...prev, [nlId]: { heading: '', link: '' } }));
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to add row.');
    } finally {
      setUploadingRowKey('');
    }
  };

  // Save inline edited existing row heading or link
  const handleSaveEditedRow = async (newsletterItem, rowIdx) => {
    const nlId = newsletterItem.mongoId || newsletterItem.id || newsletterItem.newsletterId;
    const cellKey = `${nlId}_${rowIdx}`;
    const edited = cellValues[cellKey];
    if (!edited) {
      setEditingCellKey('');
      return;
    }

    const existingRows = getNewsletterLinkRows(newsletterItem);
    const nextRows = existingRows.map((r, i) =>
      i === rowIdx
        ? {
            ...r,
            heading: String(edited.heading ?? r.heading).trim(),
            link: String(edited.link ?? r.link).trim()
          }
        : r
    );
    setUploadingRowKey(cellKey);
    try {
      await persistLinkRows(newsletterItem, nextRows, `Row updated for SR #${newsletterItem.srNumber}.`);
      setEditingCellKey('');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to update row.');
    } finally {
      setUploadingRowKey('');
    }
  };

  const handleRemoveLinkRow = async (newsletterItem, rowIdx) => {
    const existingRows = getNewsletterLinkRows(newsletterItem);
    const nextRows = existingRows.filter((_, i) => i !== rowIdx);
    const nlId = newsletterItem.mongoId || newsletterItem.id || newsletterItem.newsletterId;
    setUploadingRowKey(`${nlId}_${rowIdx}`);
    try {
      await persistLinkRows(newsletterItem, nextRows, `Removed link row from SR #${newsletterItem.srNumber}.`);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to remove row.');
    } finally {
      setUploadingRowKey('');
    }
  };

  // Create a brand new Newsletter Digest SR# right from the top Quick Entry Row
  const handleQuickCreateFromFilesOrLink = async (fileList = null) => {
    const files = Array.from(fileList || []);
    const h = quickHeading.trim();
    const l = quickLink.trim();
    if (files.length === 0 && !h && !l) return;

    setIsQuickSaving(true);
    try {
      const linkItems = [];
      for (const file of files) {
        const res = await newsletterService.uploadAttachment(file);
        const up = res?.data || res;
        if (up?.url) {
          linkItems.push({
            heading: (linkItems.length === 0 && h) ? h : (up.name || file.name).replace(/\.[^.]+$/, ''),
            link: up.url,
            attachmentName: up.name || file.name,
            size: up.size || 0,
            type: up.type || file.type || ''
          });
        }
      }
      if (files.length === 0 && (h || l)) {
        linkItems.push({
          heading: h || l.split('/').pop() || 'Document Link',
          link: l,
          attachmentName: l ? l.split('/').pop() : ''
        });
      }

      if (linkItems.length === 0) return;

      const created = await newsletterService.createNewsletter({
        subject: 'CASE LAWS & NEWS Updates',
        date: quickDate || getTodayIso(),
        category: 'Case Laws & News',
        message: '',
        linkItems
      });

      if (created && onNewsletterCreated) {
        onNewsletterCreated(created);
      }
      setQuickHeading('');
      setQuickLink('');
      showToast(`Created new Email Digest SR #${created?.srNumber || ''} with ${linkItems.length} link(s).`);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to create email digest.');
    } finally {
      setIsQuickSaving(false);
    }
  };

  const maxExistingSr = useMemo(
    () => newsletters.reduce((m, n) => Math.max(m, Number(n.srNumber) || 0), 0),
    [newsletters]
  );

  return (
    <div className="flex flex-col gap-3 w-full">

      {toastMessage && (
        <div className="py-2.5 px-3.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-xs flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage('')} className="text-green-600 p-0.5 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Header Bar */}
        <div className="px-4 py-2.5 border-b border-theme-border flex flex-wrap items-center justify-between gap-2 bg-gray-50/60 dark:bg-theme-surface-alt/30 text-xs">
          <div className="flex items-center gap-2 text-theme-main font-semibold">
            <Mail className="w-3.5 h-3.5 text-brand-orange" />
            <span>Email Digest Links List ({totalItems} Records)</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Toggle: Structured Links vs Classic Summary */}
            <div className="inline-flex items-center bg-gray-100 dark:bg-theme-surface-alt p-0.5 rounded-lg border border-theme-border">
              <button
                type="button"
                onClick={() => setDisplayMode('links')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  displayMode === 'links'
                    ? 'bg-[#3d4a7a] text-white shadow-2xs'
                    : 'text-theme-muted hover:text-theme-main'
                }`}
              >
                <Table2 className="w-3 h-3" /> Links List
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('classic')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  displayMode === 'classic'
                    ? 'bg-[#3d4a7a] text-white shadow-2xs'
                    : 'text-theme-muted hover:text-theme-main'
                }`}
              >
                <LayoutList className="w-3 h-3" /> Summary
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-theme-muted text-[11px]">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-1.5 py-0.5 bg-theme-surface border border-theme-border rounded text-[11px] text-theme-main focus:outline-none focus:border-brand-orange"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          {displayMode === 'links' ? (
            <table className="w-full text-left border-collapse text-xs border border-slate-200 dark:border-theme-border">
              <thead>
                <tr className="bg-slate-100 dark:bg-theme-surface-hover/80 border-b-2 border-slate-300 dark:border-theme-border text-slate-800 dark:text-white">
                  <TableHeader title="SR#" sortKey="srNumber" sortConfig={sortConfig} onSort={handleSort} className="w-16 text-center border-r border-slate-200 dark:border-theme-border" />
                  <TableHeader title="DATED" sortKey="date" sortConfig={sortConfig} onSort={handleSort} className="w-28 border-r border-slate-200 dark:border-theme-border" />
                  <th className="px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted border-r border-slate-200 dark:border-theme-border">HEADING</th>
                  <th className="px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted border-r border-slate-200 dark:border-theme-border">LINK</th>
                  <th className="px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted w-36 text-center border-r border-slate-200 dark:border-theme-border">ATTACHMENT</th>
                  <th className="px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted w-28 text-center">ACTION</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-theme-border">
                {/* Quick New SR# Digest Entry Row */}
                <tr className="bg-cyan-50/50 dark:bg-cyan-950/20 border-b-2 border-cyan-200/80 dark:border-cyan-800/50">
                  <td className="px-2 py-2 text-center font-bold text-cyan-800 dark:text-cyan-300 border-r border-slate-200 dark:border-theme-border whitespace-nowrap">
                    #{maxExistingSr + 1}
                    <span className="block text-[9px] font-normal uppercase text-cyan-600 dark:text-cyan-400">New SR</span>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-200 dark:border-theme-border">
                    <input
                      type="date"
                      value={quickDate}
                      onChange={(e) => setQuickDate(e.target.value)}
                      className="w-full px-1.5 py-1 bg-white dark:bg-theme-surface border border-slate-300 dark:border-theme-border rounded text-[11px] text-theme-main"
                    />
                  </td>
                  <td className="px-2 py-2 border-r border-slate-200 dark:border-theme-border">
                    <input
                      type="text"
                      value={quickHeading}
                      onChange={(e) => setQuickHeading(e.target.value)}
                      placeholder="Enter heading (or choose file to auto-create new digest row)..."
                      className="w-full px-2 py-1 bg-white dark:bg-theme-surface border border-slate-300 dark:border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-cyan-500"
                    />
                  </td>
                  <td className="px-2 py-2 border-r border-slate-200 dark:border-theme-border">
                    <input
                      type="text"
                      value={quickLink}
                      onChange={(e) => setQuickLink(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleQuickCreateFromFilesOrLink(); }}
                      placeholder="Paste URL or click Choose File..."
                      className="w-full px-2 py-1 bg-white dark:bg-theme-surface border border-slate-300 dark:border-theme-border rounded text-[11px] font-mono text-blue-600 dark:text-blue-400 focus:outline-none focus:border-cyan-500"
                    />
                  </td>
                  <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-theme-border whitespace-nowrap">
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#00bcd4] hover:bg-[#00acc1] text-white text-[11px] font-semibold rounded cursor-pointer shadow-2xs transition-colors">
                      {isQuickSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                      <span>{isQuickSaving ? 'Saving...' : 'Choose File'}</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        disabled={isQuickSaving}
                        onChange={(e) => {
                          if (e.target.files?.length) handleQuickCreateFromFilesOrLink(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </td>
                  <td className="px-2 py-2 text-center whitespace-nowrap">
                    <button
                      type="button"
                      disabled={isQuickSaving || (!quickHeading.trim() && !quickLink.trim())}
                      onClick={() => handleQuickCreateFromFilesOrLink()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[11px] font-semibold rounded cursor-pointer transition-colors"
                      title="Save new SR# row"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </td>
                </tr>

                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <SquareLoader />
                        <span className="text-[11px] text-theme-muted font-medium">Loading email digest links...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedList.length > 0 ? (
                  paginatedList.map((item) => {
                    const nlId = item.mongoId || item.id || item.newsletterId;
                    const rows = getNewsletterLinkRows(item);
                    const draft = draftEdits[nlId] || { heading: '', link: '' };
                    const newRowKey = `${nlId}_new`;
                    const isUploadingNew = uploadingRowKey === newRowKey;

                    return (
                      <React.Fragment key={nlId}>
                        {rows.map((row, rIdx) => {
                          const rowKey = `${nlId}_${rIdx}`;
                          const isUploadingThis = uploadingRowKey === rowKey;
                          const isEditingThis = editingCellKey === rowKey;
                          const editState = cellValues[rowKey] || { heading: row.heading, link: row.link };
                          const isFirstRow = rIdx === 0;

                          return (
                            <tr
                              key={rowKey}
                              className={`hover:bg-blue-50/40 dark:hover:bg-theme-surface-hover/40 transition-colors ${
                                isFirstRow ? 'border-t-2 border-slate-300 dark:border-slate-600' : ''
                              }`}
                            >
                              {/* SR# (shown on first row of each digest group) */}
                              <td className="px-3 py-2 text-center font-bold text-slate-800 dark:text-gray-100 border-r border-slate-200 dark:border-theme-border align-top whitespace-nowrap">
                                {isFirstRow ? (item.srNumber || '—') : ''}
                              </td>

                              {/* DATED (shown on first row of each digest group) */}
                              <td className="px-3 py-2 font-semibold text-slate-700 dark:text-gray-200 border-r border-slate-200 dark:border-theme-border align-top whitespace-nowrap">
                                {isFirstRow ? formatNewsletterDate(item.date) : ''}
                              </td>

                              {/* HEADING */}
                              <td className="px-3 py-2 text-theme-main border-r border-slate-200 dark:border-theme-border align-top">
                                {isEditingThis ? (
                                  <input
                                    type="text"
                                    value={editState.heading}
                                    onChange={(e) => setCellValues(prev => ({ ...prev, [rowKey]: { ...editState, heading: e.target.value } }))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditedRow(item, rIdx); }}
                                    className="w-full px-2 py-1 bg-white dark:bg-theme-surface border border-brand-orange rounded text-xs font-semibold text-theme-main"
                                  />
                                ) : (
                                  <div className="flex items-start justify-between gap-2 group">
                                    <span className="font-semibold text-[12px] text-slate-900 dark:text-gray-100 uppercase leading-snug">
                                      {row.heading}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCellValues(prev => ({ ...prev, [rowKey]: { heading: row.heading, link: row.link } }));
                                        setEditingCellKey(rowKey);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-600 p-0.5 shrink-0 cursor-pointer transition-opacity"
                                      title="Edit row heading / link inline"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* LINK */}
                              <td className="px-3 py-2 border-r border-slate-200 dark:border-theme-border align-top max-w-[340px]">
                                {isEditingThis ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editState.link}
                                      onChange={(e) => setCellValues(prev => ({ ...prev, [rowKey]: { ...editState, link: e.target.value } }))}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditedRow(item, rIdx); }}
                                      className="w-full px-2 py-1 bg-white dark:bg-theme-surface border border-brand-orange rounded text-[11px] font-mono text-blue-600"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditedRow(item, rIdx)}
                                      className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold cursor-pointer shrink-0"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingCellKey('')}
                                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : row.link ? (
                                  <div className="flex items-center justify-between gap-1.5 group">
                                    <a
                                      href={row.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        openNewsletterLink(row.link, row.heading, { download: false });
                                      }}
                                      className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-[11.5px] break-all leading-snug"
                                      title="Click to open attachment in new tab"
                                    >
                                      {row.link}
                                    </a>
                                    <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(row.link);
                                          setCopiedRowKey(rowKey);
                                          setTimeout(() => setCopiedRowKey(''), 1800);
                                        }}
                                        className="p-1 text-slate-400 hover:text-brand-orange rounded cursor-pointer"
                                        title="Copy attachment URL"
                                      >
                                        {copiedRowKey === rowKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-theme-muted italic text-[11px]">No attachment link yet</span>
                                )}
                              </td>

                              {/* ATTACHMENT: Cyan Choose File button */}
                              <td className="px-2.5 py-1.5 text-center border-r border-slate-200 dark:border-theme-border whitespace-nowrap align-middle">
                                <div className="inline-flex items-center gap-1">
                                  <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00bcd4] hover:bg-[#00acc1] text-white text-[11px] font-medium rounded cursor-pointer shadow-2xs transition-colors">
                                    {isUploadingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                                    <span>{isUploadingThis ? 'Uploading...' : 'Choose File'}</span>
                                    <input
                                      type="file"
                                      multiple
                                      className="hidden"
                                      disabled={isUploadingThis}
                                      onChange={(e) => {
                                        if (e.target.files?.length) handleRowChooseFiles(item, rIdx, false, e.target.files);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLinkRow(item, rIdx)}
                                    className="p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer transition-colors"
                                    title="Remove this link row"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>

                              {/* ACTION (Full record controls on first row of group) */}
                              <td className="px-2 py-1.5 text-center whitespace-nowrap align-top">
                                {isFirstRow && (
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const publicUrl = `${window.location.origin}/newsletters/view/${nlId}`;
                                        navigator.clipboard.writeText(publicUrl);
                                        showToast('Public document link copied!');
                                      }}
                                      className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 cursor-pointer"
                                      title="Copy Public Digest Link"
                                    >
                                      <Share2 className="w-3.5 h-3.5" />
                                    </button>
                                    <a
                                      href={`/newsletters/view/${item.srNumber || nlId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 inline-flex items-center justify-center cursor-pointer"
                                      title="View full digest in new tab"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </a>
                                    <a
                                      href={`/manage-newsletters?edit=${nlId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 cursor-pointer inline-flex items-center justify-center"
                                      title="Edit digest form in new tab"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteModalItem(item)}
                                      className="p-1 rounded text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 cursor-pointer"
                                      title="Delete digest record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Auto-Added Empty Row for Continuous Attachment Uploading under each SR# */}
                        <tr key={newRowKey} className={`bg-slate-50/70 dark:bg-theme-surface-alt/25 ${rows.length === 0 ? 'border-t-2 border-slate-300 dark:border-slate-600' : ''}`}>
                          <td className="px-3 py-1.5 text-center font-bold text-slate-800 dark:text-gray-100 border-r border-slate-200 dark:border-theme-border whitespace-nowrap">
                            {rows.length === 0 ? (item.srNumber || '—') : ''}
                          </td>
                          <td className="px-3 py-1.5 font-semibold text-slate-700 dark:text-gray-200 border-r border-slate-200 dark:border-theme-border whitespace-nowrap">
                            {rows.length === 0 ? formatNewsletterDate(item.date) : ''}
                          </td>
                          <td className="px-2 py-1.5 border-r border-slate-200 dark:border-theme-border">
                            <input
                              type="text"
                              value={draft.heading}
                              onChange={(e) => setDraftEdits(prev => ({ ...prev, [nlId]: { ...draft, heading: e.target.value } }))}
                              placeholder={`+ Add heading for SR #${item.srNumber || item.id}...`}
                              className="w-full px-2 py-1 bg-white dark:bg-theme-surface border border-dashed border-slate-300 dark:border-slate-600 rounded text-xs text-theme-main focus:outline-none focus:border-cyan-500"
                            />
                          </td>
                          <td className="px-2 py-1.5 border-r border-slate-200 dark:border-theme-border">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={draft.link}
                                onChange={(e) => setDraftEdits(prev => ({ ...prev, [nlId]: { ...draft, link: e.target.value } }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveManualDraftRow(item); }}
                                placeholder="Paste URL or click Choose File →"
                                className="w-full px-2 py-1 bg-white dark:bg-theme-surface border border-dashed border-slate-300 dark:border-slate-600 rounded text-[11px] font-mono text-blue-600 dark:text-blue-400 focus:outline-none focus:border-cyan-500"
                              />
                              {(draft.heading.trim() || draft.link.trim()) && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveManualDraftRow(item)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded shrink-0 cursor-pointer"
                                >
                                  Save
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-2.5 py-1.5 text-center border-r border-slate-200 dark:border-theme-border whitespace-nowrap">
                            <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00bcd4] hover:bg-[#00acc1] text-white text-[11px] font-medium rounded cursor-pointer shadow-2xs transition-colors">
                              {isUploadingNew ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                              <span>{isUploadingNew ? 'Adding...' : 'Choose File'}</span>
                              <input
                                type="file"
                                multiple
                                className="hidden"
                                disabled={isUploadingNew}
                                onChange={(e) => {
                                  if (e.target.files?.length) handleRowChooseFiles(item, rows.length, true, e.target.files);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </td>
                          <td className="px-2 py-1.5 text-center whitespace-nowrap">
                            {rows.length === 0 ? (
                              <div className="flex items-center justify-center gap-0.5">
                                <a
                                  href={`/newsletters/view/${item.srNumber || nlId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded text-blue-600 hover:bg-blue-50 inline-flex items-center justify-center"
                                  title="View digest"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={`/manage-newsletters?edit=${nlId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded text-amber-600 hover:bg-amber-50 inline-flex items-center justify-center"
                                  title="Edit digest"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setDeleteModalItem(item)}
                                  className="p-1 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-theme-muted">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Search className="w-5 h-5 text-theme-muted" />
                        <p className="text-xs font-medium text-theme-main">No newsletters found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/70 dark:bg-theme-surface-hover/70 border-b border-theme-border">
                  <TableHeader title="Sr #" sortKey="srNumber" sortConfig={sortConfig} onSort={handleSort} className="w-16 text-center" />
                  <TableHeader title="Date" sortKey="date" sortConfig={sortConfig} onSort={handleSort} className="w-28" />
                  <TableHeader title="Category" sortKey="category" sortConfig={sortConfig} onSort={handleSort} className="w-36" />
                  <TableHeader title="Subject" sortKey="subject" sortConfig={sortConfig} onSort={handleSort} />
                  <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted w-28 text-center">Attachment</th>
                  <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted text-center w-28">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-theme-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <SquareLoader />
                        <span className="text-[11px] text-theme-muted font-medium">Loading newsletters...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedList.length > 0 ? (
                  paginatedList.map((item, idx) => {
                    const nlId = item.mongoId || item.id || item.newsletterId;
                    const rowCount = getNewsletterLinkRows(item).length;
                    return (
                      <tr key={nlId || idx} className="hover:bg-gray-50/80 dark:hover:bg-theme-surface-hover/50 transition-colors">
                        <td className="px-4 py-2 font-semibold text-theme-muted text-center">
                          #{item.srNumber || (startIndex + idx + 1)}
                        </td>
                        <td className="px-4 py-2 text-theme-main whitespace-nowrap">
                          {formatNewsletterDate(item.date)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-theme-main font-medium leading-snug">
                          <div className="line-clamp-1 hover:line-clamp-none transition-all">
                            {item.subject}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center whitespace-nowrap">
                          {rowCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => setViewModalItem(item)}
                              className="px-2 py-0.5 bg-[#f15a24] text-white text-[11px] font-medium rounded hover:bg-orange-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Paperclip className="w-3 h-3" /> {rowCount > 1 ? `${rowCount} Links` : '1 Link'}
                            </button>
                          ) : (
                            <span className="text-theme-muted text-[11px] italic">No file</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const publicUrl = `${window.location.origin}/newsletters/view/${nlId}`;
                                navigator.clipboard.writeText(publicUrl);
                                showToast('Public document link copied!');
                              }}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                              title="Copy Public Link"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`/newsletters/view/${item.srNumber || nlId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-blue-600 hover:bg-blue-50 inline-flex items-center justify-center cursor-pointer"
                              title="View newsletter in new tab"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`/manage-newsletters?edit=${nlId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-amber-600 hover:bg-amber-50 inline-flex items-center justify-center"
                              title="Edit in new tab"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => setDeleteModalItem(item)}
                              className="p-1 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-theme-muted">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Search className="w-5 h-5 text-theme-muted" />
                        <p className="text-xs font-medium text-theme-main">No newsletters found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && totalItems > 0 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* View Modal */}
      <Modal
        isOpen={Boolean(viewModalItem)}
        onClose={() => setViewModalItem(null)}
        title="Newsletter Details"
        subtitle={`SR #${viewModalItem?.srNumber || viewModalItem?.id} • ${viewModalItem?.date} • Category: ${viewModalItem?.category}`}
        icon={Mail}
        maxWidth="max-w-4xl"
        footer={<Button variant="outline" size="sm" onClick={() => setViewModalItem(null)}>Close</Button>}
      >
        {viewModalItem && (
          <div className="space-y-4">
            {/* Newsletter Header Card */}
            <div className="p-4 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/40 rounded-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-orange text-white">
                  {viewModalItem.category || 'General'}
                </span>
                <span className="text-xs font-semibold text-theme-muted">
                  Date: {viewModalItem.date || '—'}
                </span>
              </div>
              <h2 className="text-base font-bold text-theme-main tracking-tight">
                {viewModalItem.subject}
              </h2>
            </div>

            {/* Optional Attachment Bar */}
            {getNewsletterLinkRows(viewModalItem).length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-theme-muted block">Attached Documents ({getNewsletterLinkRows(viewModalItem).length}):</span>
                {getNewsletterLinkRows(viewModalItem).map((row, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-theme-surface-alt rounded-lg border border-theme-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-brand-orange shrink-0" />
                      <span className="font-semibold text-xs text-theme-main truncate">{row.heading || row.link}</span>
                    </div>
                    {row.link && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={row.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.preventDefault();
                            openNewsletterLink(row.link, row.heading, { download: false });
                          }}
                          className="px-3 py-1 bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white rounded text-xs flex items-center gap-1 font-medium transition-colors shadow-sm cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View
                        </a>
                        <a
                          href={row.link}
                          download={row.attachmentName || row.heading || 'document'}
                          onClick={(e) => {
                            e.preventDefault();
                            openNewsletterLink(row.link, row.attachmentName || row.heading, { download: true });
                          }}
                          className="px-2.5 py-1 bg-brand-orange hover:bg-orange-600 text-white rounded text-xs flex items-center gap-1 font-medium transition-colors shadow-sm cursor-pointer"
                        >
                          <DownloadCloud className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {/* Rich Formatted Message Content */}
            <NewsletterMessageViewer 
              message={viewModalItem.message}
              subject={viewModalItem.subject}
              date={viewModalItem.date}
              srNumber={viewModalItem.srNumber || viewModalItem.id}
              category={viewModalItem.category}
            />
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={Boolean(deleteModalItem)}
        onClose={() => { if (!isDeleting) setDeleteModalItem(null); }}
        title="Delete Newsletter"
        subtitle="This action will remove the record."
        icon={AlertTriangle}
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteModalItem(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs">
          {deleteError && <div className="p-2 bg-red-50 text-red-600 rounded">{deleteError}</div>}
          <p className="text-theme-main">Are you sure you want to delete newsletter:</p>
          <div className="p-2 bg-theme-surface-alt rounded border border-theme-border font-medium text-theme-main">
            {deleteModalItem?.subject}
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ManageNewslettersTable;
