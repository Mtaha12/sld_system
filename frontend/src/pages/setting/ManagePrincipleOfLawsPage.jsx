import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Plus, Search, Edit2, Trash2, X, 
  Check, AlertCircle, RefreshCw, ChevronUp, ChevronDown, User, LogOut
} from 'lucide-react';
import { settingService } from '../../services/settingService';
import AdminFooter from '../../features/dashboard/components/AdminFooter';
import Modal from '../../components/ui/Modal';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const ManagePrincipleOfLawsPage = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const [principles, setPrinciples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [searchName, setSearchName] = useState('');

  // Sorting
  const [sortAsc, setSortAsc] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrinciple, setEditingPrinciple] = useState(null);
  const [modalForm, setModalForm] = useState({
    name: '',
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Feedback Toast
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPrinciples = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await settingService.getPrinciples({
        search: params.search !== undefined ? params.search : searchName,
      });
      if (res && res.data) {
        setPrinciples(res.data);
        setTotalRecords(res.total ?? res.data.length);
      }
    } catch (err) {
      console.error('Failed to load principles:', err);
      showToast('error', 'Failed to load Principle of Laws from server.');
    } finally {
      setLoading(false);
    }
  }, [searchName]);

  useEffect(() => {
    fetchPrinciples();
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchPrinciples({ search: searchName });
  };

  const handleResetAll = () => {
    setSearchName('');
    fetchPrinciples({ search: '' });
  };

  const handleOpenAddModal = () => {
    setEditingPrinciple(null);
    setModalForm({
      name: '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingPrinciple(item);
    setModalForm({
      name: item.name || '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.name.trim()) {
      setModalError('Law Name is required.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      if (editingPrinciple) {
        await settingService.updatePrinciple(editingPrinciple._id || editingPrinciple.id, modalForm);
        showToast('success', 'Principle of Law updated successfully.');
      } else {
        await settingService.createPrinciple(modalForm);
        showToast('success', 'Principle of Law added successfully.');
      }
      setIsModalOpen(false);
      fetchPrinciples();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save Principle of Law.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      await settingService.deletePrinciple(item._id || item.id);
      showToast('success', 'Principle of Law deleted.');
      fetchPrinciples();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete record.');
    }
  };

  const sortedPrinciples = [...principles].sort((a, b) => {
    let valA = (a.name || '').toLowerCase();
    let valB = (b.name || '').toLowerCase();
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <div className="flex flex-col w-full animate-fade-in gap-5 select-none">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold text-white animate-fade-in ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden">
        
        {/* Top Crimson Red Title Bar (Matching Reference Infographic) */}
        <div className="bg-[#B91C1C] text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-base tracking-wide">
            <FileText className="w-5 h-5 text-white" />
            <span>Manage Principle of Laws</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-1.5 hover:text-white/80 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>My Account</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 hover:text-white/80 transition-colors text-white/90"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <form onSubmit={handleSearch} className="p-4 bg-gray-50/70 dark:bg-theme-surface-alt/30 border-b border-theme-border flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            placeholder="Name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="px-3.5 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange w-72 shadow-inner"
          />

          <button
            type="submit"
            className="px-4 py-1.5 bg-[#00A8CC] hover:bg-[#0092b3] text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            Search
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className="px-4 py-1.5 bg-[#7E57C2] hover:bg-[#6c48ab] text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            All
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-1.5 bg-[#2E7D32] hover:bg-[#256628] text-white rounded-lg text-xs font-bold shadow-sm transition-colors ml-auto flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Principle of Laws</span>
          </button>
        </form>

        {/* Total Records Right Banner */}
        <div className="px-5 py-2 flex justify-end items-center text-xs font-bold text-[#1E3A8A] dark:text-cyan-400 bg-white dark:bg-theme-surface">
          <span>Total Records: ({totalRecords})</span>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#E67E22] text-white text-xs font-bold uppercase tracking-wider">
                <th className="py-2.5 px-4 w-16 text-center border-r border-[#d35400]">Sr #</th>
                <th 
                  className="py-2.5 px-4 cursor-pointer hover:bg-[#d35400] transition-colors border-r border-[#d35400]"
                  onClick={() => setSortAsc(!sortAsc)}
                >
                  <div className="flex items-center gap-1">
                    <span>Law Name</span>
                    {sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                </th>
                <th className="py-2.5 px-4 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border text-xs">
              {loading ? (
                <tr>
                  <td colSpan="3" className="py-12 text-center text-theme-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-orange" />
                    <span>Loading Principle of Laws...</span>
                  </td>
                </tr>
              ) : sortedPrinciples.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-10 text-center text-theme-muted">
                    No principles found.
                  </td>
                </tr>
              ) : (
                sortedPrinciples.map((item, idx) => (
                  <tr 
                    key={item._id || idx}
                    className="hover:bg-gray-50/70 dark:hover:bg-theme-surface-alt/30 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-center text-theme-muted font-medium border-r border-theme-border/60">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-theme-main border-r border-theme-border/60">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="w-6 h-6 rounded bg-[#00A8CC] hover:bg-[#0092b3] text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="w-6 h-6 rounded bg-[#E53935] hover:bg-[#c62828] text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Add / Edit Principle of Laws Modal (Screenshot 2 & 4 Matching) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPrinciple ? "Edit Principle of Laws" : "Add Principle of Laws"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleModalSubmit} className="space-y-4 pt-1">
          {modalError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-theme-main mb-1">
              Law Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={modalForm.name}
              onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
              placeholder="Enter law principle name..."
              className="w-full px-3.5 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-1.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-xs font-semibold text-theme-main cursor-pointer"
            >
              Closed
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-lg bg-[#00A8CC] hover:bg-[#0092b3] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              {submitting ? 'Saving...' : editingPrinciple ? 'Save Changes' : 'Add Record'}
            </button>
          </div>
        </form>
      </Modal>

      <AdminFooter />
    </div>
  );
};

export default ManagePrincipleOfLawsPage;
