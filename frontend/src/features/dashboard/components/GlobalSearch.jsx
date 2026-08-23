import { Search } from 'lucide-react';
import SearchActionButtons from '../../../components/ui/SearchActionButtons';

const GlobalSearch = () => {
  return (
    <div className="flex flex-col sm:flex-row w-full gap-3 mb-8 items-start sm:items-center">
      <div className="relative flex-1 w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange shadow-sm transition-shadow"
          placeholder="Search cases, case numbers, judges, lawyers, statutes..."
        />
      </div>
      <SearchActionButtons filterLabel="" size="md" />
    </div>
  );
};

export default GlobalSearch;
