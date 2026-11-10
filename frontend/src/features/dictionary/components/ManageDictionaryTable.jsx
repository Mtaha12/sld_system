import { useState, useMemo, useCallback, useRef } from 'react';
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
  BookA,
  X,
  ExternalLink,
  Loader2
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import SquareLoader from '../../../components/ui/SquareLoader';
import Pagination from '../../../components/ui/Pagination';
import { dictionaryService } from '../services/dictionaryService';
import { useUser } from '../../../contexts/UserContext';
import { extractFirstTwoWords, fetchCaseCitationsForTerm } from '../../../utils/referenceSearchUtil';

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

const ManageDictionaryTable = ({
  dictionaryList = [],
  currentPage: propCurrentPage,
  setCurrentPage: propSetCurrentPage,
  totalItems: propTotalItems,
  totalPages: propTotalPages,
  serverPaginated = false,
  onEdit,
  onDeleted,
  toastMessage,
  setToastMessage,
  isLoading = false
}) => {
  const { user } = useUser();
  const isAdmin = user?.role === 'Administrator' || Boolean(user?.allowAllForms);

  const [viewModalItem, setViewModalItem] = useState(null);
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [sortConfig, setSortConfig] = useState({ key: 'srNumber', direction: 'asc' });
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const isServerPaginated = Boolean(serverPaginated || propTotalItems !== undefined);
  const [itemsPerPage, setItemsPerPage] = useState(100);

  const [caseLawResults, setCaseLawResults] = useState({});
  const [expandedCaseLawIds, setExpandedCaseLawIds] = useState({});
  const caseLawCacheRef = useRef(new Map());

  const handleToggleCaseLaw = useCallback(async (item) => {
    const itemId = item.mongoId || item.id || item.dictionaryId || String(item.srNumber || '');
    if (!itemId) return;

    if (expandedCaseLawIds[itemId]) {
      setExpandedCaseLawIds(prev => ({ ...prev, [itemId]: false }));
      return;
    }

    setExpandedCaseLawIds(prev => ({ ...prev, [itemId]: true }));

    const phrase = extractFirstTwoWords(item.words);
    if (!phrase) {
      setCaseLawResults(prev => ({
        ...prev,
        [itemId]: { loading: false, citations: [], phrase: '' }
      }));
      return;
    }

    const cacheKey = phrase.toLowerCase();
    if (caseLawCacheRef.current.has(cacheKey)) {
      setCaseLawResults(prev => ({
        ...prev,
        [itemId]: { loading: false, citations: caseLawCacheRef.current.get(cacheKey), phrase }
      }));
      return;
    }

    setCaseLawResults(prev => ({
      ...prev,
      [itemId]: { loading: true, citations: [], phrase }
    }));

    try {
      const extracted = await fetchCaseCitationsForTerm({
        phrase,
        existingCitations: item.citations,
        cacheMap: caseLawCacheRef.current
      });
      setCaseLawResults(prev => ({
        ...prev,
        [itemId]: { loading: false, citations: extracted, phrase }
      }));
    } catch (err) {
      console.warn('Failed to search case law for dictionary term:', err);
      setCaseLawResults(prev => ({
        ...prev,
        [itemId]: { loading: false, citations: [], error: 'Search failed', phrase }
      }));
    }
  }, [expandedCaseLawIds]);

  const handleCloseCaseLaw = useCallback((itemId) => {
    setExpandedCaseLawIds(prev => ({ ...prev, [itemId]: false }));
  }, []);

  const currentPage = propCurrentPage !== undefined ? propCurrentPage : internalCurrentPage;
  const setCurrentPage = propSetCurrentPage || setInternalCurrentPage;

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
    if (!dictionaryList || !dictionaryList.length) return [];
    const key = sortConfig.key || 'srNumber';
    const direction = sortConfig.direction || 'asc';

    return [...dictionaryList].sort((a, b) => {
      if (key === 'srNumber') {
        const valA = Number(a.srNumber) || 0;
        const valB = Number(b.srNumber) || 0;
        return direction === 'asc' ? valA - valB : valB - valA;
      }
      const valA = (a[key] || '').toString().toLowerCase();
      const valB = (b[key] || '').toString().toLowerCase();
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [dictionaryList, sortConfig]);

  const totalItems = isServerPaginated ? (propTotalItems !== undefined ? propTotalItems : dictionaryList.length) : sortedList.length;
  const totalPages = isServerPaginated ? (propTotalPages !== undefined ? propTotalPages : Math.ceil(totalItems / itemsPerPage) || 1) : (Math.ceil(totalItems / itemsPerPage) || 1);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = isServerPaginated ? sortedList : sortedList.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalItem) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const targetId = deleteModalItem.mongoId || deleteModalItem.id || deleteModalItem.dictionaryId;
      await dictionaryService.deleteDictionary(targetId);
      if (onDeleted) onDeleted(targetId);
      if (setToastMessage) setToastMessage(`Deleted "${deleteModalItem.words}"`);
      setDeleteModalItem(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message || 'Failed to delete record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '');
  };

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
        <div className="px-4 py-2.5 border-b border-theme-border flex items-center justify-between bg-gray-50/60 dark:bg-theme-surface-alt/30 text-xs">
          <div className="flex items-center gap-1.5 text-theme-main font-semibold">
            <BookA className="w-3.5 h-3.5 text-brand-orange" />
            <span>Dictionary Entries ({totalItems})</span>
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
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/70 dark:bg-theme-surface-hover/70 border-b border-theme-border">
                <TableHeader title="Sr #" sortKey="srNumber" sortConfig={sortConfig} onSort={handleSort} className="w-16 text-center" />
                <TableHeader title="Words / Terms" sortKey="words" sortConfig={sortConfig} onSort={handleSort} className="w-64" />
                <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted">Meaning Preview</th>
                <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted text-center w-48">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-theme-border">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SquareLoader />
                      <span className="text-[11px] text-theme-muted font-medium">Loading dictionary terms...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedList.length > 0 ? (
                paginatedList.map((item, idx) => (
                  <tr 
                    key={item.id || item.mongoId || idx}
                    className="hover:bg-gray-50/80 dark:hover:bg-theme-surface-hover/50 transition-colors"
                  >
                    <td className="px-4 py-2 font-semibold text-theme-muted text-center">
                      #{item.srNumber || (startIndex + idx + 1)}
                    </td>
                    <td className="px-4 py-2 text-theme-main font-semibold whitespace-nowrap">
                      {item.words}
                    </td>
                    <td className="px-4 py-2 text-theme-muted font-normal leading-snug">
                      <div className="line-clamp-1 hover:line-clamp-none transition-all">
                        {stripHtml(item.meaning) || <span className="italic text-gray-400">No meaning provided</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center whitespace-nowrap align-top">
                      {(() => {
                        const itemId = item.mongoId || item.id || item.dictionaryId || String(item.srNumber || idx);
                        const isExpanded = Boolean(expandedCaseLawIds[itemId]);
                        const itemState = caseLawResults[itemId];
                        const phrase = itemState?.phrase || extractFirstTwoWords(item.words);

                        if (!isExpanded) {
                          return (
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={`/dictionary/view/${item.srNumber || item.mongoId || item.id || item.dictionaryId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-[#ff5722] hover:bg-[#f4511e] text-white transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
                                title="View dictionary entry in new tab"
                              >
                                View
                              </a>
                              <button
                                type="button"
                                onClick={() => handleToggleCaseLaw(item)}
                                className="text-[#DC2626] hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 font-serif font-bold text-sm tracking-wide hover:underline cursor-pointer transition-colors whitespace-nowrap"
                                title={`Search case law citations for "${phrase || item.words}"`}
                              >
                                Case Law
                              </button>
                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onEdit?.(item)}
                                    className="p-1 rounded text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteModalItem(item)}
                                    className="p-1 rounded text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        }

                        if (itemState?.loading) {
                          return (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-red-600 dark:text-red-400 font-semibold">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Searching...</span>
                            </div>
                          );
                        }

                        if (itemState?.citations && itemState.citations.length > 0) {
                          return (
                            <div className="flex flex-col gap-1 py-1 text-left min-w-[160px]">
                              <div className="flex items-center justify-between pb-0.5 border-b border-red-200 dark:border-red-900/40 text-[10px] font-bold text-red-600 dark:text-red-400">
                                <span>{itemState.citations.length} Citation{itemState.citations.length > 1 ? 's' : ''}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCloseCaseLaw(itemId)}
                                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs px-1 cursor-pointer"
                                  title="Close citations"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                                {itemState.citations.map((c, i) => (
                                  <a
                                    key={i}
                                    href={c.caseId ? `/cases/view/${c.caseId}` : `/search-case-law?phrase=${encodeURIComponent(phrase)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-between gap-1.5 px-2 py-0.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded text-xs font-mono font-bold border border-red-200 dark:border-red-800 transition-colors shadow-2xs group cursor-pointer"
                                    title="Open print view in new tab"
                                  >
                                    <span>{c.citation}</span>
                                    <ExternalLink className="w-3 h-3 text-red-500 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 py-1">
                            <span className="italic text-[11px]">No case laws</span>
                            <button
                              type="button"
                              onClick={() => handleCloseCaseLaw(itemId)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-1 cursor-pointer"
                              title="Close"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-theme-muted">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Search className="w-5 h-5 text-theme-muted" />
                      <p className="text-xs font-medium text-theme-main">No dictionary entries found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
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
        title="Dictionary Term"
        subtitle={`SR #${viewModalItem?.srNumber || viewModalItem?.id}`}
        icon={BookA}
        maxWidth="max-w-xl"
        footer={<Button variant="outline" size="sm" onClick={() => setViewModalItem(null)}>Close</Button>}
      >
        {viewModalItem && (
          <div className="space-y-3 text-xs">
            <h3 className="text-base font-bold text-theme-main leading-snug">
              {viewModalItem.words}
            </h3>
            {viewModalItem.meaning ? (
              <div 
                className="p-3.5 rounded-lg bg-gray-50 dark:bg-theme-surface-alt border border-theme-border text-theme-main leading-relaxed max-h-80 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: viewModalItem.meaning }}
              />
            ) : (
              <p className="text-theme-muted italic">No meaning entered.</p>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={Boolean(deleteModalItem)}
        onClose={() => { if (!isDeleting) setDeleteModalItem(null); }}
        title="Delete Dictionary Entry"
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
          <p className="text-theme-main">Are you sure you want to delete term:</p>
          <div className="p-2 bg-theme-surface-alt rounded border border-theme-border font-medium text-theme-main">
            {deleteModalItem?.words}
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ManageDictionaryTable;
