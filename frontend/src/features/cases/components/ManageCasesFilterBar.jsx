import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ChevronDown, 
  Plus, 
  Printer, 
  Download, 
  List, 
  FileText, 
  FileDown, 
  FileSpreadsheet,
  Hash
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import DatePicker from '../../../components/ui/DatePicker';

const ManageCasesFilterBar = ({
  selectedCount = 0,
  initialSearch = '',
  onExport,
  onHeadNotes,
  onJudgment,
  onGetCaseId,
  onSearch,
  onShowAll
}) => {
  const navigate = useNavigate();
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [subject, setSubject] = useState(initialSearch || '');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [magazine, setMagazine] = useState('');

  // Synchronize when initialSearch prop changes (e.g. navigation from Dashboard search)
  useEffect(() => {
    if (initialSearch !== undefined) {
      setSubject(initialSearch);
    }
  }, [initialSearch]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    onSearch?.({ subject, fromDate, toDate, magazine });
  };

  const handleShowAllClick = () => {
    setSubject('');
    setFromDate(null);
    setToDate(null);
    setMagazine('');
    onShowAll?.();
  };

  const handleExportClick = (format) => {
    setIsExportMenuOpen(false);
    onExport?.(format);
  };

  return (
    <div className="flex flex-col gap-4 mb-6 relative bg-transparent">
      
      {/* Row 1: Search and Filters */}
      <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
        
        {/* Subject Input */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-disabled" />
            <input 
              type="text" 
              value={subject}
              onChange={(e) => {
                const val = e.target.value;
                setSubject(val);
                onSearch?.({ subject: val, fromDate, toDate, magazine });
              }}
              placeholder="Search by Court, Case #, Judge, Lawyer, Subject..." 
              className="w-full pl-9 pr-4 py-2.5 bg-theme-surface border border-theme-border rounded-lg text-sm focus:outline-none focus:border-brand-orange text-theme-main transition-colors shadow-sm"
            />
          </div>
        </div>
        
        <DatePicker
          selectedDate={fromDate}
          onChange={setFromDate}
          placeholder="From year/vol"
          disableFutureDates={true}
          className="w-full sm:w-[150px] shrink-0"
        />

        <DatePicker
          selectedDate={toDate}
          onChange={setToDate}
          placeholder="To year/vol"
          disableFutureDates={true}
          className="w-full sm:w-[150px] shrink-0"
        />

        <div className="relative w-full sm:w-[140px] shrink-0">
          <select 
            value={magazine}
            onChange={(e) => setMagazine(e.target.value)}
            className="w-full pl-3 pr-9 py-2.5 border border-theme-border rounded-lg text-sm appearance-none focus:outline-none focus:border-brand-orange bg-theme-surface text-theme-main shadow-sm cursor-pointer"
          >
            <option value="">Magazine</option>
            <option value="SLD">SLD Law Report</option>
            <option value="Tax">Tax Law Journal</option>
            <option value="CLC">Civil Law Cases (CLC)</option>
            <option value="SCMR">Supreme Court Monthly Review</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-theme-disabled pointer-events-none" />
        </div>

        <Button 
          type="submit"
          size="sm" 
          className="bg-brand-orange hover:bg-brand-orange-hover text-white border-transparent h-[42px] px-5 whitespace-nowrap shadow-sm"
        >
          <Search className="w-4 h-4 mr-2" /> Search
        </Button>
        
        <Button 
          type="button"
          variant="outline"
          size="sm" 
          onClick={handleShowAllClick}
          className="bg-theme-surface hover:bg-theme-surface-alt text-theme-main border border-theme-border h-[42px] px-5 shadow-sm"
        >
          <List className="w-4 h-4 mr-1.5" /> All
        </Button>

        <Button 
          type="button"
          variant="success" 
          size="sm" 
          onClick={() => navigate('/manage-cases/add')}
          className="h-[42px] px-5 whitespace-nowrap shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Record
        </Button>
      </form>

      {/* Row 2: Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button 
          type="button"
          variant="outline"
          size="sm" 
          onClick={onHeadNotes}
          className="bg-theme-surface hover:bg-accent-purple-light dark:hover:bg-theme-surface-alt text-accent-purple border border-accent-purple h-[38px] shadow-sm"
        >
          <Printer className="w-4 h-4 mr-1.5" /> Head Notes
        </Button>
        
        <Button 
          type="button"
          variant="outline"
          size="sm" 
          onClick={onJudgment}
          className="bg-theme-surface hover:bg-accent-blue-light dark:hover:bg-theme-surface-alt text-accent-blue border border-accent-blue h-[38px] shadow-sm"
        >
          <Printer className="w-4 h-4 mr-1.5" /> Judgment
        </Button>
        
        <div className="relative">
          <Button 
            type="button"
            variant="outline"
            size="sm" 
            className={`bg-theme-surface hover:bg-accent-red-light dark:hover:bg-theme-surface-alt text-accent-red border border-accent-red h-[38px] shadow-sm flex items-center gap-1.5 ${
              selectedCount > 0 ? 'ring-2 ring-accent-red/30 font-semibold' : ''
            }`}
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
          >
            <Download className="w-4 h-4" /> 
            Export Cases {selectedCount > 0 ? `(${selectedCount})` : ''} 
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </Button>

          {isExportMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setIsExportMenuOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1.5 w-48 bg-theme-surface border border-theme-border rounded-xl shadow-xl py-1.5 z-30 animate-fade-in divide-y divide-theme-border/50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-theme-muted uppercase tracking-wider">
                  {selectedCount > 0 ? `Export ${selectedCount} Selected` : 'Export Format'}
                </div>
                <div className="py-1">
                  <button 
                    type="button"
                    className="w-full text-left px-3.5 py-2 text-xs sm:text-sm text-theme-main hover:bg-accent-red-light dark:hover:bg-theme-surface-alt hover:text-accent-red flex items-center gap-2.5 transition-colors"
                    onClick={() => handleExportClick('pdf')}
                  >
                    <FileText className="w-4 h-4 text-red-500" /> Export as PDF (.pdf)
                  </button>
                  <button 
                    type="button"
                    className="w-full text-left px-3.5 py-2 text-xs sm:text-sm text-theme-main hover:bg-accent-red-light dark:hover:bg-theme-surface-alt hover:text-accent-red flex items-center gap-2.5 transition-colors"
                    onClick={() => handleExportClick('word')}
                  >
                    <FileDown className="w-4 h-4 text-blue-500" /> Export as Word (.docx)
                  </button>
                  <button 
                    type="button"
                    className="w-full text-left px-3.5 py-2 text-xs sm:text-sm text-theme-main hover:bg-accent-red-light dark:hover:bg-theme-surface-alt hover:text-accent-red flex items-center gap-2.5 transition-colors"
                    onClick={() => handleExportClick('excel')}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-500" /> Export as Excel (.csv)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        
        <Button 
          type="button"
          variant="outline"
          size="sm" 
          onClick={onGetCaseId}
          className="bg-theme-surface hover:bg-theme-surface-alt text-theme-main border border-theme-border h-[38px] shadow-sm"
        >
          <Hash className="w-4 h-4 mr-1.5" /> Get Case ID
        </Button>
      </div>

    </div>
  );
};

export default ManageCasesFilterBar;

