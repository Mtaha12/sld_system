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
  Layers,
  Paperclip,
  DownloadCloud,
  X
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import SquareLoader from '../../../components/ui/SquareLoader';
import Pagination from '../../../components/ui/Pagination';
import { customTariffService } from '../services/customTariffService';

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

const ManageCustomTariffsTable = ({
  tariffs = [],
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

  const sortedList = useMemo(() => {
    if (!tariffs || !tariffs.length) return [];
    if (!sortConfig.key || !sortConfig.direction) return tariffs;

    return [...tariffs].sort((a, b) => {
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
  }, [tariffs, sortConfig]);

  const totalItems = sortedList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = sortedList.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalItem) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const targetId = deleteModalItem.mongoId || deleteModalItem.id || deleteModalItem.customTariffId;
      await customTariffService.deleteCustomTariff(targetId);
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
          <button type="button" onClick={() => setToastMessage('')} className="text-green-600 p-0.5 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Header Bar */}
        <div className="px-4 py-2.5 border-b border-theme-border flex items-center justify-between bg-gray-50/60 dark:bg-theme-surface-alt/30 text-xs">
          <div className="flex items-center gap-1.5 text-theme-main font-semibold">
            <Layers className="w-3.5 h-3.5 text-brand-orange" />
            <span>Custom Tariffs Records ({totalItems})</span>
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
                <TableHeader title="SLD #" sortKey="sldNumber" sortConfig={sortConfig} onSort={handleSort} className="w-24 text-center" />
                <TableHeader title="Dated" sortKey="dated" sortConfig={sortConfig} onSort={handleSort} className="w-24" />
                <TableHeader title="Years" className="w-24 text-center" />
                <TableHeader title="Heading" sortKey="heading" sortConfig={sortConfig} onSort={handleSort} />
                <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted w-24 text-center">Items</th>
                <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted w-24 text-center">Attachment</th>
                <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-theme-muted text-center w-24">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-theme-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SquareLoader />
                      <span className="text-[11px] text-theme-muted font-medium">Loading custom tariffs...</span>
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
                    <td className="px-4 py-2 text-center font-bold text-brand-orange whitespace-nowrap">
                      {item.sldNumber}
                    </td>
                    <td className="px-4 py-2 text-theme-main whitespace-nowrap">
                      {item.dated || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-center text-theme-muted whitespace-nowrap">
                      {item.fromYear} – {item.toYear}
                    </td>
                    <td className="px-4 py-2 text-theme-main font-medium leading-snug">
                      <div className="line-clamp-1 hover:line-clamp-none transition-all">
                        {item.heading}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold">
                        {item.items?.length || 0} entries
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center whitespace-nowrap">
                      {item.attachment || item.attachmentName ? (
                        <button
                          type="button"
                          onClick={() => setViewModalItem(item)}
                          className="px-2 py-0.5 bg-[#f15a24] text-white text-[11px] font-medium rounded hover:bg-orange-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Paperclip className="w-3 h-3" /> File
                        </button>
                      ) : (
                        <span className="text-theme-muted text-[11px] italic">No file</span>
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
                  <td colSpan={8} className="py-10 text-center text-theme-muted">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Search className="w-5 h-5 text-theme-muted" />
                      <p className="text-xs font-medium text-theme-main">No custom tariffs found</p>
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
        title="Custom Tariff Details"
        subtitle={`SLD #${viewModalItem?.sldNumber} • ${viewModalItem?.dated} • Years: ${viewModalItem?.fromYear}–${viewModalItem?.toYear}`}
        icon={Layers}
        maxWidth="max-w-3xl"
        footer={<Button variant="outline" size="sm" onClick={() => setViewModalItem(null)}>Close</Button>}
      >
        {viewModalItem && (
          <div className="space-y-4 text-xs">
            <h3 className="text-base font-bold text-theme-main leading-snug">
              {viewModalItem.heading}
            </h3>

            {viewModalItem.attachmentName && (
              <div className="p-3 bg-gray-50 dark:bg-theme-surface-alt rounded-lg border border-theme-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-brand-orange" />
                  <span className="font-medium text-theme-main">{viewModalItem.attachmentName}</span>
                </div>
                {viewModalItem.attachment && (
                  <a
                    href={viewModalItem.attachment}
                    download={viewModalItem.attachmentName}
                    className="px-2.5 py-1 bg-brand-orange hover:bg-orange-600 text-white rounded text-xs flex items-center gap-1"
                  >
                    <DownloadCloud className="w-3 h-3" /> Download
                  </a>
                )}
              </div>
            )}

            {viewModalItem.detail && (
              <div>
                <label className="font-semibold text-theme-muted uppercase tracking-wider text-[10px] block mb-1">General Detail</label>
                <div 
                  className="p-3 rounded-lg bg-gray-50 dark:bg-theme-surface-alt border border-theme-border text-theme-main leading-relaxed max-h-48 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: viewModalItem.detail }}
                />
              </div>
            )}

            {viewModalItem.items && viewModalItem.items.length > 0 && (
              <div>
                <label className="font-semibold text-theme-muted uppercase tracking-wider text-[10px] block mb-2">Tariff Grid Items</label>
                <div className="overflow-x-auto border border-theme-border rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f59e0b] text-white text-[11px]">
                        <th className="p-2">PCT Code</th>
                        <th className="p-2">Description</th>
                        <th className="p-2">UOM</th>
                        <th className="p-2">CD%</th>
                        <th className="p-2">AD%</th>
                        <th className="p-2">RD%</th>
                        <th className="p-2">Ex/Sth</th>
                        <th className="p-2">CON%</th>
                        <th className="p-2">ST%</th>
                        <th className="p-2">WHT</th>
                        <th className="p-2">Other</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-border">
                      {viewModalItem.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-theme-surface-hover/30">
                          <td className="p-2 font-bold text-brand-orange">{it.pctCode || '-'}</td>
                          <td className="p-2">{it.description || '-'}</td>
                          <td className="p-2">{it.uom || '-'}</td>
                          <td className="p-2">{it.cd || '-'}</td>
                          <td className="p-2">{it.ad || '-'}</td>
                          <td className="p-2">{it.rd || '-'}</td>
                          <td className="p-2">{it.exSth || '-'}</td>
                          <td className="p-2">{it.con || '-'}</td>
                          <td className="p-2">{it.st || '-'}</td>
                          <td className="p-2">{it.wht || '-'}</td>
                          <td className="p-2">{it.other || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={Boolean(deleteModalItem)}
        onClose={() => { if (!isDeleting) setDeleteModalItem(null); }}
        title="Delete Custom Tariff"
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
          <p className="text-theme-main">Are you sure you want to delete tariff record:</p>
          <div className="p-2 bg-theme-surface-alt rounded border border-theme-border font-medium text-theme-main">
            {deleteModalItem?.heading}
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ManageCustomTariffsTable;
