import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowUpDown, 
  Eye, 
  Pencil, 
  Trash2, 
  Menu, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Bell 
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { notificationService } from '../services/notificationService';

const TableHeader = ({ title }) => (
  <th className="px-3 py-3 font-semibold text-theme-main align-top">
    <div className="flex items-start gap-1">
      <span className="leading-tight">{title}</span>
      {title !== 'Action' && title !== 'Status' && (
        <ArrowUpDown className="w-3.5 h-3.5 text-theme-disabled shrink-0 cursor-pointer hover:text-brand-orange mt-0.5" />
      )}
    </div>
  </th>
);

const ManageNotificationsTable = ({
  notifications: propNotifications,
  setNotifications: propSetNotifications,
  currentPage: propCurrentPage,
  setCurrentPage: propSetCurrentPage,
  highlightedId,
  toastMessage: propToastMessage,
  setToastMessage: propSetToastMessage
}) => {
  const navigate = useNavigate();
  const [internalNotifications, setInternalNotifications] = useState([]);
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [internalToastMessage, setInternalToastMessage] = useState('');

  useEffect(() => {
    if (!propNotifications) {
      notificationService.getNotifications().then(data => setInternalNotifications(data));
    }
  }, [propNotifications]);

  const notifications = propNotifications || internalNotifications;
  const setNotifications = propSetNotifications || setInternalNotifications;
  const currentPage = propCurrentPage !== undefined ? propCurrentPage : internalCurrentPage;
  const setCurrentPage = propSetCurrentPage || setInternalCurrentPage;
  const toastMessage = propToastMessage !== undefined ? propToastMessage : internalToastMessage;
  const setToastMessage = propSetToastMessage || setInternalToastMessage;

  const [viewModalItem, setViewModalItem] = useState(null);
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const itemsPerPage = 10;
  
  const totalItems = notifications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const currentData = notifications.slice(
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
    try {
      await notificationService.deleteNotification(deleteModalItem.id);
      setNotifications(prev => prev.filter(n => n.id !== deleteModalItem.id));
      setToastMessage(`Notification SR #${deleteModalItem.srNumber} deleted successfully.`);
    } catch (err) {
      setToastMessage(`Failed to delete record: ${err.message}`);
    }
    setDeleteModalItem(null);
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
                <TableHeader title="Sr #" />
                <TableHeader title="Number" />
                <TableHeader title="Year" />
                <TableHeader title="Department" />
                <TableHeader title="SRO #" />
                <TableHeader title="Subject" />
                <TableHeader title="Law Date" />
                <TableHeader title="Law/Statute" />
                <TableHeader title="Section" />
                <TableHeader title="Status" />
                <th className="px-3 py-3 font-semibold text-theme-main align-top text-center w-12">
                  <Menu className="w-4 h-4 text-theme-main mx-auto" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/50">
              {currentData.map((item) => {
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
                  <td className="px-3 py-4 align-top text-theme-main font-medium min-w-[200px]">{item.sroNumber}</td>
                  <td className="px-3 py-4 align-top text-theme-muted min-w-[300px]">{item.subject}</td>
                  <td className="px-3 py-4 align-top text-theme-muted">{item.lawDate || '-'}</td>
                  <td className="px-3 py-4 align-top text-theme-muted">{item.lawStatute || '-'}</td>
                  <td className="px-3 py-4 align-top text-theme-muted">{item.section || '-'}</td>
                  <td className="px-3 py-4 align-top">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 font-medium rounded text-[10px] border ${
                      item.status === 'Active' 
                        ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50' 
                        : 'bg-theme-surface-alt text-theme-main border-theme-border'
                    }`}>
                      {item.status}
                    </span>
                  </td>
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
            })}
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
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-surface-alt/20">
                <span className="block text-xs text-theme-muted mb-1 font-medium">Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                  {viewModalItem.status}
                </span>
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
        onClose={() => setDeleteModalItem(null)}
        maxWidth="max-w-md"
      >
        {deleteModalItem && (
          <div>
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-theme-main">Delete Notification</h3>
                <p className="text-xs text-theme-muted">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-theme-muted leading-relaxed mb-6">
              Are you sure you want to delete notification <strong className="text-theme-main">SR #{deleteModalItem.srNumber}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDeleteModalItem(null)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
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

