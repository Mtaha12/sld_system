import { useState, useRef, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import DatePicker from '../../../components/ui/DatePicker';

const COURT_OPTIONS = [
  { label: 'All Courts', value: 'all' },
  { label: 'Supreme Court', value: 'supreme' },
  { label: 'Federal Constitutional Court', value: 'federal_constitutional' },
  { label: 'Lahore High Court', value: 'lahore_high' },
  { label: 'Sindh High Court', value: 'sindh_high' },
  { label: 'Other Courts', value: 'other' }
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Closed', value: 'closed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Archived', value: 'archived' }
];

const TYPE_OPTIONS = [
  { label: 'All Types', value: 'all' },
  { label: 'Civil', value: 'civil' },
  { label: 'Criminal', value: 'criminal' },
  { label: 'Constitutional', value: 'constitutional' },
  { label: 'Other', value: 'other' }
];

const AdvancedFilterPanel = ({ isOpen, onClose, onApply }) => {
  const [court, setCourt] = useState('all');
  const [judge, setJudge] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [law, setLaw] = useState('');
  const [attachments, setAttachments] = useState('all');

  const panelRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking inside a date picker popover
      if (
        panelRef.current && 
        !panelRef.current.contains(event.target) &&
        !event.target.closest('[data-datepicker-popover="true"]') 
      ) {
        onClose();
      }
    };
    if (isOpen) {
      setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleClear = () => {
    setCourt('all');
    setJudge('');
    setStatus('all');
    setType('all');
    setFromDate(null);
    setToDate(null);
    setLaw('');
    setAttachments('all');
  };

  const handleApply = () => {
    let activeCount = 0;
    if (court !== 'all') activeCount++;
    if (judge.trim() !== '') activeCount++;
    if (status !== 'all') activeCount++;
    if (type !== 'all') activeCount++;
    if (fromDate) activeCount++;
    if (toDate) activeCount++;
    if (law.trim() !== '') activeCount++;
    if (attachments !== 'all') activeCount++;

    onApply(activeCount);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-[calc(100vw-32px)] sm:w-[480px] bg-theme-surface border border-theme-border rounded-2xl shadow-xl z-30 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[80vh] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border/50 shrink-0">
        <h3 className="font-semibold text-theme-main text-lg">Advanced Filters</h3>
        <button 
          onClick={onClose}
          className="p-1 text-theme-disabled hover:text-theme-muted hover:bg-theme-surface-hover rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 overflow-y-auto flex flex-col gap-5 flex-1">
        
        {/* Court */}
        <div>
          <label className="block text-sm font-medium text-theme-main mb-1.5">Court</label>
          <Input 
            type="select" 
            variant="light" 
            options={COURT_OPTIONS} 
            value={court}
            onChange={(e) => setCourt(e.target.value)}
            className="py-2.5"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-theme-main mb-1.5">Case Status</label>
            <Input 
              type="select" 
              variant="light" 
              options={STATUS_OPTIONS} 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="py-2.5"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-theme-main mb-1.5">Case Type</label>
            <Input 
              type="select" 
              variant="light" 
              options={TYPE_OPTIONS} 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="py-2.5"
            />
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-theme-main mb-1.5">Date Range</label>
          <div className="grid grid-cols-2 gap-3">
            <DatePicker 
              selectedDate={fromDate} 
              onChange={setFromDate} 
              placeholder="From Date"
            />
            <DatePicker 
              selectedDate={toDate} 
              onChange={setToDate} 
              placeholder="To Date"
              align="right"
            />
          </div>
        </div>

        {/* Judge */}
        <div>
          <label className="block text-sm font-medium text-theme-main mb-1.5">Judge</label>
          <Input 
            type="text" 
            variant="light" 
            placeholder="Search judge..." 
            icon={Search}
            value={judge}
            onChange={(e) => setJudge(e.target.value)}
            className="py-2.5"
          />
        </div>

        {/* Law / Section */}
        <div>
          <label className="block text-sm font-medium text-theme-main mb-1.5">Law / Section</label>
          <Input 
            type="text" 
            variant="light" 
            placeholder="Search law or section..." 
            icon={Search}
            value={law}
            onChange={(e) => setLaw(e.target.value)}
            className="py-2.5"
          />
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-theme-main mb-2">Attachments</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="attachments" 
                value="all"
                checked={attachments === 'all'}
                onChange={(e) => setAttachments(e.target.value)}
                className="text-brand-orange focus:ring-brand-orange h-4 w-4"
              />
              <span className="text-sm text-theme-main">Any</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="attachments" 
                value="with"
                checked={attachments === 'with'}
                onChange={(e) => setAttachments(e.target.value)}
                className="text-brand-orange focus:ring-brand-orange h-4 w-4"
              />
              <span className="text-sm text-theme-main">With Attachments</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="attachments" 
                value="without"
                checked={attachments === 'without'}
                onChange={(e) => setAttachments(e.target.value)}
                className="text-brand-orange focus:ring-brand-orange h-4 w-4"
              />
              <span className="text-sm text-theme-main">Without</span>
            </label>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="p-4 border-t border-theme-border/50 flex items-center justify-between shrink-0 bg-theme-surface-alt rounded-b-2xl">
        <button 
          onClick={handleClear}
          className="text-sm font-medium text-theme-muted hover:text-theme-main transition-colors px-3 py-2"
        >
          Clear All
        </button>
        <Button variant="admin-primary" size="md" onClick={handleApply}>
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default AdvancedFilterPanel;
