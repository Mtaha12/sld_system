import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Printer, List } from 'lucide-react';
import Button from '../../../components/ui/Button';

const ManageNotificationsFilterBar = ({
  initialSearch = '',
  onGetId,
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
    <div className="flex flex-col gap-4 mb-6 relative bg-transparent">
      
      {/* Row 1: Search and Filters */}
      <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
        
        {/* Search Input */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-disabled" />
            <input 
              type="text" 
              value={subject}
              onChange={(e) => {
                const val = e.target.value;
                setSubject(val);
                onSearch?.(val);
              }}
              placeholder="Search by SR #, SRO #, Department, Subject, Statute..." 
              className="w-full pl-9 pr-4 py-2.5 bg-theme-surface border border-theme-border rounded-lg text-sm focus:outline-none focus:border-brand-orange text-theme-main shadow-sm transition-colors"
            />
          </div>
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

        <Link 
          to="/manage-notifications/add"
          className="flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none bg-green-600 hover:bg-green-700 text-white shadow-sm border border-green-600 rounded-lg text-sm gap-2 h-[42px] px-5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add Record
        </Link>

        <Button 
          type="button"
          variant="outline"
          size="sm" 
          onClick={onGetId}
          className="bg-theme-surface hover:bg-theme-surface-alt text-theme-main border border-theme-border h-[42px] px-5 shadow-sm"
        >
          <Printer className="w-4 h-4 mr-1.5" /> Get ID
        </Button>
      </form>

    </div>
  );
};

export default ManageNotificationsFilterBar;

