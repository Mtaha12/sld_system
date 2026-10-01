import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowUpDown, 
  ArrowUp,
  ArrowDown,
  Eye, 
  Pencil, 
  Trash2, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Bell 
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import SquareLoader from '../../../components/ui/SquareLoader';
import Pagination from '../../../components/ui/Pagination';
import { notificationService } from '../services/notificationService';

const TableHeader = ({ title, sortKey, sortConfig, onSort }) => {
  const isSorted = sortConfig?.key === sortKey;
  const direction = isSorted ? sortConfig.direction : null;

  return (
    <th 
      onClick={() => sortKey && onSort?.(sortKey)}
      className={`px-3 py-3 font-semibold text-theme-main align-top select-none ${sortKey ? 'cursor-pointer hover:bg-theme-surface-alt/80 transition-colors group' : ''}`}
    >
      <div className="flex items-start gap-1">
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

const ManageNotificationsTable = ({
  notifications: propNotifications,
  setNotifications: propSetNotifications,
  currentPage: propCurrentPage,
  setCurrentPage: propSetCurrentPage,
  totalItems: propTotalItems,
  totalPages: propTotalPages,
  serverPaginated = false,
  highlightedId,
  toastMessage: propToastMessage,
  setToastMessage: propSetToastMessage,
  isLoading = false
}) => {
  const navigate = useNavigate();
  const [internalNotifications, setInternalNotifications] = useState([]);
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [internalToastMessage, setInternalToastMessage] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    if (!propNotifications) {
      setInternalLoading(true);
      notificationService.getNotifications()
        .then(data => setInternalNotifications(data))
        .finally(() => setInternalLoading(false));
    }
  }, [propNotifications]);

  const notifications = propNotifications || internalNotifications;
  const setNotifications = propSetNotifications || setInternalNotifications;
  const loading = isLoading || internalLoading;
  const currentPage = propCurrentPage !== undefined ? propCurrentPage : internalCurrentPage;
  const setCurrentPage = propSetCurrentPage || setInternalCurrentPage;
  const toastMessage = propToastMessage !== undefined ? propToastMessage : internalToastMessage;
  const setToastMessage = propSetToastMessage || setInternalToastMessage;

  const [viewModalItem, setViewModalItem] = useState(null);
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const isServerPaginated = Boolean(serverPaginated || propTotalItems !== undefined);
  const itemsPerPage = isServerPaginated ? 25 : 10;
  
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

  const sortedNotifications = useMemo(() => {
    if (isServerPaginated) return notifications;
    if (!sortConfig.key || !sortConfig.direction) return notifications;

    const { key, direction } = sortConfig;
    const isAsc = direction === 'asc';

    return [...notifications].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];

      if (key === 'srNumber') {
        valA = a.srNumber !== undefined ? a.srNumber : a.id;
        valB = b.srNumber !== undefined ? b.srNumber : b.id;
      }

      if (valA === null || valA === undefined || valA === '') return 1;
      if (valB === null || valB === undefined || valB === '') return -1;

      if (Array.isArray(valA)) valA = valA.join(', ');
      if (Array.isArray(valB)) valB = valB.join(', ');

      if (key.toLowerCase().includes('date')) {
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
  }, [notifications, sortConfig, isServerPaginated]);

  const totalItems = isServerPaginated ? (propTotalItems !== undefined ? propTotalItems : notifications.length) : sortedNotifications.length;
  const totalPages = isServerPaginated ? (propTotalPages !== undefined ? propTotalPages : Math.ceil(totalItems / itemsPerPage) || 1) : (Math.ceil(totalItems / itemsPerPage) || 1);
  
  const currentData = isServerPaginated ? notifications : sortedNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startIdx = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

  // Smooth scroll to highlighted row
  useEffect(() => {
    if (highlightedId) {
      const timer = setTimeout(() => {
        const rowEl = document.getElementById(`notification-row-${highlightedId}`);
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

  const handleEdit = (item) => {
    navigate('/manage-notifications/add', { state: { notificationData: item, isEdit: true } });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalItem) return;

    const requiredKey = (deleteModalItem.notificationId || deleteModalItem.notification_id || `NOTIF-${String(deleteModalItem.srNumber).padStart(6, '0')}`).trim().toLowerCase();
    const enteredInput = deleteConfirmationInput.trim().toLowerCase();

    if (enteredInput !== requiredKey) {
      setDeleteError('Invalid secret code. Please enter the correct secret code to confirm deletion.');
      return;
    }

    try {
      await notificationService.deleteNotification(deleteModalItem.id);
      setNotifications(prev => prev.filter(n => n.id !== deleteModalItem.id));
      const displayId = deleteModalItem.notificationId || deleteModalItem.notification_id || `SR #${deleteModalItem.srNumber}`;
      setToastMessage(`Notification ${displayId} deleted successfully.`);
    } catch (err) {
      setToastMessage(`Failed to delete record: ${err.message}`);
    }

    setDeleteModalItem(null);
    setDeleteConfirmationInput('');
    setDeleteError('');
    setTimeout(() => setToastMessage(''), 3500);
  };

  return (
    <div className="flex flex-col mb-8 animate-fade-in relative">
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl flex items-center justify-between text-sm animate-fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {toastMessage}
          </div>
          <button onClick={() => setToastMessage('')} className="text-theme-muted hover:text-theme-main">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex justify-end mb-3">
        <span className="text-sm font-semibold text-brand-orange">Total Records: ({totalItems})</span>
      </div>

      <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left table-auto">
            <thead className="bg-theme-table-header border-b border-theme-border whitespace-nowrap text-theme-main">
              <tr>
                <TableHeader title="Sr #" sortKey="srNumber" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="Number" sortKey="number" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="Year" sortKey="year" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="Department" sortKey="department" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="SRO #" sortKey="sroNumber" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="Subject" sortKey="subject" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="Law Date" sortKey="lawDate" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="Law/Statute" sortKey="lawStatute" sortConfig={sortConfig} onSort={handleSort} />
                <TableHeader title="Section" sortKey="section" sortConfig={sortConfig} onSort={handleSort} />
                <th className="px-3 py-3 font-semibold text-theme-main align-top text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/50">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <SquareLoader text="Loading Notifications..." />
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-sm text-theme-muted">
                    No Notifications found.
                  </td>
                </tr>
              ) : (
                currentData.map((item) => {
                  const isHighlighted = highlightedId === item.id;
                  return (
                    <tr 
                      key={item.id} 
                      id={`notification-row-${item.id}`}
                      className={`transition-all duration-300 ${
                        isHighlighted
                          ? 'bg-brand-orange/20 dark:bg-brand-orange/30 ring-2 ring-brand-orange font-medium animate-pulse shadow-sm'
                          : 'hover:bg-theme-surface-alt/50'
                      }`}
                    >
                    <td className="px-3 py-4 align-top text-theme-muted">{item.srNumber}</td>
                    <td className="px-3 py-4 align-top text-theme-muted">{item.number}</td>
                    <td className="px-3 py-4 align-top text-theme-muted">{item.year}</td>
                    <td className="px-3 py-4 align-top text-theme-muted">{item.department}</td>
                    <td className="px-3 py-4 align-top text-theme-main font-medium whitespace-normal break-words">{item.sroNumber}</td>
                    <td className="px-3 py-4 align-top text-theme-muted whitespace-normal break-words">{item.subject}</td>
                    <td className="px-3 py-4 align-top text-theme-muted whitespace-normal break-words">{item.lawDate || '-'}</td>
                    <td className="px-3 py-4 align-top text-theme-muted whitespace-normal break-words">{item.lawStatute || '-'}</td>
                    <td className="px-3 py-4 align-top text-theme-muted whitespace-normal break-words">{item.section || '-'}</td>
                    <td className="px-3 py-4 align-top text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => setViewModalItem(item)}
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
                          onClick={() => setDeleteModalItem(item)}
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
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
      </div>

      {/* View Notification Modal */}
      <Modal
        isOpen={Boolean(viewModalItem)}
        onClose={() => setViewModalItem(null)}
        title="Notification Details"
        subtitle={`SR #${viewModalItem?.srNumber} • Year ${viewModalItem?.year}`}
        icon={Bell}
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
                <span className="block text-xs text-theme-muted mb-1 font-medium">Number</span>
                <span className="font-semibold text-theme-main">{viewModalItem.number}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
              <span className="block text-xs text-theme-muted mb-1 font-medium">SRO / Order Number</span>
              <p className="text-theme-main font-medium leading-relaxed">{viewModalItem.sroNumber}</p>
            </div>

            <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
              <span className="block text-xs text-theme-muted mb-1 font-medium">Subject</span>
              <p className="text-theme-main leading-relaxed">{viewModalItem.subject}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
                <span className="block text-xs text-theme-muted mb-1 font-medium">Law Date</span>
                <span className="text-theme-main">{viewModalItem.lawDate || 'N/A'}</span>
              </div>
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
                <span className="block text-xs text-theme-muted mb-1 font-medium">Law / Statute</span>
                <span className="text-theme-main">{viewModalItem.lawStatute || 'N/A'}</span>
              </div>
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
                <span className="block text-xs text-theme-muted mb-1 font-medium">Section</span>
                <span className="text-theme-main">{viewModalItem.section || 'N/A'}</span>
              </div>
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
                <h3 className="text-base font-bold text-theme-main">Delete Notification Record</h3>
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
                disabled={deleteConfirmationInput.trim().toLowerCase() !== (deleteModalItem.notificationId || deleteModalItem.notification_id || `NOTIF-${String(deleteModalItem.srNumber).padStart(6, '0')}`).toLowerCase()}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                onClick={handleDeleteConfirm}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Record
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default ManageNotificationsTable;

