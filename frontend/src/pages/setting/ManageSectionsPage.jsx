import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Hash, Plus, Search, Edit2, Trash2, X, 
  Check, AlertCircle, RefreshCw, ChevronUp, ChevronDown
} from 'lucide-react';
import { settingService } from '../../services/settingService';
import AdminFooter from '../../features/dashboard/components/AdminFooter';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import SearchableCombobox from '../../components/ui/SearchableCombobox';

const ManageSectionsPage = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters & Pagination
  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [modalForm, setModalForm] = useState({
    name: '',
    ordering: 1,
    status: 'active',
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);



  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    section: null,
  });

  // Feedback Toast
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSections = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const pageToFetch = params.page !== undefined ? params.page : currentPage;
      const limitToFetch = params.limit !== undefined ? params.limit : itemsPerPage;
      const searchToFetch = params.search !== undefined ? params.search : searchName;
      const statusToFetch = params.status !== undefined ? params.status : statusFilter;

      const res = await settingService.getSections({
        search: searchToFetch,
        status: statusToFetch,
        page: pageToFetch,
        limit: limitToFetch,
      });

      if (res && res.data) {
        setSections(res.data);
        setTotalRecords(res.total ?? res.data.length);
      }
    } catch (err) {
      console.error('Failed to load sections:', err);
      showToast('error', 'Failed to load sections from server.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchName, statusFilter]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const handleSearch = (e) => {
    e?.preventDefault();
    setCurrentPage(1);
    fetchSections({ page: 1, search: searchName, status: statusFilter });
  };

  const handleResetAll = () => {
    setSearchName('');
    setStatusFilter('all');
    setCurrentPage(1);
    fetchSections({ page: 1, search: '', status: 'all' });
  };

  const handleOpenAddModal = () => {
    setEditingSection(null);
    setModalForm({
      name: '',
      ordering: '',
      status: 'active',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingSection(item);
    setModalForm({
      name: item.name || '',
      ordering: item.ordering || 1,
      status: item.status || 'active',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.name.trim()) {
      setModalError('Section Number is required.');
      return;
    }

    const hasExplicitOrder = modalForm.ordering !== '' && modalForm.ordering !== undefined && !isNaN(Number(modalForm.ordering));
    const targetOrdering = hasExplicitOrder ? Number(modalForm.ordering) : undefined;

    await executeSave({
      name: modalForm.name.trim(),
      ordering: targetOrdering,
      isCustomOrdering: hasExplicitOrder,
      status: modalForm.status,
      editingId: editingSection?._id || null,
    });
  };

  const executeSave = async (payload) => {
    setSubmitting(true);
    setModalError('');
    try {
      if (payload.editingId) {
        await settingService.updateSection(payload.editingId, {
          name: payload.name,
          ordering: payload.ordering,
          status: payload.status,
        });
        showToast('success', `Section "${payload.name}" updated successfully.`);
      } else {
        await settingService.createSection({
          name: payload.name,
          ordering: payload.ordering,
          isCustomOrdering: payload.isCustomOrdering,
          status: payload.status,
        });
        showToast('success', `Section "${payload.name}" created successfully.`);
      }

      setIsModalOpen(false);
      fetchSections();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error saving section';
      setModalError(msg);
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSwap = async (section, direction) => {
    const currentIndex = sections.findIndex(s => s._id === section._id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const targetSection = sections[targetIndex];

    try {
      await settingService.swapSections(section._id, targetSection._id);
      showToast('success', `Order swapped: ${section.name} (now #${targetSection.ordering}) with ${targetSection.name} (now #${section.ordering})`);
      fetchSections();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to swap section order.');
    }
  };

  const handleDeleteClick = (section) => {
    setDeleteModal({ isOpen: true, section });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.section) return;
    try {
      await settingService.deleteSection(deleteModal.section._id);
      showToast('success', `Section "${deleteModal.section.name}" deleted.`);
      setDeleteModal({ isOpen: false, section: null });
      fetchSections();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete section.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-slide-down ${
          toast.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' 
            : 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Hash className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Manage Sections
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  {totalRecords.toLocaleString()} Total
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Configure statute sections and ordering used across Case Law, Notifications, and Statutes dropdowns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchSections()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Section</span>
            </button>
          </div>
        </div>

        {/* Filter Card */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Search by section name (e.g. 1(1), 2(14)(a), 231CB, 122)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            <div className="w-full sm:w-48">
              <SearchableCombobox
                value={statusFilter}
                onChange={(val) => {
                  const nextStatus = val || 'all';
                  setStatusFilter(nextStatus);
                  setCurrentPage(1);
                  fetchSections({ page: 1, status: nextStatus });
                }}
                options={[
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Active Only', value: 'active' },
                  { label: 'Inactive Only', value: 'inactive' }
                ]}
                placeholder="Status filter..."
                allowCustom={false}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white transition-colors cursor-pointer"
              >
                Search
              </button>
              {(searchName || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Sections Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/75 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3.5 w-16 text-center">Sr. #</th>
                  <th className="px-4 py-3.5">Section #</th>
                  <th className="px-4 py-3.5 w-36 text-center">Ordering</th>
                  <th className="px-4 py-3.5 w-28 text-center">Status</th>
                  <th className="px-4 py-3.5 w-32 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="inline-flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                        <span className="font-medium text-sm">Loading statutory sections...</span>
                      </div>
                    </td>
                  </tr>
                ) : sections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="max-w-sm mx-auto text-center space-y-2">
                        <Hash className="w-8 h-8 text-slate-400 mx-auto" />
                        <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Sections Found</div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {searchName ? 'Try a different search query or reset filters.' : 'Click "Add New Section" to create your first statutory section.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sections.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr 
                        key={item._id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
                          {rowNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-mono text-xs font-bold">
                            {item.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[28px]">
                              #{item.ordering}
                            </span>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => handleQuickSwap(item, 'up')}
                                disabled={idx === 0 && currentPage === 1}
                                className="p-0.5 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title="Move up"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickSwap(item, 'down')}
                                disabled={idx === sections.length - 1 && currentPage * itemsPerPage >= totalRecords}
                                className="p-0.5 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title="Move down"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            item.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-600'
                          }`}>
                            {item.status || 'active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Edit Section"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(item)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Delete Section"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!loading && totalRecords > 0 && (
            <div className="px-4 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    const nextLimit = Number(e.target.value);
                    setItemsPerPage(nextLimit);
                    setCurrentPage(1);
                    fetchSections({ page: 1, limit: nextLimit });
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span>per page • Total {totalRecords.toLocaleString()} sections</span>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalRecords / itemsPerPage)}
                onPageChange={(p) => {
                  setCurrentPage(p);
                  fetchSections({ page: p });
                }}
              />
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Section Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSection ? 'Edit Statutory Section' : 'Add New Statutory Section'}
        size="md"
      >
        <form onSubmit={handleModalSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Section # <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={modalForm.name}
              onChange={(e) => setModalForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. 1(1), 1(B), 1(B)(A), 231CB..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Ordering Number <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                type="number"
                min={1}
                value={modalForm.ordering}
                onChange={(e) => setModalForm(prev => ({ ...prev, ordering: e.target.value }))}
                placeholder="Auto (under parent)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <SearchableCombobox
                value={modalForm.status}
                onChange={(val) => setModalForm(prev => ({ ...prev, status: val || 'active' }))}
                options={[
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' }
                ]}
                allowCustom={false}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#3d4a7a] hover:bg-[#2e3a6a] text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving...' : editingSection ? 'Update Section' : 'Create Section'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, section: null })}
        title="Delete Statutory Section"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Are you sure you want to delete section <strong className="font-mono text-rose-600">"{deleteModal.section?.name}"</strong>?
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModal({ isOpen: false, section: null })}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>

      <AdminFooter />
    </div>
  );
};

export default ManageSectionsPage;
