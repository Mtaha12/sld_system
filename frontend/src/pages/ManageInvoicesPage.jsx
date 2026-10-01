import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, List, Receipt, X } from 'lucide-react';
import Button from '../components/ui/Button';
import AddInvoiceForm from '../features/invoices/components/AddInvoiceForm';
import ManageInvoicesTable from '../features/invoices/components/ManageInvoicesTable';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import { invoiceService } from '../features/invoices/services/invoiceService';

const ManageInvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const fetchInvoices = useCallback(async (query = '') => {
    setIsLoading(true);
    try {
      const data = await invoiceService.getInvoices(query);
      setInvoices(data);
    } catch (err) {
      console.error('[ManageInvoicesPage] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    fetchInvoices(searchKeyword);
  };

  const handleShowAll = () => {
    setSearchKeyword('');
    fetchInvoices('');
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
    fetchInvoices(searchKeyword);
  };

  const handleItemDeleted = (deletedId) => {
    setInvoices(prev => prev.filter(item => 
      item.id !== deletedId && 
      item.mongoId !== deletedId && 
      item.invoiceId !== deletedId
    ));
  };

  return (
    <div className="flex flex-col w-full animate-fade-in gap-3 pb-8">
      
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm p-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          
          <div className="flex items-center gap-2 mr-2">
            <Receipt className="w-4 h-4 text-brand-orange" />
            <span className="text-sm font-bold text-theme-main whitespace-nowrap">Manage Invoices</span>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-disabled" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search by Client, Invoice #, Address..."
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
                <Plus className="w-3.5 h-3.5" /> + Add Invoice
              </>
            )}
          </button>

        </form>
      </div>

      {/* Form (when open) */}
      {isFormOpen && (
        <AddInvoiceForm
          editData={editingItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Table */}
      <ManageInvoicesTable
        invoices={invoices}
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

export default ManageInvoicesPage;
