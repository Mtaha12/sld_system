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
  Scale,
  FileText,
  DownloadCloud,
  X
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import SquareLoader from '../../../components/ui/SquareLoader';
import Pagination from '../../../components/ui/Pagination';
import { otherCaseService } from '../services/otherCaseService';

const TableHeader = ({ title, sortKey, sortConfig, onSort, className = "" }) => {
  const isSorted = Boolean(sortKey && sortConfig?.key === sortKey);
  const direction = isSorted ? sortConfig?.direction : null;

  return (
    <th 
      onClick={() => sortKey && onSort?.(sortKey)}
      className={`px-3 py-2.5 font-semibold text-xs tracking-wider text-theme-muted select-none border-r border-theme-border/40 ${className} ${
        sortKey ? 'cursor-pointer hover:bg-theme-surface-alt/80 transition-colors group' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-1">
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

const ManageOtherCasesTable = ({
  cases = [],
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
  const [itemsPerPage, setItemsPerPage] = useState(15);

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
    if (!cases || !cases.length) return [];
    if (!sortConfig.key || !sortConfig.direction) return cases;

    return [...cases].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (['srNumber', 'orderPriority'].includes(sortConfig.key)) {
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
  }, [cases, sortConfig]);

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
      const targetId = deleteModalItem.mongoId || deleteModalItem.id || deleteModalItem.otherCaseId;
      await otherCaseService.deleteOtherCase(targetId);
      if (onDeleted) onDeleted(targetId);
      if (setToastMessage) setToastMessage(`Deleted case "${deleteModalItem.caseNo}"`);
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

      {/* Spreadsheet styled container matching Image 2 */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Header Bar */}
        <div className="px-4 py-2.5 border-b border-theme-border flex items-center justify-between bg-gray-50/60 dark:bg-theme-surface-alt/30 text-xs">
          <div className="flex items-center gap-1.5 text-theme-main font-semibold">
            <Scale className="w-3.5 h-3.5 text-brand-orange" />
            <span>Other Case Laws Spreadsheet View ({totalItems})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-theme-muted text-[11px]">Rows:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-1.5 py-0.5 bg-theme-surface border border-theme-border rounded text-[11px] text-theme-main focus:outline-none focus:border-brand-orange"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Table styled like Excel grid from Image 2 */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {/* Column Letters matching Image 2 */}
              <tr className="bg-gray-100 dark:bg-gray-800/80 border-b border-theme-border text-[10px] text-theme-muted select-none">
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-14">A</th>
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-24">B</th>
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-28">C</th>
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-36">D</th>
                <th className="py-1 px-3 border-r border-theme-border/40 font-mono">E</th>
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-24">F</th>
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-14">G</th>
                <th className="py-1 px-3 border-r border-theme-border/40 font-mono w-44">H</th>
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-28">I</th>
                <th className="py-1 px-3 text-center font-mono w-24">Action</th>
              </tr>
              {/* Column Names from Image 2 */}
              <tr className="bg-gray-800 text-gray-100 dark:bg-gray-900 border-b border-theme-border font-semibold text-xs">
                <TableHeader title="Sr. No." sortKey="srNumber" sortConfig={sortConfig} onSort={handleSort} className="text-center w-14 text-white" />
                <TableHeader title="Citation" sortKey="citation" sortConfig={sortConfig} onSort={handleSort} className="w-24 text-white" />
                <TableHeader title="SC Citation" sortKey="scCitation" sortConfig={sortConfig} onSort={handleSort} className="w-28 text-white" />
                <TableHeader title="Case No" sortKey="caseNo" sortConfig={sortConfig} onSort={handleSort} className="w-36 text-white" />
                <TableHeader title="Case Title" sortKey="caseTitle" sortConfig={sortConfig} onSort={handleSort} className="text-white" />
                <TableHeader title="Judgment Date" sortKey="judgmentDate" sortConfig={sortConfig} onSort={handleSort} className="text-center w-24 text-white" />
                <TableHeader title="" sortKey="orderPriority" sortConfig={sortConfig} onSort={handleSort} className="text-center w-14 text-white" />
                <TableHeader title="Author Judge" sortKey="authorJudge" sortConfig={sortConfig} onSort={handleSort} className="w-44 text-white" />
                <th className="px-3 py-2.5 font-semibold text-xs tracking-wider text-white text-center w-28 border-r border-theme-border/40">Download</th>
                <th className="px-3 py-2.5 font-semibold text-xs tracking-wider text-white text-center w-24">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-theme-border">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SquareLoader />
                      <span className="text-[11px] text-theme-muted font-medium">Loading other case laws...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedList.length > 0 ? (
                paginatedList.map((item, idx) => (
                  <tr 
                    key={item.id || item.mongoId || idx}
                    className="hover:bg-blue-50/40 dark:hover:bg-theme-surface-hover/50 transition-colors"
                  >
                    {/* A: Sr. No. */}
                    <td className="px-3 py-2 text-center font-medium text-theme-muted border-r border-theme-border/40">
                      {item.srNumber || (startIndex + idx + 1)}
                    </td>

                    {/* B: Citation */}
                    <td className="px-3 py-2 text-theme-main font-mono text-[11px] whitespace-nowrap border-r border-theme-border/40">
                      {item.citation || ''}
                    </td>

                    {/* C: SC Citation */}
                    <td className="px-3 py-2 text-theme-main font-semibold text-[11px] whitespace-nowrap border-r border-theme-border/40">
                      {item.scCitation || ''}
                    </td>

                    {/* D: Case No */}
                    <td className="px-3 py-2 font-mono text-[11px] text-gray-800 dark:text-gray-200 whitespace-nowrap border-r border-theme-border/40">
                      {item.caseNo}
                    </td>

                    {/* E: Case Title (Blue link styled like Image 2) */}
                    <td className="px-3 py-2 text-blue-600 dark:text-blue-400 font-medium leading-snug border-r border-theme-border/40">
                      <button
                        type="button"
                        onClick={() => setViewModalItem(item)}
                        className="hover:underline text-left cursor-pointer"
                      >
                        {item.caseTitle}
                      </button>
                    </td>

                    {/* F: Judgment Date */}
                    <td className="px-3 py-2 text-center whitespace-nowrap text-theme-muted font-mono text-[11px] border-r border-theme-border/40">
                      {item.judgmentDate || 'N/A'}
                    </td>

                    {/* G: Order/Priority */}
                    <td className="px-3 py-2 text-center text-theme-muted font-semibold text-[11px] border-r border-theme-border/40">
                      {item.orderPriority || ''}
                    </td>

                    {/* H: Author Judge */}
                    <td className="px-3 py-2 text-theme-main whitespace-nowrap border-r border-theme-border/40">
                      {item.authorJudge || ''}
                    </td>

                    {/* I: Download */}
                    <td className="px-3 py-2 text-center whitespace-nowrap border-r border-theme-border/40">
                      {item.attachment ? (
                        <a
                          href={item.attachment}
                          download={item.attachmentName || `${item.caseNo}.pdf`}
                          className="text-cyan-600 dark:text-cyan-400 hover:underline font-mono text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          title={`Download ${item.attachmentName || 'document'}`}
                        >
                          <FileText className="w-3.5 h-3.5 text-red-500" />
                          <span>PDF{item.attachmentSize || ''}</span>
                        </a>
                      ) : (
                        <span className="text-theme-disabled text-[10px] italic">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 text-center whitespace-nowrap">
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
                  <td colSpan={10} className="py-12 text-center text-theme-muted">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Search className="w-6 h-6 text-theme-muted" />
                      <p className="text-xs font-semibold text-theme-main">No case law records found</p>
                      <p className="text-[11px] text-theme-muted">Click "+ Add Other Case" to create your first entry.</p>
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
        title="Case Law Details"
        subtitle={`Case No: ${viewModalItem?.caseNo} • Date: ${viewModalItem?.judgmentDate}`}
        icon={Scale}
        maxWidth="max-w-2xl"
        footer={<Button variant="outline" size="sm" onClick={() => setViewModalItem(null)}>Close</Button>}
      >
        {viewModalItem && (
          <div className="space-y-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-orange tracking-wider">Case Title</span>
              <h3 className="text-sm font-bold text-theme-main leading-snug mt-0.5">
                {viewModalItem.caseTitle}
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-gray-50 dark:bg-theme-surface-alt border border-theme-border">
              <div>
                <span className="text-[10px] text-theme-muted block font-semibold">Case No</span>
                <span className="font-mono text-theme-main">{viewModalItem.caseNo}</span>
              </div>
              <div>
                <span className="text-[10px] text-theme-muted block font-semibold">SC Citation</span>
                <span className="font-semibold text-theme-main">{viewModalItem.scCitation || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-theme-muted block font-semibold">General Citation</span>
                <span className="font-semibold text-theme-main">{viewModalItem.citation || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-theme-muted block font-semibold">Judgment Date</span>
                <span className="font-mono text-theme-main">{viewModalItem.judgmentDate}</span>
              </div>
            </div>

            {viewModalItem.authorJudge && (
              <div>
                <span className="text-[10px] text-theme-muted block font-semibold">Author Judge</span>
                <span className="font-semibold text-theme-main">{viewModalItem.authorJudge}</span>
              </div>
            )}

            {viewModalItem.attachment && (
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-500" />
                  <div>
                    <span className="font-semibold text-theme-main block">{viewModalItem.attachmentName || 'Judgment PDF'}</span>
                    <span className="text-[10px] text-theme-muted">{viewModalItem.attachmentSize || ''}</span>
                  </div>
                </div>
                <a
                  href={viewModalItem.attachment}
                  download={viewModalItem.attachmentName || `${viewModalItem.caseNo}.pdf`}
                  className="px-3 py-1 bg-brand-orange hover:bg-orange-600 text-white rounded text-xs flex items-center gap-1 font-medium transition-colors"
                >
                  <DownloadCloud className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            )}

            {viewModalItem.notes && (
              <div>
                <span className="text-[10px] uppercase font-bold text-theme-muted block mb-1">Notes / Summary</span>
                <div 
                  className="p-3.5 rounded-lg bg-gray-50 dark:bg-theme-surface-alt border border-theme-border text-theme-main leading-relaxed max-h-60 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: viewModalItem.notes }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={Boolean(deleteModalItem)}
        onClose={() => { if (!isDeleting) setDeleteModalItem(null); }}
        title="Delete Case Law"
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
          <p className="text-theme-main">Are you sure you want to delete case:</p>
          <div className="p-2 bg-theme-surface-alt rounded border border-theme-border font-medium text-theme-main">
            {deleteModalItem?.caseNo} – {deleteModalItem?.caseTitle}
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ManageOtherCasesTable;
