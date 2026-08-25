import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Pencil, 
  Trash2, 
  CalendarClock, 
  X, 
  ArrowUpDown, 
  AlertTriangle, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import DatePicker from '../../../components/ui/DatePicker';
import Modal from '../../../components/ui/Modal';

// Mock data based on the screenshot
const INITIAL_DATA = [
  {
    id: 9338,
    law: 'Income Tax Rules, 2002',
    chapter: 'CHAPTER-XIX',
    display: 'Yes',
    dated: '08/20/2026',
    section: '231CB',
    sectionHeading: 'Independent case scrutiny committees',
    department: 'Tax',
    heading: 'MISCELLANEOUS'
  },
  {
    id: 9337,
    law: 'Federal Excise Act, 2005',
    chapter: 'Chapter-V',
    display: 'Yes',
    dated: '07/01/2026',
    section: '34AA',
    sectionHeading: 'Independent case scrutiny committee',
    department: 'Tax',
    heading: 'POWERS, ADJUDICATION AND APPEALS'
  },
  {
    id: 9336,
    law: 'Federal Excise Act, 2005',
    chapter: 'Chapter-II',
    display: 'Yes',
    dated: '07/01/2026',
    section: '7A',
    sectionHeading: 'National faceless centre and',
    department: 'Tax',
    heading: 'LEVY, COLLECTION AND PAYMENT OF DUTY'
  }
];

const TableHeader = ({ title, className }) => (
  <th className={`px-6 py-4 font-medium align-top ${className || ''}`}>
    <div className="flex items-center gap-1">
      <span className="leading-tight">{title}</span>
      <ArrowUpDown className="w-3.5 h-3.5 text-theme-disabled shrink-0 cursor-pointer hover:text-brand-orange" />
    </div>
  </th>
);

const ManageStatutesTable = ({
  statutes: propStatutes,
  setStatutes: propSetStatutes,
  highlightedId,
  toastMessage: propToastMessage,
  setToastMessage: propSetToastMessage
}) => {
  const navigate = useNavigate();
  const [internalStatutes, setInternalStatutes] = useState(INITIAL_DATA);
  const [internalToastMessage, setInternalToastMessage] = useState('');

  const statutes = propStatutes || internalStatutes;
  const setStatutes = propSetStatutes || setInternalStatutes;
  const toastMessage = propToastMessage !== undefined ? propToastMessage : internalToastMessage;
  const setToastMessage = propSetToastMessage || setInternalToastMessage;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSrNumber, setModalSrNumber] = useState('');
  const [modalDate, setModalDate] = useState(null);
  const [modalError, setModalError] = useState('');
  const [viewModalItem, setViewModalItem] = useState(null);
  const [deleteModalItem, setDeleteModalItem] = useState(null);

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
    navigate('/manage-statutes/add', { state: { statuteData: row, isEdit: true } });
  };

  const handleDeleteConfirm = () => {
    if (!deleteModalItem) return;
    setStatutes(prev => prev.filter(s => s.id !== deleteModalItem.id));
    setToastMessage(`Statute #${deleteModalItem.id} (${deleteModalItem.law}) deleted successfully.`);
    setDeleteModalItem(null);
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
                <TableHeader title="ID" />
                <TableHeader title="Law" className="min-w-[200px]" />
                <TableHeader title="Chapter" />
                <TableHeader title="Display" />
                <TableHeader title="Dated" />
                <TableHeader title="Section" />
                <TableHeader title="Section Heading" className="min-w-[250px]" />
                <TableHeader title="Department" />
                <TableHeader title="Heading" className="min-w-[250px]" />
                <th className="px-6 py-4 font-medium text-center">≡</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/50">
              {statutes.map((row) => {
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
            })}
          </tbody>
        </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-theme-border/50 bg-theme-surface flex items-center justify-between">
          <span className="text-sm text-theme-muted">
            Showing <span className="font-medium text-theme-main">1</span> to <span className="font-medium text-theme-main">{statutes.length}</span> of <span className="font-medium text-theme-main">{statutes.length}</span> entries
          </span>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded text-sm transition-colors bg-[#641E16] text-white font-medium hover:bg-[#4A1610]">1</button>
            <button className="text-sm text-theme-muted hover:text-theme-main font-medium px-2">Next →</button>
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
                <h3 className="text-base font-bold text-theme-main">Delete Statute</h3>
                <p className="text-xs text-theme-muted">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-theme-muted leading-relaxed mb-6">
              Are you sure you want to delete statute <strong className="text-theme-main">#{deleteModalItem.id}</strong> ({deleteModalItem.law} - Section {deleteModalItem.section})?
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

