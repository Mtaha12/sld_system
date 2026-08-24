import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Plus, Printer, Download, List, FileText, FileDown } from 'lucide-react';
import Button from '../../../components/ui/Button';
import DatePicker from '../../../components/ui/DatePicker';

const ManageCasesFilterBar = () => {
  const navigate = useNavigate();
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  return (
    <div className="flex flex-col gap-4 mb-6 relative bg-transparent">
      
      {/* Row 1: Search and Filters */}
      <div className="flex flex-wrap items-center gap-3">
        
        {/* Static Subject Input */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-disabled" />
            <input 
              type="text" 
              placeholder="Subject" 
              className="w-full pl-9 pr-4 py-2.5 bg-theme-surface border border-theme-border rounded-lg text-sm focus:outline-none focus:border-brand-orange text-theme-main"
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
          <select className="w-full pl-3 pr-9 py-2.5 border border-theme-border rounded-lg text-sm appearance-none focus:outline-none focus:border-brand-orange bg-theme-surface text-theme-main">
            <option value="">Magazine</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-theme-disabled pointer-events-none" />
        </div>

        <Button 
          size="sm" 
          className="bg-brand-orange hover:bg-[#D44E35] text-white border-transparent h-[42px] px-5 whitespace-nowrap"
        >
          <Search className="w-4 h-4 mr-2" /> Search
        </Button>
        
        <Button 
          variant="outline"
          size="sm" 
          className="bg-theme-surface hover:bg-theme-surface-alt text-theme-main border border-theme-border h-[42px] px-5"
        >
          <List className="w-4 h-4" /> All
        </Button>

        <Button 
          variant="success" 
          size="sm" 
          onClick={() => navigate('/manage-cases/add')}
          className="h-[42px] px-5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add Record
        </Button>
      </div>

      {/* Row 2: Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button 
          variant="outline"
          size="sm" 
          className="bg-theme-surface hover:bg-[#f3efff] dark:hover:bg-theme-surface-alt text-[#5c4dce] border border-[#5c4dce] h-[38px]"
        >
          <Printer className="w-4 h-4" /> Head Notes
        </Button>
        
        <Button 
          variant="outline"
          size="sm" 
          className="bg-theme-surface hover:bg-[#eaf6ff] dark:hover:bg-theme-surface-alt text-[#2583e8] border border-[#2583e8] h-[38px]"
        >
          <Printer className="w-4 h-4" /> Judgment
        </Button>
        
        <div className="relative">
          <Button 
            variant="outline"
            size="sm" 
            className="bg-theme-surface hover:bg-[#fff0f0] dark:hover:bg-theme-surface-alt text-[#e65c5c] border border-[#e65c5c] h-[38px]"
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
          >
            <Download className="w-4 h-4" /> Export Cases <ChevronDown className="w-3 h-3 ml-1" />
          </Button>

          {isExportMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsExportMenuOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-40 bg-theme-surface border border-theme-border/50 rounded-lg shadow-lg py-1 z-20 animate-fade-in">
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-theme-main hover:bg-[#fff0f0] dark:hover:bg-theme-surface-alt hover:text-[#e65c5c] flex items-center gap-2 transition-colors"
                  onClick={() => setIsExportMenuOpen(false)}
                >
                  <FileText className="w-4 h-4" /> Export as PDF
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-theme-main hover:bg-[#fff0f0] dark:hover:bg-theme-surface-alt hover:text-[#e65c5c] flex items-center gap-2 transition-colors"
                  onClick={() => setIsExportMenuOpen(false)}
                >
                  <FileDown className="w-4 h-4" /> Export as Word
                </button>
              </div>
            </>
          )}
        </div>
        
        <Button 
          variant="outline"
          size="sm" 
          className="bg-theme-surface hover:bg-theme-surface-alt text-theme-main border border-theme-border h-[38px]"
        >
          <Printer className="w-4 h-4" /> Get Case ID
        </Button>
      </div>

    </div>
  );
};

export default ManageCasesFilterBar;
