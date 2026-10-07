import { useState, useMemo } from 'react';
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
  Newspaper,
  X
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import SquareLoader from '../../../components/ui/SquareLoader';
import Pagination from '../../../components/ui/Pagination';
import { newsService } from '../services/newsService';
import { useUser } from '../../../contexts/UserContext';

const TableHeader = ({ title, sortKey, sortConfig, onSort, className = "" }) => {
  const isSorted = sortConfig?.key === sortKey;
  const direction = isSorted ? sortConfig.direction : null;

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
            {direction === 'asc' ? (
              <ArrowUp className="w-3 h-3 text-brand-orange" />
            ) : direction === 'desc' ? (
              <ArrowDown className="w-3 h-3 text-brand-orange" />
            ) : (
              <ArrowUpDown className="w-3 h-3 text-theme-disabled group-hover:text-brand-orange transition-colors" />
            )}
          </span>
        )}
      </div>
    </th>
  );
};

const ManageNewsTable = ({
  newsList = [],
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

  const [sortConfig, setSortConfig] = useState({ key: 'srNumber', direction: 'desc' });
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const itemsPerPage = serverPaginated ? 25 : 10;

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

  const sortedNews = useMemo(() => {
    if (serverPaginated) return newsList;
    if (!newsList || !newsList.length) return [];
    if (!sortConfig.key || !sortConfig.direction) return newsList;

    return [...newsList].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'srNumber' || sortConfig.key === 'year') {
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
  }, [newsList, sortConfig, serverPaginated]);

  const totalItems = serverPaginated ? (propTotalItems !== undefined ? propTotalItems : newsList.length) : sortedNews.length;
  const totalPages = serverPaginated ? (propTotalPages !== undefined ? propTotalPages : Math.ceil(totalItems / itemsPerPage) || 1) : (Math.ceil(totalItems / itemsPerPage) || 1);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNews = serverPaginated ? sortedNews : sortedNews.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalItem) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const targetId = deleteModalItem.mongoId || deleteModalItem.id || deleteModalItem.newsId;
      await newsService.deleteNews(targetId);
      if (onDeleted) onDeleted(targetId);
      if (setToastMessage) setToastMessage(`Deleted "${deleteModalItem.heading}"`);
      setDeleteModalItem(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message || 'Failed to delete record.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">

      {toastMessage && (
        <div className="py-2.5 px-3.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-xs flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            className="text-green-600 hover:text-green-800 dark:hover:text-green-200 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Table Card Container */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Compact Table Header Bar */}
        <div className="px-4 py-2.5 border-b border-theme-border flex items-center justify-between bg-gray-50/60 dark:bg-theme-surface-alt/30 text-xs">
          <div className="flex items-center gap-1.5 text-theme-main font-semibold">
            <Newspaper className="w-3.5 h-3.5 text-brand-orange" />
            <span>Records ({totalItems})</span>
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
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/70 dark:bg-theme-surface-hover/70 border-b border-theme-border">
                <TableHeader title="Sr #" sortKey="srNumber" sortConfig={sortConfig} onSort={handleSort} className="w-16 text-center" />
                <TableHeader title="Date" sortKey="date" sortConfig={sortConfig} onSort={handleSort} className="w-28" />
                <TableHeader title="Year" sortKey="year" sortConfig={sortConfig} onSort={handleSort} className="w-20 text-center" />
                <TableHeader title="Heading" sortKey="heading" sortConfig={sortConfig} onSort={handleSort} />
                <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted text-center w-28">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-theme-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SquareLoader />
                      <span className="text-[11px] text-theme-muted font-medium">Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedNews.length > 0 ? (
                paginatedNews.map((item, idx) => (
                  <tr 
                    key={item.id || item.mongoId || idx}
                    className="hover:bg-gray-50/80 dark:hover:bg-theme-surface-hover/50 transition-colors"
                  >
                    <td className="px-4 py-2 font-semibold text-theme-muted text-center">
                      #{item.srNumber || (startIndex + idx + 1)}
                    </td>
                    <td className="px-4 py-2 text-theme-main whitespace-nowrap">
                      {item.date || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800 text-[11px]">
                        {item.year || '2026'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-theme-main font-medium leading-snug">
                      <div className="line-clamp-1 hover:line-clamp-none transition-all">
                        {item.heading}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewModalItem(item)}
                          className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
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
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-theme-muted">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Search className="w-5 h-5 text-theme-muted" />
                      <p className="text-xs font-medium text-theme-main">No records found</p>
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
        title="News Details"
        subtitle={`SR #${viewModalItem?.srNumber || viewModalItem?.id} • ${viewModalItem?.date}`}
        icon={Newspaper}
        maxWidth="max-w-xl"
        footer={<Button variant="outline" size="sm" onClick={() => setViewModalItem(null)}>Close</Button>}
      >
        {viewModalItem && (
          <div className="space-y-3 text-xs">
            <h3 className="text-sm font-bold text-theme-main leading-snug">
              {viewModalItem.heading}
            </h3>
            <div 
              className="p-3 rounded-lg bg-gray-50 dark:bg-theme-surface-alt border border-theme-border text-theme-main leading-relaxed max-h-72 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: viewModalItem.detail || '<p class="text-theme-muted">No detail provided.</p>' }}
            />
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={Boolean(deleteModalItem)}
        onClose={() => { if (!isDeleting) setDeleteModalItem(null); }}
        title="Delete News"
        subtitle="This action will remove the news record."
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
          <p className="text-theme-main">Are you sure you want to delete:</p>
          <div className="p-2 bg-theme-surface-alt rounded border border-theme-border font-medium text-theme-main">
            {deleteModalItem?.heading}
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ManageNewsTable;
