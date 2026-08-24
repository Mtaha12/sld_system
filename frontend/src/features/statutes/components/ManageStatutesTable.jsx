import { useState } from 'react';
import { Edit, Trash2, CalendarClock, X, ArrowUpDown } from 'lucide-react';
import Button from '../../../components/ui/Button';
import DatePicker from '../../../components/ui/DatePicker';

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

const ManageStatutesTable = () => {
  const [statutes, setStatutes] = useState(INITIAL_DATA);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSrNumber, setModalSrNumber] = useState('');
  const [modalDate, setModalDate] = useState(null);
  const [modalError, setModalError] = useState('');

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

  return (
    <div className="flex flex-col gap-3 relative">
      
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
        <div className="text-theme-muted font-medium text-sm">
          Total Records: (9,331)
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-theme-main bg-theme-table-header border-b border-theme-border">
              <tr>
                <TableHeader title="Sr #" />
                <TableHeader title="Law / Statute" className="min-w-[200px]" />
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
              {statutes.map((row) => (
                <tr key={row.id} className="hover:bg-theme-surface-alt/50 transition-colors bg-theme-surface">
                  <td className="px-6 py-4 text-theme-muted">{row.id}</td>
                  <td className="px-6 py-4 font-medium text-theme-main">{row.law}</td>
                  <td className="px-6 py-4 text-theme-muted">{row.chapter}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                      row.display === 'Yes' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-theme-surface-alt text-theme-muted border-theme-border'
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
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 text-blue-500 hover:text-blue-700 bg-blue-500/20 hover:bg-blue-100 rounded transition-colors border border-blue-100" title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors border border-red-100" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-theme-border/50 bg-theme-surface flex items-center justify-between">
          <span className="text-sm text-theme-muted">
            Showing <span className="font-medium text-theme-main">1</span> to <span className="font-medium text-theme-main">3</span> of <span className="font-medium text-theme-main">3</span> entries
          </span>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-md bg-brand-orange text-white text-sm font-medium">1</button>
            <button className="text-sm text-theme-muted hover:text-theme-main font-medium px-2">Next →</button>
          </div>
        </div>
      </div>

      {/* Update Dates Modal */}
      {isModalOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm animate-fade-in" 
            onClick={closeModal}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-theme-surface rounded-xl shadow-2xl z-50 animate-fade-in border border-theme-border/50">
            <div className="px-5 py-4 border-b border-theme-border/50 flex items-center justify-between bg-theme-surface-alt/50 rounded-t-xl">
              <h3 className="font-semibold text-theme-main flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-blue-600" /> Update Date
              </h3>
              <button 
                onClick={closeModal}
                className="text-theme-disabled hover:text-theme-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
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
                  className="w-full px-3 py-2 border border-theme-border rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
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

            <div className="px-5 py-4 border-t border-theme-border/50 flex justify-end gap-2 bg-theme-surface-alt/50 rounded-b-xl">
              <Button variant="outline" size="sm" onClick={closeModal} className="px-4">
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleUpdateDate} className="px-6 bg-blue-600 hover:bg-blue-700">
                Update
              </Button>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default ManageStatutesTable;
