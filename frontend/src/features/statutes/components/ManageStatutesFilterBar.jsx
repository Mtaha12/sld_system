import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, List, Printer, Hash } from 'lucide-react';
import Button from '../../../components/ui/Button';

const ManageStatutesFilterBar = ({
  initialSearch = '',
  onGetStatuteId,
  onSearch,
  onShowAll
}) => {
  const [subject, setSubject] = useState(initialSearch || '');

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSubject(initialSearch);
    }
  }, [initialSearch]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    onSearch?.(subject);
  };

  const handleShowAllClick = () => {
    setSubject('');
    onShowAll?.();
  };

  return (
    <div className="flex flex-col gap-4 mb-6 bg-transparent">
      
      <form onSubmit={handleSearchSubmit} className="flex flex-col xl:flex-row items-center gap-3">
        
        {/* Search Input */}
        <div className="flex-1 w-full xl:w-auto relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-disabled" />
          <input 
            type="text" 
            value={subject}
            onChange={(e) => {
              const val = e.target.value;
              setSubject(val);
              onSearch?.(val);
            }}
            placeholder="Search by Statute ID, Law, Chapter, Section, Heading..." 
            className="w-full pl-9 pr-4 py-2 bg-theme-surface border border-theme-border rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange text-theme-main h-[42px] shadow-sm transition-colors"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <Button 
            type="submit"
            size="sm" 
            className="bg-brand-orange hover:bg-[#D44E35] text-white border-transparent h-[42px] px-6 whitespace-nowrap shadow-sm"
          >
            <Search className="w-4 h-4 mr-2" /> Search
          </Button>
          
          <Button 
            type="button"
            variant="outline"
            size="sm" 
            onClick={handleShowAllClick}
            className="bg-theme-surface hover:bg-theme-surface-alt text-theme-main border border-theme-border h-[42px] px-5 whitespace-nowrap shadow-sm"
          >
            <List className="w-4 h-4 mr-1.5" /> All
          </Button>

          <Link 
            to="/manage-statutes/add"
            className="flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none bg-green-600 hover:bg-green-700 text-white shadow-sm border border-green-600 rounded-lg text-sm gap-2 h-[42px] px-5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Record
          </Link>

          <Button 
            type="button"
            variant="outline"
            size="sm" 
            onClick={onGetStatuteId}
            className="bg-theme-surface hover:bg-theme-surface-alt text-theme-main border border-theme-border h-[42px] px-5 whitespace-nowrap shadow-sm"
          >
            <Printer className="w-4 h-4 mr-1.5" /> Get Statute ID
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ManageStatutesFilterBar;

