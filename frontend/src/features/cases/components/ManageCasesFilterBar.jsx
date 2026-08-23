import { useState } from 'react';
import { Search, Calendar, ChevronDown, Building2, MapPin, User, Download, ArrowUpDown } from 'lucide-react';
import Button from '../../../components/ui/Button';
import SearchActionButtons from '../../../components/ui/SearchActionButtons';
import DatePicker from '../../../components/ui/DatePicker';
import AdvancedFilterPanel from './AdvancedFilterPanel';

const ManageCasesFilterBar = () => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  return (
    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center gap-3 mb-6 relative">
      
      {/* Top Row / Search Bar always visible */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full xl:w-auto flex-1">
        <div className="relative flex-1 min-w-[200px] lg:min-w-[320px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-orange" />
          <input 
            type="text" 
            placeholder="Search cases, case numbers, parties, judges, lawyers, statutes..." 
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange placeholder:text-gray-400"
          />
        </div>
        
        <DatePicker
          selectedDate={startDate}
          onChange={setStartDate}
          placeholder="Enter year start"
          className="w-full sm:w-[170px] shrink-0"
        />

        <div className="relative w-full sm:w-36 shrink-0">
          <select className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:border-brand-orange bg-white text-gray-700">
            <option>To present</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        <div className="relative">
          <SearchActionButtons 
            size="sm" 
            filterLabel="All" 
            showSearchButton={false}
            showMenu={true} 
            onMenuClick={() => setIsFiltersOpen(!isFiltersOpen)} 
            onFilterClick={() => setIsAdvancedFiltersOpen(true)}
            activeFiltersCount={activeFiltersCount}
          />
          
          <AdvancedFilterPanel 
            isOpen={isAdvancedFiltersOpen}
            onClose={() => setIsAdvancedFiltersOpen(false)}
            onApply={(count) => setActiveFiltersCount(count)}
          />
        </div>
      </div>

      {/* Expandable Action Buttons */}
      <div className={`${isFiltersOpen ? 'flex' : 'hidden'} xl:flex flex-col sm:flex-row flex-wrap xl:flex-nowrap items-stretch sm:items-center gap-3 xl:gap-2 xl:pl-3 xl:border-l xl:border-gray-200`}>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="success" size="sm">
            <Building2 className="w-4 h-4" /> Add Record
          </Button>
          <Button variant="outline" size="sm">
            <MapPin className="w-4 h-4 text-purple-600" /> Judgements
          </Button>
          <Button variant="outline" size="sm">
            <User className="w-4 h-4 text-blue-600" /> Set Case ID
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:ml-auto xl:border-l xl:border-gray-200 xl:pl-3 mt-2 sm:mt-0">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 text-gray-500" /> Export Cases
          </Button>
          <Button variant="outline" size="sm">
            <ArrowUpDown className="w-4 h-4 text-gray-500" /> Sort Cases
          </Button>
        </div>
      </div>

    </div>
  );
};

export default ManageCasesFilterBar;
