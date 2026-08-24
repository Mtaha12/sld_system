import { Search, Filter, Menu } from 'lucide-react';
import Button from './Button';

const SearchActionButtons = ({ 
  onSearch, 
  onFilterClick, 
  filterLabel = "All",
  showSearchButton = true,
  showMenu = false, 
  onMenuClick,
  size = "default",
  className = "",
  activeFiltersCount = 0
}) => {
  return (
    <div className={`flex gap-2 w-full sm:w-auto shrink-0 ${className}`}>
      {showSearchButton && (
        <Button variant="primary" size={size} className="flex-1 sm:flex-none" onClick={onSearch}>
          <Search className={size === 'sm' ? "w-4 h-4" : "w-5 h-5"} /> Search
        </Button>
      )}
      
      <Button variant="outline" size={size} className="flex-1 sm:flex-none relative" onClick={onFilterClick}>
        <Filter className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} text-brand-orange`} />
        {filterLabel && <span>{filterLabel}</span>}
        {activeFiltersCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white box-content">
            {activeFiltersCount}
          </span>
        )}
      </Button>
      
      {showMenu && (
        <Button 
          variant="outline" 
          size={size} 
          className="xl:hidden"
          onClick={onMenuClick}
        >
          <Menu className={size === 'sm' ? "w-4 h-4" : "w-5 h-5"} /> Filters
        </Button>
      )}
    </div>
  );
};

export default SearchActionButtons;
