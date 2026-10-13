import { useState } from 'react';
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
  ExternalLink,
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
  totalItems = 0,
  totalPages = 1,
  currentPage = 1,
  itemsPerPage = 25,
  sortConfig = { key: 'srNumber', direction: 'asc' },
  onSort,
  onPageChange,
  onItemsPerPageChange,
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

  const effectiveTotal = totalItems || cases.length;

  return (
    <div className="flex flex-col gap-3 w-full">

      {toastMessage && (
        <div className="py-2.5 px-3.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-xs flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage?.('')} className="text-green-600 p-0.5 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Spreadsheet styled container matching Excel Screenshot */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Header Bar */}
        <div className="px-4 py-2.5 border-b border-theme-border flex items-center justify-between bg-gray-50/60 dark:bg-theme-surface-alt/30 text-xs">
          <div className="flex items-center gap-1.5 text-theme-main font-semibold">
            <Scale className="w-3.5 h-3.5 text-brand-orange" />
            <span>Superior Courts Case Laws View ({effectiveTotal.toLocaleString()} records)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-theme-muted text-[11px]">Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange?.(Number(e.target.value))}
              className="px-2 py-0.5 bg-theme-surface border border-theme-border rounded text-[11px] text-theme-main focus:outline-none focus:border-brand-orange"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Table styled like Excel grid from user screenshot */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {/* Column Letters matching Excel Screenshot */}
              <tr className="bg-gray-100 dark:bg-gray-800/80 border-b border-theme-border text-[10px] text-theme-muted select-none">
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-14">A</th>
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-20">B</th>
                <th className="py-1 px-3 border-r border-theme-border/40 font-mono min-w-[220px]">C</th>
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-20">D</th>
                <th className="py-1 px-3 border-r border-theme-border/40 font-mono min-w-[260px]">E</th>
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-24">F</th>
                <th className="py-1 px-3 border-r border-theme-border/40 font-mono min-w-[200px]">G</th>
                <th className="py-1 px-3 border-r border-theme-border/40 font-mono min-w-[220px]">H</th>
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-24">I</th>
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-24">J</th>
                <th className="py-1 px-3 text-center border-r border-theme-border/40 font-mono w-28">K</th>
                <th className="py-1 px-3 text-center font-mono w-24">Action</th>
              </tr>
              {/* Column Names from User Excel Screenshot */}
              <tr className="bg-gray-800 text-gray-100 dark:bg-gray-900 border-b border-theme-border font-semibold text-xs">
                <TableHeader title="S.No." sortKey="srNumber" sortConfig={sortConfig} onSort={onSort} className="text-center w-14 text-white" />
                <TableHeader title="Citation" sortKey="citation" sortConfig={sortConfig} onSort={onSort} className="w-20 text-white" />
                <TableHeader title="Case No." sortKey="caseNo" sortConfig={sortConfig} onSort={onSort} className="min-w-[220px] text-white" />
                <TableHeader title="Case Year" sortKey="caseYear" sortConfig={sortConfig} onSort={onSort} className="text-center w-20 text-white" />
                <TableHeader title="Parties" sortKey="parties" sortConfig={sortConfig} onSort={onSort} className="min-w-[260px] text-white" />
                <TableHeader title="Order_Date" sortKey="orderDate" sortConfig={sortConfig} onSort={onSort} className="text-center w-24 text-white" />
                <TableHeader title="Head Notes/ Tag Line" sortKey="headNotes" sortConfig={sortConfig} onSort={onSort} className="min-w-[200px] text-white" />
                <TableHeader title="Bench" sortKey="bench" sortConfig={sortConfig} onSort={onSort} className="min-w-[220px] text-white" />
                <TableHeader title="Apex Court" sortKey="apexCourt" sortConfig={sortConfig} onSort={onSort} className="text-center w-24 text-white" />
                <TableHeader title="Apex Status" sortKey="apexStatus" sortConfig={sortConfig} onSort={onSort} className="text-center w-24 text-white" />
                <th className="px-3 py-2.5 font-semibold text-xs tracking-wider text-white text-center w-28 border-r border-theme-border/40">Downloads</th>
                <th className="px-3 py-2.5 font-semibold text-xs tracking-wider text-white text-center w-24">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-theme-border">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SquareLoader />
                      <span className="text-[11px] text-theme-muted font-medium">Loading case law records...</span>
                    </div>
                  </td>
                </tr>
              ) : cases.length > 0 ? (
                cases.map((item, idx) => {
                  const caseLink = item.caseNoLink && item.caseNoLink.trim() && item.caseNoLink !== 'Nil' ? item.caseNoLink : null;
                  const hasDownload = item.downloadLink && item.downloadLink.trim() && item.downloadLink !== 'Nil';
                  const downloadLink = hasDownload ? item.downloadLink : null;

                  return (
                    <tr 
                      key={item.mongoId || item.id || idx}
                      className="hover:bg-blue-50/40 dark:hover:bg-theme-surface-hover/50 transition-colors"
                    >
                      {/* A: S.No. (Exact same as Excel) */}
                      <td className="px-3 py-2 text-center font-medium text-theme-muted border-r border-theme-border/40 whitespace-nowrap">
                        {item.srNumber != null ? item.srNumber : ((currentPage - 1) * itemsPerPage + idx + 1)}
                      </td>

                      {/* B: Citation */}
                      <td className="px-3 py-2 text-theme-main font-mono text-[11px] whitespace-nowrap border-r border-theme-border/40">
                        {item.citation || 'Nil'}
                      </td>

                      {/* C: Case No. (Hyperlink enabled) */}
                      <td className="px-3 py-2 font-medium text-[11px] border-r border-theme-border/40">
                        {caseLink ? (
                          <a
                            href={caseLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 group font-mono font-medium"
                            title={`Open case record in new tab: ${item.caseNo}`}
                          >
                            <span>{item.caseNo}</span>
                            <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
                          </a>
                        ) : (
                          <span className="font-mono text-gray-800 dark:text-gray-200">{item.caseNo}</span>
                        )}
                      </td>

                      {/* D: Case Year */}
                      <td className="px-3 py-2 text-center font-mono text-[11px] text-theme-main whitespace-nowrap border-r border-theme-border/40">
                        {item.caseYear || '-'}
                      </td>

                      {/* E: Parties */}
                      <td className="px-3 py-2 text-theme-main font-medium leading-snug border-r border-theme-border/40">
                        <button
                          type="button"
                          onClick={() => setViewModalItem(item)}
                          className="hover:underline text-left cursor-pointer text-gray-900 dark:text-gray-100 font-serif"
                        >
                          {item.parties || item.caseTitle || '-'}
                        </button>
                      </td>

                      {/* F: Order Date */}
                      <td className="px-3 py-2 text-center whitespace-nowrap text-theme-muted font-mono text-[11px] border-r border-theme-border/40">
                        {item.orderDate || item.judgmentDate || '-'}
                      </td>

                      {/* G: Head Notes / Tag Line */}
                      <td className="px-3 py-2 text-theme-muted text-[11px] leading-relaxed border-r border-theme-border/40 max-w-xs truncate" title={item.headNotes || ''}>
                        {item.headNotes || '-'}
                      </td>

                      {/* H: Bench */}
                      <td className="px-3 py-2 text-theme-main text-[11px] border-r border-theme-border/40 leading-snug">
                        {item.bench || item.authorJudge || '-'}
                      </td>

                      {/* I: Apex Court */}
                      <td className="px-3 py-2 text-center text-theme-muted font-semibold text-[11px] whitespace-nowrap border-r border-theme-border/40">
                        {item.apexCourt || '-'}
                      </td>

                      {/* J: Apex Status */}
                      <td className="px-3 py-2 text-center text-theme-muted text-[11px] whitespace-nowrap border-r border-theme-border/40">
                        {item.apexStatus || '-'}
                      </td>

                      {/* K: Downloads (Show option only if entry exists, else show —) */}
                      <td className="px-3 py-2 text-center whitespace-nowrap border-r border-theme-border/40">
                        {downloadLink ? (
                          <a
                            href={downloadLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-600 dark:text-cyan-400 hover:underline font-mono text-[11px] inline-flex items-center gap-1 cursor-pointer font-bold"
                            title={`Download Judgment for ${item.caseNo}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span>Download PDF</span>
                          </a>
                        ) : (
                          <span className="text-theme-disabled font-bold text-sm select-none">—</span>
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-theme-muted">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Search className="w-6 h-6 text-theme-muted" />
                      <p className="text-xs font-semibold text-theme-main">No case law records found</p>
                      <p className="text-[11px] text-theme-muted">Try adjusting your search criteria or click "All".</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && effectiveTotal > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={effectiveTotal}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
          />
        )}
      </div>

      {/* View Modal */}
      <Modal
        isOpen={Boolean(viewModalItem)}
        onClose={() => setViewModalItem(null)}
        title="Superior Court Judgment Details"
        subtitle={`Case No: ${viewModalItem?.caseNo} • Order Date: ${viewModalItem?.orderDate || viewModalItem?.judgmentDate}`}
        icon={Scale}
        maxWidth="max-w-2xl"
        footer={<Button variant="outline" size="sm" onClick={() => setViewModalItem(null)}>Close</Button>}
      >
        {viewModalItem && (
          <div className="space-y-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-orange tracking-wider">Parties to Suit / Case</span>
              <h3 className="text-sm font-bold text-theme-main leading-snug mt-0.5 font-serif">
                {viewModalItem.parties || viewModalItem.caseTitle}
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-gray-50 dark:bg-theme-surface-alt border border-theme-border">
              <div>
                <span className="text-[10px] text-theme-muted block font-semibold">Case No</span>
                {viewModalItem.caseNoLink ? (
                  <a href={viewModalItem.caseNoLink} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 hover:underline">
                    {viewModalItem.caseNo}
                  </a>
                ) : (
                  <span className="font-mono text-theme-main">{viewModalItem.caseNo}</span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-theme-muted block font-semibold">Citation</span>
                <span className="font-semibold text-theme-main">{viewModalItem.citation || 'Nil'}</span>
              </div>
              <div>
                <span className="text-[10px] text-theme-muted block font-semibold">Case Year</span>
                <span className="font-semibold text-theme-main">{viewModalItem.caseYear || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-theme-muted block font-semibold">Order Date</span>
                <span className="font-mono text-theme-main">{viewModalItem.orderDate || viewModalItem.judgmentDate}</span>
              </div>
            </div>

            {viewModalItem.bench && (
              <div>
                <span className="text-[10px] text-theme-muted block font-semibold">Bench / Coram</span>
                <span className="font-semibold text-theme-main">{viewModalItem.bench}</span>
              </div>
            )}

            {(viewModalItem.apexCourt || viewModalItem.apexStatus) && (
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg bg-gray-50 dark:bg-theme-surface-alt border border-theme-border">
                <div>
                  <span className="text-[10px] text-theme-muted block font-semibold">Apex Court</span>
                  <span className="font-semibold text-theme-main">{viewModalItem.apexCourt || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-theme-muted block font-semibold">Apex Status</span>
                  <span className="font-semibold text-theme-main">{viewModalItem.apexStatus || '-'}</span>
                </div>
              </div>
            )}

            {(viewModalItem.downloadLink || viewModalItem.caseNoLink) && (
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-500" />
                  <div>
                    <span className="font-semibold text-theme-main block">Official Certified Judgment Order</span>
                    <span className="text-[10px] text-theme-muted font-mono">{viewModalItem.caseNo}.pdf</span>
                  </div>
                </div>
                <a
                  href={viewModalItem.downloadLink || viewModalItem.caseNoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-brand-orange hover:bg-orange-600 text-white rounded text-xs flex items-center gap-1.5 font-bold transition-colors shadow-xs"
                >
                  <DownloadCloud className="w-3.5 h-3.5" /> Download Order PDF
                </a>
              </div>
            )}

            {viewModalItem.headNotes && (
              <div>
                <span className="text-[10px] uppercase font-bold text-theme-muted block mb-1">Head Notes / Tag Line</span>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-theme-surface-alt border border-theme-border text-theme-main leading-relaxed">
                  {viewModalItem.headNotes}
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
            {deleteModalItem?.caseNo} – {deleteModalItem?.parties || deleteModalItem?.caseTitle}
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ManageOtherCasesTable;
