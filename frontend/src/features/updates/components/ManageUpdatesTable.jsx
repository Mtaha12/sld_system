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
  Globe,
  ExternalLink,
  X
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import SquareLoader from '../../../components/ui/SquareLoader';
import { updateService } from '../services/updateService';

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
            {direction === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-orange" /> :
             direction === 'desc' ? <ArrowDown className="w-3 h-3 text-brand-orange" /> :
             <ArrowUpDown className="w-3 h-3 text-theme-disabled group-hover:text-brand-orange transition-colors" />}
          </span>
        )}
      </div>
    </th>
  );
};

const ManageUpdatesTable = ({
  updates = [],
  onEdit,
  onDeleted,
  toastMessage,
  setToastMessage,
  isLoading = false
}) => {
  const [viewModalItem, setViewModalItem] = useState(null);
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [sortConfig, setSortConfig] = useState({ key: 'srNumber', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const sortedUpdates = useMemo(() => {
    if (!updates || !updates.length) return [];
    if (!sortConfig.key || !sortConfig.direction) return updates;

    return [...updates].sort((a, b) => {
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
  }, [updates, sortConfig]);

  const totalItems = sortedUpdates.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUpdates = sortedUpdates.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalItem) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const targetId = deleteModalItem.mongoId || deleteModalItem.id || deleteModalItem.updateId;
      await updateService.deleteUpdate(targetId);
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
          <button type="button" onClick={() => setToastMessage('')} className="text-green-600 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Header Bar */}
        <div className="px-4 py-2.5 border-b border-theme-border flex items-center justify-between bg-gray-50/60 dark:bg-theme-surface-alt/30 text-xs">
          <div className="flex items-center gap-1.5 text-theme-main font-semibold">
            <Globe className="w-3.5 h-3.5 text-[#00bcd4]" />
            <span>Updates ({totalItems})</span>
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

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/70 dark:bg-theme-surface-hover/70 border-b border-theme-border">
                <TableHeader title="Sr #" sortKey="srNumber" sortConfig={sortConfig} onSort={handleSort} className="w-16 text-center" />
                <TableHeader title="Dated" sortKey="dated" sortConfig={sortConfig} onSort={handleSort} className="w-28" />
                <TableHeader title="Heading" sortKey="heading" sortConfig={sortConfig} onSort={handleSort} />
                <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted w-48">URL / Link</th>
                <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted text-center w-28">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-theme-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SquareLoader />
                      <span className="text-[11px] text-theme-muted font-medium">Loading updates...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUpdates.length > 0 ? (
                paginatedUpdates.map((item, idx) => (
                  <tr 
                    key={item.id || item.mongoId || idx}
                    className="hover:bg-gray-50/80 dark:hover:bg-theme-surface-hover/50 transition-colors"
                  >
                    <td className="px-4 py-2 font-semibold text-theme-muted text-center">
                      #{item.srNumber || (startIndex + idx + 1)}
                    </td>
                    <td className="px-4 py-2 text-theme-main whitespace-nowrap">
                      {item.dated || item.date || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-theme-main font-medium leading-snug">
                      <div className="line-clamp-1 hover:line-clamp-none transition-all">
                        {item.heading}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 max-w-[200px] truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.url}</span>
                        </a>
                      ) : (
                        <span className="text-theme-muted text-[11px]">N/A</span>
                      )}
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
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-theme-muted">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Search className="w-5 h-5 text-theme-muted" />
                      <p className="text-xs font-medium text-theme-main">No updates found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalItems > 0 && (
          <div className="px-4 py-2 border-t border-theme-border flex items-center justify-between gap-2 bg-gray-50/40 dark:bg-theme-surface-alt/20 text-xs">
            <span className="text-theme-muted text-[11px]">
              {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-7 px-2.5 text-xs"
              >
                Prev
              </Button>
              <span className="px-2 text-[11px] font-medium text-theme-main">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-7 px-2.5 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* View Modal */}
      <Modal
        isOpen={Boolean(viewModalItem)}
        onClose={() => setViewModalItem(null)}
        title="Update Details"
        subtitle={`SR #${viewModalItem?.srNumber || viewModalItem?.id} • ${viewModalItem?.dated || viewModalItem?.date}`}
        icon={Globe}
        maxWidth="max-w-md"
        footer={<Button variant="outline" size="sm" onClick={() => setViewModalItem(null)}>Close</Button>}
      >
        {viewModalItem && (
          <div className="space-y-3 text-xs">
            <h3 className="text-sm font-bold text-theme-main leading-snug">
              {viewModalItem.heading}
            </h3>
            {viewModalItem.url && (
              <div className="p-3 bg-gray-50 dark:bg-theme-surface-alt rounded-lg border border-theme-border space-y-1">
                <span className="text-theme-muted text-[10px] uppercase font-bold">Target URL:</span>
                <a
                  href={viewModalItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline block break-all font-mono"
                >
                  {viewModalItem.url}
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={Boolean(deleteModalItem)}
        onClose={() => { if (!isDeleting) setDeleteModalItem(null); }}
        title="Delete Update"
        subtitle="This action will remove the update."
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

export default ManageUpdatesTable;
