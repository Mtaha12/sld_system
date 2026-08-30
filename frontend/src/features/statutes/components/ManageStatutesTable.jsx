import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Pencil, 
  Trash2, 
  CalendarClock, 
  X, 
  ArrowUpDown, 
  ArrowUp,
  ArrowDown,
  AlertTriangle, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import DatePicker from '../../../components/ui/DatePicker';
import Modal from '../../../components/ui/Modal';
import SquareLoader from '../../../components/ui/SquareLoader';
import { statuteService } from '../services/statuteService';

const TableHeader = ({ title, sortKey, sortConfig, onSort, className }) => {
  const isSorted = sortConfig?.key === sortKey;
  const direction = isSorted ? sortConfig.direction : null;

  return (
    <th 
      onClick={() => sortKey && onSort?.(sortKey)}
      className={`px-6 py-4 font-medium align-top select-none ${className || ''} ${sortKey ? 'cursor-pointer hover:bg-theme-surface-alt/80 transition-colors group' : ''}`}
    >
      <div className="flex items-center gap-1">
        <span className={`leading-tight ${isSorted ? 'text-brand-orange font-bold' : ''}`}>{title}</span>
        {sortKey && (
          <span className="shrink-0">
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

const ManageStatutesTable = ({
  statutes: propStatutes,
  setStatutes: propSetStatutes,
  highlightedId,
  toastMessage: propToastMessage,
  setToastMessage: propSetToastMessage,
  isLoading = false
}) => {
  const navigate = useNavigate();
  const [internalStatutes, setInternalStatutes] = useState([]);
  const [internalToastMessage, setInternalToastMessage] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    if (!propStatutes) {
      setInternalLoading(true);
      statuteService.getStatutes()
        .then(data => setInternalStatutes(data))
        .finally(() => setInternalLoading(false));
    }
  }, [propStatutes]);

  const statutes = propStatutes || internalStatutes;
  const setStatutes = propSetStatutes || setInternalStatutes;
  const loading = isLoading || internalLoading;
  const toastMessage = propToastMessage !== undefined ? propToastMessage : internalToastMessage;
  const setToastMessage = propSetToastMessage || setInternalToastMessage;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSrNumber, setModalSrNumber] = useState('');
  const [modalDate, setModalDate] = useState(null);
  const [modalError, setModalError] = useState('');
  const [viewModalItem, setViewModalItem] = useState(null);
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [editModalItem, setEditModalItem] = useState(null);
  const [editConfirmationInput, setEditConfirmationInput] = useState('');
  const [editError, setEditError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
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

  const sortedStatutes = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return statutes;

    const { key, direction } = sortConfig;
    const isAsc = direction === 'asc';

    return [...statutes].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];

      if (key === 'id') {
        valA = a.id !== undefined ? a.id : a.srNumber;
        valB = b.id !== undefined ? b.id : b.srNumber;
      }

      if (valA === null || valA === undefined || valA === '') return 1;
      if (valB === null || valB === undefined || valB === '') return -1;

      if (Array.isArray(valA)) valA = valA.join(', ');
      if (Array.isArray(valB)) valB = valB.join(', ');

      if (key.toLowerCase().includes('date') || key === 'dated') {
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
  }, [statutes, sortConfig]);

  const totalItems = sortedStatutes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const currentData = sortedStatutes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startIdx = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

  // Smooth scroll to highlighted statute row
  useEffect(() => {
    if (highlightedId) {
      const timer = setTimeout(() => {
        const rowEl = document.getElementById(`statute-row-${highlightedId}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [highlightedId]);

  const handleUpdateDate = () => {
    setModalError('');
    if (!modalSrNumber || !modalDate) {
      setModalError('Please provide both SR # and Date.');
      return;
    }

    const srNumInt = parseInt(modalSrNumber, 10);
    const index = statutes.findIndex(s => s.id === srNumInt);
    
    if (index === -1) {
      setModalError('SR # not found.');
      return;
    }

    // Update the date
    const updatedStatutes = [...statutes];
    const formattedDate = `${String(modalDate.getMonth() + 1).padStart(2, '0')}/${String(modalDate.getDate()).padStart(2, '0')}/${modalDate.getFullYear()}`;
    
    updatedStatutes[index].dated = formattedDate;
    setStatutes(updatedStatutes);
    
    // Reset and close
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalSrNumber('');
    setModalDate(null);
    setModalError('');
  };

  const handleEdit = (row) => {
    setEditModalItem(row);
    setEditConfirmationInput('');
    setEditError('');
  };

  const handleEditConfirm = (e) => {
    e?.preventDefault();
    if (!editModalItem) return;

    const requiredKey = (editModalItem.statuteId || editModalItem.statute_id || `STAT-${String(editModalItem.srNumber || editModalItem.id).padStart(6, '0')}`).trim().toLowerCase();
    const enteredInput = editConfirmationInput.trim().toLowerCase();

    if (enteredInput !== requiredKey) {
      setEditError('Invalid secret code. Please enter the correct secret code to proceed.');
      return;
    }

    const targetItem = editModalItem;
    setEditModalItem(null);
    setEditConfirmationInput('');
    setEditError('');
    navigate('/manage-statutes/add', { state: { statuteData: targetItem, isEdit: true } });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalItem) return;

    const requiredKey = (deleteModalItem.statuteId || deleteModalItem.statute_id || `STAT-${String(deleteModalItem.srNumber || deleteModalItem.id).padStart(6, '0')}`).trim().toLowerCase();
    const enteredInput = deleteConfirmationInput.trim().toLowerCase();

    if (enteredInput !== requiredKey) {
      setDeleteError('Invalid secret code. Please enter the correct secret code to confirm deletion.');
      return;
    }

    try {
      await statuteService.deleteStatute(deleteModalItem.id);
      setStatutes(prev => prev.filter(s => s.id !== deleteModalItem.id));
      const displayId = deleteModalItem.statuteId || deleteModalItem.statute_id || `Statute #${deleteModalItem.id}`;
      setToastMessage(`Statute ${displayId} deleted successfully.`);
    } catch (err) {
      setToastMessage(`Failed to delete record: ${err.message}`);
    }

    setDeleteModalItem(null);
    setDeleteConfirmationInput('');
    setDeleteError('');
    setTimeout(() => setToastMessage(''), 3500);
  };

  return (
    <div className="flex flex-col gap-3 relative animate-fade-in">
      
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

      {/* Table Header Controls */}
      <div className="flex items-center justify-between w-full px-2">
        <Button 
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="bg-theme-surface hover:bg-theme-surface-alt text-blue-600 border border-blue-200 h-[38px] px-4 shadow-sm"
        >
          <CalendarClock className="w-4 h-4 mr-2" /> Update Dates
        </Button>
        <div className="text-brand-orange font-semibold text-sm">
          Total Records: ({statutes.length})
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-theme-main bg-theme-table-header border-b border-theme-border">
              <tr>
                <TableHeader title="ID" sortKey="id" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="Law" sortKey="law" sortConfig={sortConfig} onSort={handleSort} className="min-w-[200px]" />
                <TableHeader title="Chapter" sortKey="chapter" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="Display" sortKey="display" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="Dated" sortKey="dated" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="Section" sortKey="section" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="Section Heading" sortKey="sectionHeading" sortConfig={sortConfig} onSort={handleSort} className="min-w-[250px]" />
                <TableHeader title="Department" sortKey="department" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="Heading" sortKey="heading" sortConfig={sortConfig} onSort={handleSort} className="min-w-[250px]" />
                <th className="px-6 py-4 font-semibold text-theme-main text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/50">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <SquareLoader text="Loading Statutes..." />
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm text-theme-muted">
                    No Statutes found.
                  </td>
                </tr>
              ) : (
                currentData.map((row) => {
                  const isHighlighted = highlightedId === row.id;
                  return (
                    <tr 
                      key={row.id} 
                      id={`statute-row-${row.id}`}
                      className={`transition-all duration-300 ${
                        isHighlighted
                          ? 'bg-brand-orange/20 dark:bg-brand-orange/30 ring-2 ring-brand-orange font-medium animate-pulse shadow-sm'
                          : 'hover:bg-theme-surface-alt/50 bg-theme-surface'
                      }`}
                    >
                    <td className="px-6 py-4 text-theme-muted">{row.id}</td>
                    <td className="px-6 py-4 font-medium text-theme-main">{row.law}</td>
                    <td className="px-6 py-4 text-theme-muted">{row.chapter}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-medium border ${
                        row.display === 'Yes' 
                          ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50' 
                          : 'bg-theme-surface-alt text-theme-muted border-theme-border'
                      }`}>
                        {row.display === 'Yes' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="text" 
                        value={row.dated}
                        readOnly
                        className="border border-theme-border rounded-md px-3 py-1.5 w-28 text-sm bg-theme-surface-alt text-theme-muted cursor-default focus:outline-none"
                      />
                    </td>
                    <td className="px-6 py-4 text-theme-muted">{row.section}</td>
                    <td className="px-6 py-4 text-theme-muted text-xs">{row.sectionHeading}</td>
                    <td className="px-6 py-4 text-theme-muted">{row.department}</td>
                    <td className="px-6 py-4 text-theme-muted text-xs">{row.heading}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => setViewModalItem(row)}
                          className="p-1.5 text-theme-muted hover:text-brand-orange border border-theme-border rounded-lg hover:bg-orange-50 dark:hover:bg-brand-orange/10 transition-colors" 
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleEdit(row)}
                          className="p-1.5 text-theme-muted hover:text-blue-500 border border-theme-border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" 
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setDeleteModalItem(row)}
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

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-theme-border/50 bg-theme-surface flex items-center justify-between">
          <span className="text-sm text-theme-muted">
            Showing <span className="font-medium text-theme-main">{startIdx}</span> to <span className="font-medium text-theme-main">{endIdx}</span> of <span className="font-medium text-theme-main">{totalItems}</span> entries
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="text-sm text-theme-muted hover:text-theme-main disabled:opacity-40 disabled:cursor-not-allowed font-medium px-2"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                return (
                  <span key={p} className="flex items-center gap-1">
                    {prev && p - prev > 1 && <span className="text-theme-disabled px-1">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors font-medium ${
                        currentPage === p
                          ? 'bg-brand-orange text-white'
                          : 'bg-theme-surface-alt/60 hover:bg-theme-surface-alt text-theme-main border border-theme-border'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="text-sm text-theme-muted hover:text-theme-main disabled:opacity-40 disabled:cursor-not-allowed font-medium px-2"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* View Statute Modal */}
      <Modal
        isOpen={Boolean(viewModalItem)}
        onClose={() => setViewModalItem(null)}
        title="Statute Details"
        subtitle={`SR #${viewModalItem?.id} • Dated ${viewModalItem?.dated}`}
        icon={FileText}
        footer={
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setViewModalItem(null)}
            >
              Close
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              className="bg-brand-orange hover:bg-[#D44E35] text-white"
              onClick={() => {
                const toEdit = viewModalItem;
                setViewModalItem(null);
                handleEdit(toEdit);
              }}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Record
            </Button>
          </>
        }
      >
        {viewModalItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
                <span className="block text-xs text-theme-muted mb-1 font-medium">Department</span>
                <span className="font-semibold text-theme-main">{viewModalItem.department}</span>
              </div>
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
                <span className="block text-xs text-theme-muted mb-1 font-medium">Chapter</span>
                <span className="font-semibold text-theme-main">{viewModalItem.chapter}</span>
              </div>
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
                <span className="block text-xs text-theme-muted mb-1 font-medium">Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                  {viewModalItem.display === 'Yes' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
              <span className="block text-xs text-theme-muted mb-1 font-medium">Law / Statute</span>
              <p className="text-theme-main font-semibold leading-relaxed">{viewModalItem.law}</p>
            </div>

            <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
              <span className="block text-xs text-theme-muted mb-1 font-medium">Section & Section Heading</span>
              <p className="text-theme-main font-medium">
                <strong className="text-brand-orange">Section {viewModalItem.section}:</strong> {viewModalItem.sectionHeading}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
              <span className="block text-xs text-theme-muted mb-1 font-medium">Main Heading</span>
              <p className="text-theme-main leading-relaxed">{viewModalItem.heading}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteModalItem)}
        onClose={() => {
          setDeleteModalItem(null);
          setDeleteConfirmationInput('');
          setDeleteError('');
        }}
        maxWidth="max-w-md"
      >
        {deleteModalItem && (
          <div>
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-theme-main">Delete Statute Record</h3>
                <p className="text-xs text-theme-muted">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

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

            <div className="flex items-center justify-end gap-3 pt-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setDeleteModalItem(null);
                  setDeleteConfirmationInput('');
                  setDeleteError('');
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                disabled={deleteConfirmationInput.trim().toLowerCase() !== (deleteModalItem.statuteId || deleteModalItem.statute_id || `STAT-${String(deleteModalItem.srNumber || deleteModalItem.id).padStart(6, '0')}`).toLowerCase()}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                onClick={handleDeleteConfirm}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Record
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Secret Code Confirmation Modal */}
      <Modal
        isOpen={Boolean(editModalItem)}
        onClose={() => {
          setEditModalItem(null);
          setEditConfirmationInput('');
          setEditError('');
        }}
        maxWidth="max-w-md"
      >
        {editModalItem && (
          <div>
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0 border border-brand-orange/20">
                <Pencil className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-theme-main">Edit Statute Record</h3>
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
                    setEditModalItem(null);
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
                  disabled={editConfirmationInput.trim().toLowerCase() !== (editModalItem.statuteId || editModalItem.statute_id || `STAT-${String(editModalItem.srNumber || editModalItem.id).padStart(6, '0')}`).toLowerCase()}
                  className="bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Proceed to Edit
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Update Dates Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Update Date"
        icon={CalendarClock}
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={closeModal} className="px-4">
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleUpdateDate} className="px-6 bg-blue-600 hover:bg-blue-700">
              Update
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {modalError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
              {modalError}
            </div>
          )}
          
          <div className="space-y-1.5 relative">
            <label className="text-sm font-medium text-theme-main">SR Number</label>
            <input 
              type="number"
              placeholder="e.g. 9338"
              value={modalSrNumber}
              onChange={(e) => setModalSrNumber(e.target.value)}
              className="w-full px-3 py-2 border border-theme-border rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors bg-theme-surface"
            />
          </div>

          <div className="space-y-1.5 relative">
            <label className="text-sm font-medium text-theme-main">New Date</label>
            <DatePicker 
              selectedDate={modalDate}
              onChange={setModalDate}
              placeholder="Select new date"
              className="w-full"
            />
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ManageStatutesTable;

