import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, List, BookA, X } from 'lucide-react';
import Button from '../components/ui/Button';
import AddDictionaryForm from '../features/dictionary/components/AddDictionaryForm';
import ManageDictionaryTable from '../features/dictionary/components/ManageDictionaryTable';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import { dictionaryService } from '../features/dictionary/services/dictionaryService';
import { useUser } from '../contexts/UserContext';

const ManageDictionaryPage = () => {
  const { user } = useUser();
  const isAdmin = user?.role === 'Administrator' || Boolean(user?.allowAllForms);

  const [dictionaryList, setDictionaryList] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const fetchDictionary = useCallback(async (page = 1, query = '') => {
    setIsLoading(true);
    try {
      const data = await dictionaryService.getDictionary({ page, limit: 25, query });
      setDictionaryList(data);
      setTotalItems(data.total || data.length || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('[ManageDictionaryPage] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDictionary(currentPage, searchKeyword);
  }, [fetchDictionary, currentPage]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setCurrentPage(1);
    fetchDictionary(1, searchKeyword);
  };

  const handleShowAll = () => {
    setSearchKeyword('');
    setCurrentPage(1);
    fetchDictionary(1, '');
  };

  const handleOpenAddForm = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSuccess = (savedItem, message) => {
    setToastMessage(message || 'Success');
    setIsFormOpen(false);
    setEditingItem(null);
    fetchDictionary(currentPage, searchKeyword);
  };

  const handleItemDeleted = (deletedId) => {
    fetchDictionary(currentPage, searchKeyword);
  };

  return (
    <div className="flex flex-col w-full animate-fade-in gap-3 pb-8">
      
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm p-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          
          <div className="flex items-center gap-2 mr-2">
            <BookA className="w-4 h-4 text-brand-orange" />
            <span className="text-sm font-bold text-theme-main whitespace-nowrap">{isAdmin ? 'Manage Dictionary' : 'Legal Dictionary'}</span>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-disabled" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Title, Keyword..."
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

          {isAdmin && (
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
                  <Plus className="w-3.5 h-3.5" /> + Add Record
                </>
              )}
            </button>
          )}

        </form>
      </div>

      {/* Form (when open) */}
      {isAdmin && isFormOpen && (
        <AddDictionaryForm
          editData={editingItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Table */}
      <ManageDictionaryTable
        dictionaryList={dictionaryList}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalItems={totalItems}
        totalPages={totalPages}
        serverPaginated={true}
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

export default ManageDictionaryPage;
