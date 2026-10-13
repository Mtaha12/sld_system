import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, List, Scale, ArrowLeft, X } from 'lucide-react';
import Button from '../components/ui/Button';
import AddOtherCaseForm from '../features/cases/components/AddOtherCaseForm';
import ManageOtherCasesTable from '../features/cases/components/ManageOtherCasesTable';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import { otherCaseService } from '../features/cases/services/otherCaseService';

const OtherCaseLawsPage = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortConfig, setSortConfig] = useState({ key: 'otherCaseId', direction: 'asc' });

  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [judgeFilter, setJudgeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const fetchCases = useCallback(async (page = 1, limit = 25, sortKey = 'srNumber', sortDir = 'asc', query = '', judge = '') => {
    setIsLoading(true);
    try {
      const res = await otherCaseService.getOtherCases(query, judge, page, limit, sortKey, sortDir);
      if (res && Array.isArray(res.data)) {
        setCases(res.data);
        setTotalCount(res.total || res.data.length);
        setTotalPages(res.totalPages || Math.ceil((res.total || res.data.length) / limit) || 1);
        setCurrentPage(res.currentPage || page);
      } else if (Array.isArray(res)) {
        setCases(res);
        setTotalCount(res.length);
        setTotalPages(Math.ceil(res.length / limit) || 1);
      }
    } catch (err) {
      console.error('[OtherCaseLawsPage] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases(currentPage, itemsPerPage, sortConfig.key, sortConfig.direction, activeQuery, judgeFilter);
  }, [fetchCases, currentPage, itemsPerPage, sortConfig, activeQuery, judgeFilter]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setCurrentPage(1);
    setActiveQuery(searchKeyword);
  };

  const handleShowAll = () => {
    setSearchKeyword('');
    setActiveQuery('');
    setJudgeFilter('');
    setCurrentPage(1);
  };

  const handleSortChange = (newKey) => {
    setSortConfig(prev => {
      let direction = 'asc';
      if (prev.key === newKey) {
        direction = prev.direction === 'asc' ? 'desc' : 'asc';
      }
      return { key: newKey, direction };
    });
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  };

  const handleOpenAddForm = () => {
    setEditingItem(null);
    setIsFormOpen(true);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSuccess = (savedItem, message) => {
    setToastMessage(message || 'Success');
    setIsFormOpen(false);
    setEditingItem(null);
    fetchCases(currentPage, itemsPerPage, sortConfig.key, sortConfig.direction, activeQuery, judgeFilter);
  };

  const handleItemDeleted = (deletedId) => {
    setCases(prev => prev.filter(item => 
      item.id !== deletedId && 
      item.mongoId !== deletedId && 
      item.otherCaseId !== deletedId
    ));
    setTotalCount(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="flex flex-col w-full animate-fade-in gap-3 pb-8">
      
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm p-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          
          <button
            type="button"
            onClick={() => navigate('/manage-case-law')}
            className="p-1.5 rounded-lg text-theme-muted hover:text-theme-main hover:bg-theme-surface-alt transition-colors mr-1 cursor-pointer"
            title="Back to Case Laws"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mr-2">
            <Scale className="w-4 h-4 text-brand-orange" />
            <span className="text-sm font-bold text-theme-main whitespace-nowrap">Other Case Laws</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-orange/10 text-brand-orange border border-brand-orange/30">
              {totalCount.toLocaleString()}
            </span>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-disabled" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search 52,500+ records by Case No, Parties, Citation, Bench..."
                className="w-full pl-9 pr-3 py-1.5 bg-theme-surface border border-theme-border rounded-lg text-xs focus:outline-none focus:border-brand-orange text-theme-main transition-colors"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="sm"
            className="bg-[#00bcd4] hover:bg-[#00acc1] text-white border-transparent h-[34px] px-4 text-xs font-medium cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 mr-1" /> Search
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleShowAll}
            className="bg-[#673ab7] hover:bg-[#5e35b1] text-white border-transparent h-[34px] px-4 text-xs font-medium cursor-pointer"
          >
            <List className="w-3.5 h-3.5 mr-1" /> All
          </Button>

          <button
            type="button"
            onClick={() => {
              if (isFormOpen && !editingItem) setIsFormOpen(false);
              else handleOpenAddForm();
            }}
            className="flex items-center justify-center font-medium bg-[#4caf50] hover:bg-[#43a047] text-white rounded-lg text-xs gap-1 h-[34px] px-4 whitespace-nowrap cursor-pointer transition-colors"
          >
            {isFormOpen && !editingItem ? (
              <>
                <X className="w-3.5 h-3.5" /> Close
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> + Add Other Case
              </>
            )}
          </button>

        </form>
      </div>

      {/* Form (when open) */}
      {isFormOpen && (
        <AddOtherCaseForm
          editData={editingItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Table */}
      <ManageOtherCasesTable
        cases={cases}
        totalItems={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        sortConfig={sortConfig}
        onSort={handleSortChange}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        onEdit={handleEditItem}
        onDeleted={handleItemDeleted}
        toastMessage={toastMessage}
        setToastMessage={setToastMessage}
        isLoading={isLoading}
      />

      <AdminFooter />
    </div>
  );
};

export default OtherCaseLawsPage;
