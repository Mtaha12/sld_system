import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, List, Globe, X } from 'lucide-react';
import Button from '../components/ui/Button';
import AddUpdateForm from '../features/updates/components/AddUpdateForm';
import ManageUpdatesTable from '../features/updates/components/ManageUpdatesTable';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import { updateService } from '../features/updates/services/updateService';

const UpdatesPage = () => {
  const [updates, setUpdates] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const fetchUpdates = useCallback(async (query = '') => {
    setIsLoading(true);
    try {
      const data = await updateService.getUpdates(query);
      setUpdates(data);
    } catch (err) {
      console.error('[UpdatesPage] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    fetchUpdates(searchKeyword);
  };

  const handleShowAll = () => {
    setSearchKeyword('');
    fetchUpdates('');
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
    fetchUpdates(searchKeyword);
  };

  const handleItemDeleted = (deletedId) => {
    setUpdates(prev => prev.filter(item => 
      item.id !== deletedId && 
      item.mongoId !== deletedId && 
      item.updateId !== deletedId
    ));
  };

  return (
    <div className="flex flex-col w-full animate-fade-in gap-3 pb-8">
      
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm p-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          
          <div className="flex items-center gap-2 mr-2">
            <Globe className="w-4 h-4 text-[#00bcd4]" />
            <span className="text-sm font-bold text-theme-main whitespace-nowrap">Manage Updates</span>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-disabled" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search by heading, date, or URL..."
                className="w-full pl-9 pr-3 py-1.5 bg-theme-surface border border-theme-border rounded-lg text-xs focus:outline-none focus:border-brand-orange text-theme-main transition-colors"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="sm"
            className="bg-[#00bcd4] hover:bg-[#00acc1] text-white border-transparent h-[34px] px-4 text-xs font-medium"
          >
            <Search className="w-3.5 h-3.5 mr-1" /> Search
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleShowAll}
            className="bg-[#673ab7] hover:bg-[#5e35b1] text-white border-transparent h-[34px] px-4 text-xs font-medium"
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
                <Plus className="w-3.5 h-3.5" /> + Add Record
              </>
            )}
          </button>

        </form>
      </div>

      {/* Form when open */}
      {isFormOpen && (
        <AddUpdateForm
          editData={editingItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Table */}
      <ManageUpdatesTable
        updates={updates}
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

export default UpdatesPage;
