import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowUpDown, 
  ArrowUp,
  ArrowDown,
  Calendar, 
  Paperclip, 
  Eye, 
  Pencil, 
  Trash2, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Scale, 
  FileText, 
  Download, 
  Upload, 
  FileDown
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import FileUpload from '../../../components/ui/FileUpload';
import SquareLoader from '../../../components/ui/SquareLoader';
import { caseService } from '../services/caseService';

const TableHeader = ({ title, sortKey, sortConfig, onSort, icon: HeaderIcon, widthClassName = '' }) => {
  const isSorted = sortKey && sortConfig?.key === sortKey;
  const direction = isSorted ? sortConfig?.direction : null;

  return (
    <th 
      onClick={() => sortKey && onSort?.(sortKey)}
      className={`px-2 py-3 font-semibold text-theme-main align-top select-none ${widthClassName} ${sortKey ? 'cursor-pointer hover:bg-theme-surface-alt/80 transition-colors group' : ''}`}
    >
      <div className="flex items-start gap-1">
        {HeaderIcon && <HeaderIcon className="w-3.5 h-3.5 text-theme-disabled shrink-0 mt-0.5" />}
        <span className={`leading-tight ${isSorted ? 'text-brand-orange font-bold' : ''}`}>{title}</span>
        {sortKey && (
          <span className="shrink-0 mt-0.5">
            {direction === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-brand-orange" />
            ) : direction === 'desc' ? (
              <ArrowDown className="w-3.5 h-3.5 text-brand-orange" />
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 text-theme-disabled group-hover:text-brand-orange transition-colors" />
            )}
          </span>
        )}
      </div>
    </th>
  );
};

const ManageCasesTable = ({
  cases: propCases,
  setCases: propSetCases,
  selectedIds: propSelectedIds,
  setSelectedIds: propSetSelectedIds,
  toastMessage: propToastMessage,
  setToastMessage: propSetToastMessage,
  currentPage: propCurrentPage,
  setCurrentPage: propSetCurrentPage,
  highlightedId,
  onExportSelection,
  isLoading = false
}) => {
  const navigate = useNavigate();
  const [internalCases, setInternalCases] = useState([]);
  const [internalSelectedIds, setInternalSelectedIds] = useState([]);
  const [internalToastMessage, setInternalToastMessage] = useState('');
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    if (!propCases) {
      setInternalLoading(true);
      caseService.getCases()
        .then(data => setInternalCases(data))
        .finally(() => setInternalLoading(false));
    }
  }, [propCases]);
  
  const cases = propCases || internalCases;
  const setCases = propSetCases || setInternalCases;
  const loading = isLoading || internalLoading;
  const selectedIds = propSelectedIds !== undefined ? propSelectedIds : internalSelectedIds;
  const setSelectedIds = propSetSelectedIds || setInternalSelectedIds;
  const toastMessage = propToastMessage !== undefined ? propToastMessage : internalToastMessage;
  const setToastMessage = propSetToastMessage || setInternalToastMessage;
  const currentPage = propCurrentPage !== undefined ? propCurrentPage : internalCurrentPage;
  const setCurrentPage = propSetCurrentPage || setInternalCurrentPage;

  const [viewModalCase, setViewModalCase] = useState(null);
  const [deleteModalCase, setDeleteModalCase] = useState(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [editModalCase, setEditModalCase] = useState(null);
  const [editConfirmationInput, setEditConfirmationInput] = useState('');
  const [editError, setEditError] = useState('');
  const [attachmentModalCase, setAttachmentModalCase] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const itemsPerPage = 10;
  
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

  const sortedCases = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return cases;

    const { key, direction } = sortConfig;
    const isAsc = direction === 'asc';

    return [...cases].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];

      if (key === 'sldNumber') {
        valA = a.sldNumber || a.id;
        valB = b.sldNumber || b.id;
      } else if (key === 'mapYearPage') {
        valA = Array.isArray(a.mapYearPage) && a.mapYearPage.length 
          ? a.mapYearPage.join(', ') 
          : (a.publications?.map(p => `${p.mag || 'SLD'} ${p.year || ''} ${p.page || ''}`).join(', ') || '');
        valB = Array.isArray(b.mapYearPage) && b.mapYearPage.length 
          ? b.mapYearPage.join(', ') 
          : (b.publications?.map(p => `${p.mag || 'SLD'} ${p.year || ''} ${p.page || ''}`).join(', ') || '');
      } else if (key === 'month') {
        valA = a.dated ? new Date(a.dated).getMonth() : -1;
        valB = b.dated ? new Date(b.dated).getMonth() : -1;
        return isAsc ? valA - valB : valB - valA;
      } else if (key === 'attachments') {
        valA = Array.isArray(a.attachments) ? a.attachments.length : (typeof a.attachments === 'number' ? a.attachments : (a.attachments ? 1 : 0));
        valB = Array.isArray(b.attachments) ? b.attachments.length : (typeof b.attachments === 'number' ? b.attachments : (b.attachments ? 1 : 0));
        return isAsc ? valA - valB : valB - valA;
      }

      if (valA === null || valA === undefined || valA === '') return 1;
      if (valB === null || valB === undefined || valB === '') return -1;

      if (Array.isArray(valA)) valA = valA.join(', ');
      if (Array.isArray(valB)) valB = valB.join(', ');

      if (key === 'dated') {
        const dateA = new Date(valA).getTime();
        const dateB = new Date(valB).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return isAsc ? dateA - dateB : dateB - dateA;
        }
      }

      const numA = typeof valA === 'number' ? valA : (!isNaN(Number(valA)) && String(valA).trim() !== '' ? Number(valA) : null);
      const numB = typeof valB === 'number' ? valB : (!isNaN(Number(valB)) && String(valB).trim() !== '' ? Number(valB) : null);

      if (numA !== null && numB !== null) {
        return isAsc ? numA - numB : numB - numA;
      }

      const strA = String(valA);
      const strB = String(valB);
      const result = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
      return isAsc ? result : -result;
    });
  }, [cases, sortConfig]);

  const totalItems = sortedCases.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const currentData = sortedCases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startIdx = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

  const isAllCurrentSelected = currentData.length > 0 && currentData.every(item => selectedIds.includes(item.id));
  const isAllTotalSelected = cases.length > 0 && cases.every(item => selectedIds.includes(item.id));

  // Scroll to highlighted case row
  useEffect(() => {
    if (highlightedId) {
      const timer = setTimeout(() => {
        const rowEl = document.getElementById(`case-row-${highlightedId}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [highlightedId, currentPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = currentData.map(item => item.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(currentData.map(item => item.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleEdit = (item) => {
    setEditModalCase(item);
    setEditConfirmationInput('');
    setEditError('');
  };

  const handleEditConfirm = (e) => {
    e?.preventDefault();
    if (!editModalCase) return;

    const requiredKey = (editModalCase.caseId || editModalCase.case_id || `CASE-${String(editModalCase.sldNumber).padStart(6, '0')}`).trim().toLowerCase();
    const enteredInput = editConfirmationInput.trim().toLowerCase();

    if (enteredInput !== requiredKey) {
      setEditError('Invalid secret code. Please enter the correct secret code to proceed.');
      return;
    }

    const targetCase = editModalCase;
    setEditModalCase(null);
    setEditConfirmationInput('');
    setEditError('');
    navigate('/manage-cases/add', { state: { caseData: targetCase, isEdit: true } });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalCase) return;
    
    if (!deleteModalCase.isBulk) {
      const requiredKey = (deleteModalCase.caseId || deleteModalCase.case_id || `CASE-${String(deleteModalCase.sldNumber).padStart(6, '0')}`).trim().toLowerCase();
      const enteredInput = deleteConfirmationInput.trim().toLowerCase();

      if (enteredInput !== requiredKey) {
        setDeleteError('Invalid secret code. Please enter the correct secret code to confirm deletion.');
        return;
      }
    }

    try {
      if (deleteModalCase.isBulk) {
        await caseService.deleteCases(selectedIds);
        setCases(prev => prev.filter(c => !selectedIds.includes(c.id)));
        setToastMessage(`${deleteModalCase.count} cases deleted successfully.`);
        setSelectedIds([]);
      } else {
        await caseService.deleteCase(deleteModalCase.id);
        setCases(prev => prev.filter(c => c.id !== deleteModalCase.id));
        setSelectedIds(prev => prev.filter(id => id !== deleteModalCase.id));
        const displayId = deleteModalCase.caseId || deleteModalCase.case_id || `SLD #${deleteModalCase.sldNumber}`;
        setToastMessage(`Case ${displayId} deleted successfully.`);
      }
    } catch (err) {
      setToastMessage(`Failed to delete records: ${err.message}`);
    }
    
    setDeleteModalCase(null);
    setDeleteConfirmationInput('');
    setDeleteError('');
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleDownloadSingleFile = (fileName, caseItem) => {
    const content = `SLD SYSTEM - ATTACHMENT EXPORT\nFile: ${fileName}\nCase: SLD #${caseItem.sldNumber}\nCourt: ${caseItem.court}\nDated: ${caseItem.dated}\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToastMessage(`Downloading "${fileName}"...`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleDownloadAllAttachments = (caseItem) => {
    const fileName = `Attachments_Bundle_SLD_${caseItem.sldNumber}.txt`;
    const content = `SLD SYSTEM - CASE ATTACHMENTS BUNDLE\nSLD #${caseItem.sldNumber}\nCourt: ${caseItem.court}\nAttachments: ${caseItem.attachments || 1}\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToastMessage(`Downloading all attachments for Case SLD #${caseItem.sldNumber}...`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  return (
    <div className="flex flex-col mb-8 animate-fade-in relative gap-3">
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl flex items-center justify-between text-sm animate-fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {toastMessage}
          </div>
          <button onClick={() => setToastMessage('')} className="text-theme-muted hover:text-theme-main">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 bg-brand-orange/10 border border-brand-orange/20 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm animate-fade-in">
            <div className="flex items-center gap-2 text-theme-main font-medium">
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></span>
              <span><strong className="text-brand-orange">{selectedIds.length}</strong> {selectedIds.length === 1 ? 'case' : 'cases'} selected</span>
              {!isAllTotalSelected && (
                <button 
                  onClick={() => setSelectedIds(cases.map(c => c.id))}
                  className="text-xs text-brand-orange underline hover:text-[#D44E35] ml-2 font-semibold transition-colors"
                >
                  Select all {cases.length} records
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onExportSelection && (
                <button
                  type="button"
                  onClick={() => onExportSelection('pdf')}
                  className="px-2.5 py-1 rounded-lg bg-brand-orange hover:bg-[#D44E35] text-white text-xs font-medium transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Export ({selectedIds.length})
                </button>
              )}
              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main text-xs font-medium transition-colors"
              >
                Deselect All
              </button>
              <button
                onClick={() => setDeleteModalCase({ isBulk: true, count: selectedIds.length })}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedIds.length})
              </button>
            </div>
          </div>
        ) : (
          <div />
        )}

        <span className="text-sm font-semibold text-brand-orange ml-auto">
          Total Records: {totalItems}
        </span>
      </div>

      {/* Table Container */}
      <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left table-fixed">
            <thead className="bg-theme-table-header border-b border-theme-border text-theme-main">
              <tr>
                <th className="px-3 py-3 w-[3%] text-center">
                  <input 
                    type="checkbox" 
                    checked={isAllCurrentSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = !isAllCurrentSelected && currentData.some(item => selectedIds.includes(item.id));
                      }
                    }}
                    onChange={handleToggleSelectAll}
                    title="Select all cases on this page"
                    className="w-4 h-4 rounded border-theme-border bg-theme-surface text-brand-orange focus:ring-brand-orange cursor-pointer accent-[#E55C41]" 
                  />
                </th>
                <TableHeader title="SLD #" sortKey="sldNumber" sortConfig={sortConfig} onSort={handleSort} widthClassName="w-[5%]" />
                <TableHeader title="Dated" sortKey="dated" sortConfig={sortConfig} onSort={handleSort} widthClassName="w-[6%]" />
                <TableHeader title="Map / Year / Page" widthClassName="w-[12%]" />
                <TableHeader title="Court" widthClassName="w-[9%]" />
                <TableHeader title="Case #" widthClassName="w-[13%]" />
                <TableHeader title="Judges" widthClassName="w-[13%]" />
                <TableHeader title="Lawyers" widthClassName="w-[12%]" />
                <TableHeader title="Petitioners" widthClassName="w-[12%]" />
                <TableHeader title="Attachment" widthClassName="w-[6%]" />
                <th className="px-2 py-3 font-semibold text-theme-main align-top w-[8%]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/50">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center">
                    <SquareLoader text="Loading Case Law records..." />
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-sm text-theme-muted">
                    No Case Law records found.
                  </td>
                </tr>
              ) : (
                currentData.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isHighlighted = highlightedId === item.id;
                return (
                  <tr 
                    key={item.id} 
                    id={`case-row-${item.id}`}
                    className={`transition-all duration-300 ${
                      isHighlighted
                        ? 'bg-brand-orange/20 dark:bg-brand-orange/30 ring-2 ring-brand-orange font-medium animate-pulse shadow-sm'
                        : isSelected 
                        ? 'bg-brand-orange/5 dark:bg-brand-orange/10' 
                        : 'hover:bg-theme-surface-alt/50'
                    }`}
                  >
                    <td className="px-3 py-4 align-top text-center">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleToggleRow(item.id)}
                        className="w-4 h-4 rounded border-theme-border bg-theme-surface text-brand-orange focus:ring-brand-orange mt-1 cursor-pointer accent-[#E55C41]" 
                      />
                    </td>
                    <td className="px-2 py-4 align-top text-theme-muted break-words">{item.sldNumber}</td>
                    <td className="px-2 py-4 align-top text-theme-muted">{item.dated ? item.dated.split('T')[0] : ''}</td>
                    <td className="px-2 py-4 align-top text-theme-muted" style={{ minWidth: '210px' }}>
                      <div className="flex flex-wrap gap-1 whitespace-nowrap overflow-hidden">
                        {(Array.isArray(item.mapYearPage) ? item.mapYearPage.filter(Boolean) : [])
                          .reduce((unique, line) => {
                            if (!unique.includes(line)) unique.push(line);
                            return unique;
                          }, [])
                          .slice(0, 2)
                          .map((line, i) => (
                            <span key={`${line}-${i}`} className="inline-block whitespace-nowrap">{line}</span>
                          ))}
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top text-theme-main font-medium">{item.court}</td>
                    <td className="px-2 py-4 align-top text-theme-muted">
                      <div className="flex flex-col gap-1">
                        {item.caseNumber.map((line, i) => <span key={i}>{line}</span>)}
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top text-theme-muted">
                      <div className="flex flex-col gap-1">
                        {item.judges.map((line, i) => <span key={i}>{line}</span>)}
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top text-theme-muted">
                      <div className="flex flex-col gap-1">
                        {item.lawyers.map((line, i) => <span key={i}>{line}</span>)}
                        {item.lawyersMore && <span className="text-brand-orange font-medium mt-1">{item.lawyersMore}</span>}
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top text-theme-muted">
                      <div className="flex flex-col gap-1">
                        {item.petitioners.map((line, i) => <span key={i}>{line}</span>)}
                        {item.petitionersMore && <span className="text-brand-orange font-medium mt-1">{item.petitionersMore}</span>}
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top">
                      <button 
                        type="button"
                        onClick={() => setAttachmentModalCase(item)}
                        className="flex items-center gap-1 text-theme-muted hover:text-brand-orange transition-colors cursor-pointer px-1.5 py-1 rounded-md hover:bg-brand-orange/10 group"
                        title="View & Manage Attachments"
                      >
                        <Paperclip className="w-4 h-4 text-brand-orange shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="text-brand-orange font-semibold text-xs">({item.attachments || 1})</span>
                      </button>
                    </td>
                    <td className="px-2 py-4 align-top">
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setViewModalCase(item)}
                          className="p-1.5 text-theme-muted hover:text-brand-orange border border-theme-border rounded-lg hover:bg-orange-50 dark:hover:bg-brand-orange/10 transition-colors" 
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-theme-muted hover:text-blue-500 border border-theme-border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" 
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setDeleteModalCase(item)}
                          className="p-1.5 text-theme-muted hover:text-red-500 border border-theme-border rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" 
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-theme-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-theme-surface">
          <span className="text-sm text-theme-muted">Showing {startIdx} to {endIdx} of <strong className="font-semibold text-theme-main">{totalItems}</strong> entries</span>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const page = idx + 1;
              return (
                <button 
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${
                    currentPage === page 
                      ? 'bg-[#641E16] text-white font-medium hover:bg-[#4A1610]' 
                      : 'text-theme-muted border border-theme-border hover:bg-theme-surface-alt'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 h-8 flex items-center justify-center rounded text-sm text-theme-muted border border-theme-border hover:bg-theme-surface-alt transition-colors gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* View Case Details Modal */}
      <Modal
        isOpen={Boolean(viewModalCase)}
        onClose={() => setViewModalCase(null)}
        title="Case Details"
        subtitle={`SLD #${viewModalCase?.sldNumber} • ${viewModalCase?.dated}`}
        icon={Scale}
        footer={
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setViewModalCase(null)}
            >
              Close
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              className="bg-brand-orange hover:bg-[#D44E35] text-white"
              onClick={() => {
                const toEdit = viewModalCase;
                setViewModalCase(null);
                handleEdit(toEdit);
              }}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Record
            </Button>
          </>
        }
      >
        {viewModalCase && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
                <span className="block text-xs text-theme-muted mb-1 font-medium">Court</span>
                <span className="font-semibold text-theme-main">{viewModalCase.court}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
              <span className="block text-xs text-theme-muted mb-1 font-medium">Case Number</span>
              <p className="text-theme-main leading-relaxed whitespace-pre-line">{viewModalCase.caseNumber.join(' ')}</p>
            </div>

            <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
              <span className="block text-xs text-theme-muted mb-1 font-medium">Judges</span>
              <p className="text-theme-main leading-relaxed">{viewModalCase.judges.join(' ')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
                <span className="block text-xs text-theme-muted mb-1 font-medium">Petitioners</span>
                <p className="text-theme-main leading-relaxed">{viewModalCase.petitioners.join(' ')}</p>
              </div>
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
                <span className="block text-xs text-theme-muted mb-1 font-medium">Lawyers</span>
                <p className="text-theme-main leading-relaxed">{viewModalCase.lawyers.join(' ')}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
              <span className="block text-xs text-theme-muted mb-1 font-medium">Publications / Citation Mapping</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {viewModalCase.mapYearPage.map((map, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-md text-xs font-medium bg-theme-surface border border-theme-border text-theme-main">
                    {map}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteModalCase)}
        onClose={() => {
          setDeleteModalCase(null);
          setDeleteConfirmationInput('');
          setDeleteError('');
        }}
        maxWidth="max-w-md"
      >
        {deleteModalCase && (
          <div>
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-theme-main">
                  {deleteModalCase.isBulk ? 'Delete Selected Cases' : 'Delete Case Record'}
                </h3>
                <p className="text-xs text-theme-muted">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {deleteModalCase.isBulk ? (
              <p className="text-sm text-theme-muted leading-relaxed mb-4">
                Are you sure you want to delete <strong className="text-theme-main">{deleteModalCase.count} selected cases</strong>?
              </p>
            ) : (
              <div className="mb-5 space-y-2">
                <label className="block text-xs font-semibold text-theme-main">
                  To perform this action enter secret code:
                </label>
                <input
                  type="text"
                  value={deleteConfirmationInput}
                  onChange={(e) => {
                    setDeleteConfirmationInput(e.target.value);
                    if (deleteError) setDeleteError('');
                  }}
                  placeholder="Enter secret code"
                  className="w-full px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-sm text-theme-main placeholder:text-theme-disabled focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors font-mono"
                  autoFocus
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setDeleteModalCase(null);
                  setDeleteConfirmationInput('');
                  setDeleteError('');
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                disabled={!deleteModalCase.isBulk && deleteConfirmationInput.trim().toLowerCase() !== (deleteModalCase.caseId || deleteModalCase.case_id || `CASE-${String(deleteModalCase.sldNumber).padStart(6, '0')}`).toLowerCase()}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                onClick={handleDeleteConfirm}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete {deleteModalCase.isBulk ? `${deleteModalCase.count} Cases` : 'Record'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Secret Code Confirmation Modal */}
      <Modal
        isOpen={Boolean(editModalCase)}
        onClose={() => {
          setEditModalCase(null);
          setEditConfirmationInput('');
          setEditError('');
        }}
        maxWidth="max-w-md"
      >
        {editModalCase && (
          <div>
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0 border border-brand-orange/20">
                <Pencil className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-theme-main">Edit Case Record</h3>
                <p className="text-xs text-theme-muted">Enter the secret code to authorize editing.</p>
              </div>
            </div>

            {editError && (
              <div className="mb-4 p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditConfirm}>
              <div className="mb-5 space-y-2">
                <label className="block text-xs font-semibold text-theme-main">
                  To perform this action enter secret code:
                </label>
                <input
                  type="text"
                  value={editConfirmationInput}
                  onChange={(e) => {
                    setEditConfirmationInput(e.target.value);
                    if (editError) setEditError('');
                  }}
                  placeholder="Enter secret code"
                  className="w-full px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-sm text-theme-main placeholder:text-theme-disabled focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors font-mono"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  type="button"
                  onClick={() => {
                    setEditModalCase(null);
                    setEditConfirmationInput('');
                    setEditError('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  type="submit"
                  disabled={editConfirmationInput.trim().toLowerCase() !== (editModalCase.caseId || editModalCase.case_id || `CASE-${String(editModalCase.sldNumber).padStart(6, '0')}`).toLowerCase()}
                  className="bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Proceed to Edit
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Case Attachments Modal */}
      <Modal
        isOpen={Boolean(attachmentModalCase)}
        onClose={() => setAttachmentModalCase(null)}
        title="Case Attachments"
        subtitle={attachmentModalCase ? `SLD #${attachmentModalCase.sldNumber} • ${attachmentModalCase.court}` : ''}
        icon={Paperclip}
        maxWidth="max-w-xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-theme-muted">
              {attachmentModalCase ? `${attachmentModalCase.attachments || 1} file(s) attached` : ''}
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAttachmentModalCase(null)}
              >
                Close
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                className="bg-brand-orange hover:bg-[#D44E35] text-white flex items-center gap-1.5"
                onClick={() => {
                  if (attachmentModalCase) {
                    handleDownloadAllAttachments(attachmentModalCase);
                  }
                }}
              >
                <Download className="w-4 h-4" /> Download All
              </Button>
            </div>
          </div>
        }
      >
        {attachmentModalCase && (
          <div className="space-y-5">
            {/* List of current attachments */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-theme-muted flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-orange" />
                Attached Documents ({attachmentModalCase.attachments || 1})
              </h4>
              
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {[
                  {
                    name: `Order_Sheet_SLD_${attachmentModalCase.sldNumber}.pdf`,
                    size: '1.84 MB',
                    date: attachmentModalCase.dated || '2025-05-06',
                    type: 'pdf'
                  },
                  ...(attachmentModalCase.attachments > 1 ? [
                    {
                      name: `Certified_Judgment_Order_${attachmentModalCase.sldNumber}.docx`,
                      size: '920 KB',
                      date: attachmentModalCase.dated || '2025-05-06',
                      type: 'word'
                    }
                  ] : []),
                  ...(attachmentModalCase.attachments > 2 ? [
                    {
                      name: `Petition_Annexure_A_${attachmentModalCase.sldNumber}.pdf`,
                      size: '480 KB',
                      date: attachmentModalCase.dated || '2025-05-06',
                      type: 'pdf'
                    }
                  ] : [])
                ].map((file, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-theme-border bg-theme-surface-alt/40 hover:bg-theme-surface-alt transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="p-2 rounded-lg bg-theme-surface border border-theme-border/50 shadow-sm text-brand-orange">
                        {file.type === 'pdf' ? <FileText className="w-5 h-5 text-red-500" /> : <FileDown className="w-5 h-5 text-blue-500" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-theme-main truncate">
                          {file.name}
                        </span>
                        <span className="text-[11px] text-theme-muted">
                          {file.size} • Added on {file.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleFile(file.name, attachmentModalCase)}
                        className="p-1.5 text-theme-muted hover:text-brand-orange border border-theme-border rounded-lg hover:bg-brand-orange/10 transition-colors"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload New Attachment Section */}
            <div className="space-y-2.5 pt-3 border-t border-theme-border/50">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-theme-muted flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-brand-orange" />
                Upload Additional Files
              </h4>
              <FileUpload 
                multiple={true}
                onFileSelect={(files) => {
                  const count = Array.isArray(files) ? files.length : files ? 1 : 0;
                  if (count > 0) {
                    setCases(prev => prev.map(c => c.id === attachmentModalCase.id ? { ...c, attachments: (c.attachments || 1) + count } : c));
                    setToastMessage(`Added ${count} new attachment(s) to Case SLD #${attachmentModalCase.sldNumber}.`);
                    setTimeout(() => setToastMessage(''), 3500);
                  }
                }}
              />
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default ManageCasesTable;


