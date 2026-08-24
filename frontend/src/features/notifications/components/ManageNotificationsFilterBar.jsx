import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Printer, List, X } from 'lucide-react';
import Button from '../../../components/ui/Button';

const ManageNotificationsFilterBar = () => {
  const navigate = useNavigate();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

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

        <Link 
          to="/manage-notifications/add"
          className="flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none bg-green-600 hover:bg-green-700 text-white shadow-sm border border-green-600 py-2 px-3 rounded-lg text-sm gap-2 h-[42px] px-5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add Record
        </Link>

        <Button 
          variant="outline"
          size="sm" 
          className="bg-white hover:bg-gray-50 text-[#4b5563] border border-gray-300 h-[42px] px-5"
        >
          <Printer className="w-4 h-4" /> Get ID
        </Button>
      </div>

    </div>
  );
};

export default ManageNotificationsFilterBar;
