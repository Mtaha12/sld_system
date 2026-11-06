import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, List, MessageSquare, X } from 'lucide-react';
import Button from '../components/ui/Button';
import AddWhatsappForm from '../features/whatsapp/components/AddWhatsappForm';
import ManageWhatsappTable from '../features/whatsapp/components/ManageWhatsappTable';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import { whatsappService } from '../features/whatsapp/services/whatsappService';
import { useUser } from '../contexts/UserContext';

const WhatsappUpdatesPage = () => {
  const { user } = useUser();
  const isAdmin = user?.role === 'Administrator' || Boolean(user?.allowAllForms);

  const [updates, setUpdates] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'dated', direction: 'desc' });
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [lastSavedDate, setLastSavedDate] = useState('');

  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  useEffect(() => {
    if (!editId) return;
    let mounted = true;
    whatsappService.getUpdateById(editId)
      .then(item => {
        if (mounted && item) {
          setEditingItem(item);
          setIsFormOpen(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      })
      .catch(err => {
        console.warn('Could not load edit item by param:', err);
      });
    return () => { mounted = false; };
  }, [editId]);

  const fetchUpdates = useCallback(async (page = 1, query = '', sort = 'dated', order = 'desc') => {
    setIsLoading(true);
    try {
      const data = await whatsappService.getUpdates({ page, limit: 25, query, sort, order });
      setUpdates(data);
      if (Array.isArray(data) && data.length > 0 && (data[0].dated || data[0].date)) {
        setLastSavedDate(prev => prev || data[0].dated || data[0].date);
      }
      setTotalItems(data.total || data.length || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('[WhatsappUpdatesPage] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpdates(currentPage, searchKeyword, sortConfig.key, sortConfig.direction);
  }, [fetchUpdates, currentPage, sortConfig]);

  const handleSortChange = (key) => {
    setSortConfig(prev => {
      let nextDir = 'desc';
      if (prev.key === key) {
        nextDir = prev.direction === 'desc' ? 'asc' : 'desc';
      }
      return { key, direction: nextDir };
    });
    setCurrentPage(1);
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setCurrentPage(1);
    fetchUpdates(1, searchKeyword, sortConfig.key, sortConfig.direction);
  };

  const handleShowAll = () => {
    setSearchKeyword('');
    setCurrentPage(1);
    fetchUpdates(1, '', sortConfig.key, sortConfig.direction);
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

  const handleFormSuccess = (savedItem, message, options = {}) => {
    setToastMessage(message || 'Success');
    if (!options?.keepOpen) {
      setIsFormOpen(false);
      setEditingItem(null);
    }
    fetchUpdates(currentPage, searchKeyword);
  };

  const handleItemDeleted = (deletedId) => {
    fetchUpdates(currentPage, searchKeyword);
  };

  return (
    <div className="flex flex-col w-full animate-fade-in gap-3 pb-8">
      
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm p-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          
          <div className="flex items-center gap-2 mr-2">
            <MessageSquare className="w-4 h-4 text-[#00bcd4]" />
            <span className="text-sm font-bold text-theme-main whitespace-nowrap">{isAdmin ? 'Manage Whatsapp Updates' : 'Whatsapp Updates'}</span>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-disabled" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search by heading or date..."
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

      {/* Form when open */}
      {isAdmin && isFormOpen && (
        <AddWhatsappForm
          editData={editingItem}
          latestEntry={updates && updates.length > 0 ? updates[0] : null}
          lastSavedDate={lastSavedDate || (updates && updates.length > 0 ? (updates[0]?.dated || updates[0]?.date) : '')}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onSuccess={(savedItem, message, opts) => {
            if (savedItem?.dated || savedItem?.date) {
              setLastSavedDate(savedItem.dated || savedItem.date);
            }
            handleFormSuccess(savedItem, message, opts);
          }}
        />
      )}

      {/* Table */}
      <ManageWhatsappTable
        updates={updates}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalItems={totalItems}
        totalPages={totalPages}
        serverPaginated={true}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
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

export default WhatsappUpdatesPage;
