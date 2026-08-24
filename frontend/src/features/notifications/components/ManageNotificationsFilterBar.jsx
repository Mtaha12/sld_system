import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Printer, List } from 'lucide-react';
import Button from '../../../components/ui/Button';

const ManageNotificationsFilterBar = () => {
  const navigate = useNavigate();

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

        <Link 
          to="/manage-notifications/add"
          className="flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none bg-green-600 hover:bg-green-700 text-white shadow-sm border border-green-600 py-2 px-3 rounded-lg text-sm gap-2 h-[42px] px-5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add Record
        </Link>

        <Button 
          variant="outline"
          size="sm" 
          className="bg-theme-surface hover:bg-theme-surface-alt text-theme-main border border-theme-border h-[42px] px-5"
        >
          <Printer className="w-4 h-4" /> Get ID
        </Button>
      </div>

    </div>
  );
};

export default ManageNotificationsFilterBar;
