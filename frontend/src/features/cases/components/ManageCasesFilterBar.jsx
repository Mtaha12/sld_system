import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Plus, Printer, Download, List, FileText, FileDown, X } from 'lucide-react';
import Button from '../../../components/ui/Button';
import DatePicker from '../../../components/ui/DatePicker';

const ManageCasesFilterBar = () => {
  const navigate = useNavigate();
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col gap-4 mb-6 relative">
      
      {/* Row 1: Search and Filters */}
      <div className="flex flex-wrap items-center gap-3">
        
        {/* Static Subject Input */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Subject" 
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange text-gray-700"
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
          <select className="w-full pl-3 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:border-brand-orange bg-white text-gray-700">
            <option value="">Magazine</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Expanding Search Button */}
        <div className={`flex items-center transition-all duration-300 ease-in-out ${isSearchExpanded ? 'w-48' : 'w-auto'}`}>
          {!isSearchExpanded ? (
            <Button 
              size="sm" 
              className="bg-brand-orange hover:bg-[#D44E35] text-white border-transparent h-[42px] px-5 w-full whitespace-nowrap"
              onClick={() => setIsSearchExpanded(true)}
            >
              <Search className="w-4 h-4" /> Search
            </Button>
          ) : (
            <div className="relative w-full h-[42px] animate-fade-in">
              <input 
                type="text"
                placeholder="Search..."
                className="w-full h-full pl-9 pr-8 py-2 border border-brand-orange rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange"
                autoFocus
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <button 
                onClick={() => setIsSearchExpanded(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        <Button 
          variant="outline"
          size="sm" 
          className="bg-white hover:bg-gray-50 text-[#4b5563] border border-gray-200 h-[42px] px-5"
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
          className="bg-white hover:bg-[#f3efff] text-[#5c4dce] border border-[#5c4dce] h-[38px]"
        >
          <Printer className="w-4 h-4" /> Head Notes
        </Button>
        
        <Button 
          variant="outline"
          size="sm" 
          className="bg-white hover:bg-[#eaf6ff] text-[#2583e8] border border-[#2583e8] h-[38px]"
        >
          <Printer className="w-4 h-4" /> Judgment
        </Button>
        
        <div className="relative">
          <Button 
            variant="outline"
            size="sm" 
            className="bg-white hover:bg-[#fff0f0] text-[#e65c5c] border border-[#e65c5c] h-[38px]"
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
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-20 animate-fade-in">
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#fff0f0] hover:text-[#e65c5c] flex items-center gap-2 transition-colors"
                  onClick={() => setIsExportMenuOpen(false)}
                >
                  <FileText className="w-4 h-4" /> Export as PDF
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#fff0f0] hover:text-[#e65c5c] flex items-center gap-2 transition-colors"
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
          className="bg-white hover:bg-gray-50 text-[#4b5563] border border-gray-300 h-[38px]"
        >
          <Printer className="w-4 h-4" /> Get Case ID
        </Button>
      </div>

    </div>
  );
};

export default ManageCasesFilterBar;
