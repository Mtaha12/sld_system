import React, { useState, useEffect, useCallback } from 'react';
import { 
  Scale, Plus, Search, Edit2, Trash2, X, 
  Check, AlertCircle, ChevronUp, ChevronDown
} from 'lucide-react';
import { settingService } from '../../services/settingService';
import AdminFooter from '../../features/dashboard/components/AdminFooter';
import Modal from '../../components/ui/Modal';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const ManageLegalMaximsPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  const [maxims, setMaxims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [searchName, setSearchName] = useState('');

  // Sorting
  const [sortAsc, setSortAsc] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaxim, setEditingMaxim] = useState(null);
  const [modalForm, setModalForm] = useState({
    name: '',
    meaning: '',
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Feedback Toast
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchMaxims = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await settingService.getLegalMaxims({
        search: params.search !== undefined ? params.search : searchName,
      });
      if (res && res.data) {
        setMaxims(res.data);
        setTotalRecords(res.total ?? res.data.length);
      }
    } catch (err) {
      console.error('Failed to load legal maxims:', err);
      showToast('error', 'Failed to load Legal Maxims from server.');
    } finally {
      setLoading(false);
    }
  }, [searchName]);

  useEffect(() => {
    fetchMaxims();
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchMaxims({ search: searchName });
  };

  const handleResetAll = () => {
    setSearchName('');
    fetchMaxims({ search: '' });
  };

  const handleOpenAddModal = () => {
    setEditingMaxim(null);
    setModalForm({
      name: '',
      meaning: '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingMaxim(item);
    setModalForm({
      name: item.name || '',
      meaning: item.meaning || '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.name.trim()) {
      setModalError('Legal Maxim name is required.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      if (editingMaxim) {
        await settingService.updateLegalMaxim(editingMaxim._id || editingMaxim.id, modalForm);
        showToast('success', 'Legal Maxim updated successfully.');
      } else {
        await settingService.createLegalMaxim(modalForm);
        showToast('success', 'Legal Maxim added successfully.');
      }
      setIsModalOpen(false);
      fetchMaxims();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save Legal Maxim.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete Legal Maxim "${item.name}"?`)) {
      return;
    }
    try {
      await settingService.deleteLegalMaxim(item._id || item.id);
      showToast('success', 'Legal Maxim deleted.');
      fetchMaxims();
    } catch {
      showToast('error', 'Failed to delete Legal Maxim.');
    }
  };

  const sortedMaxims = [...maxims].sort((a, b) => {
    const valA = (a.name || '').toLowerCase();
    const valB = (b.name || '').toLowerCase();
    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
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
        
        {/* Top Crimson Red Title Bar */}
        <div className="bg-[#B91C1C] text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-base tracking-wide">
            <Scale className="w-5 h-5 text-white" />
            <span>Manage Legal Maxim</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <form onSubmit={handleSearch} className="p-4 bg-gray-50/70 dark:bg-theme-surface-alt/30 border-b border-theme-border flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            placeholder="Search Legal Maxim"
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
            <span>Add Legal Maxim</span>
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
                    <span>Legal Maxim</span>
                    {sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                </th>
                <th className="py-2.5 px-4 border-r border-[#d35400]">Meaning / Interpretation</th>
                <th className="py-2.5 px-4 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border text-xs">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-theme-muted">
                    <span>Loading Legal Maxims...</span>
                  </td>
                </tr>
              ) : sortedMaxims.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-theme-muted font-medium">
                    No Legal Maxims found.
                  </td>
                </tr>
              ) : (
                sortedMaxims.map((item, idx) => (
                  <tr 
                    key={item._id || item.id || idx}
                    className="hover:bg-gray-50/80 dark:hover:bg-theme-surface-alt/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-center text-theme-muted font-semibold border-r border-theme-border">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-theme-main border-r border-theme-border italic">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-4 text-theme-muted border-r border-theme-border">
                      {item.meaning || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                          title="Edit Legal Maxim"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                          title="Delete Legal Maxim"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Legal Maxim Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMaxim ? "Edit Legal Maxim" : "Add Legal Maxim"}
        subtitle="Manage legal maxims for case law and research"
        icon={Scale}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleModalSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-theme-main mb-1">
              Legal Maxim <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={modalForm.name}
              onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
              placeholder="e.g. Audi alteram partem"
              className="w-full px-3 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-theme-main mb-1">
              Meaning / Interpretation (Optional)
            </label>
            <textarea
              rows={3}
              value={modalForm.meaning}
              onChange={(e) => setModalForm({ ...modalForm, meaning: e.target.value })}
              placeholder="e.g. No person should be condemned unheard..."
              className="w-full px-3 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange shadow-inner resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-theme-border rounded-lg text-xs font-semibold text-theme-muted hover:bg-theme-surface-alt transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-orange hover:bg-[#d34a26] text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingMaxim ? 'Save Changes' : 'Add Record'}
            </button>
          </div>
        </form>
      </Modal>

      <AdminFooter />
    </div>
  );
};

export default ManageLegalMaximsPage;
