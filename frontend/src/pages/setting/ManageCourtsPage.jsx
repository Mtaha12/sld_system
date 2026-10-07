import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Search, Edit2, Trash2, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { courtService } from '../../services/adminSettingsServices';
import AdminFooter from '../../features/dashboard/components/AdminFooter';
import Modal from '../../components/ui/Modal';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const UNDER_COURT_OPTIONS = [
  'Select',
  'Tribunal',
  'High Court',
  'Supreme Court',
  'Federal Court',
  'Special Court',
  'Other'
];

const ManageCourtsPage = () => {
  const { logout } = useUser();
  const navigate = useNavigate();

  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  const [searchName, setSearchName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalForm, setModalForm] = useState({ name: '', underCourt: 'High Court', ordering: 1 });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCourts = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await courtService.getCourts({
        search: params.search !== undefined ? params.search : searchName
      });
      if (res && res.data) {
        setCourts(res.data);
        setTotalRecords(res.total ?? res.data.length);
      }
    } catch {
      showToast('error', 'Failed to load courts from server.');
    } finally {
      setLoading(false);
    }
  }, [searchName]);

  useEffect(() => {
    fetchCourts();
  }, [fetchCourts]);

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchCourts({ search: searchName });
  };

  const handleReset = () => {
    setSearchName('');
    fetchCourts({ search: '' });
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalForm({
      name: '',
      underCourt: 'High Court',
      ordering: courts.length ? Math.max(...courts.map(c => c.ordering || 0)) + 1 : 1
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingItem(c);
    setModalForm({
      name: c.name || '',
      underCourt: c.underCourt || 'High Court',
      ordering: c.ordering || 1
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.name.trim()) {
      setModalError('Court Name is required.');
      return;
    }
    if (!modalForm.underCourt || modalForm.underCourt === 'Select') {
      setModalError('Under Court classification is required.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const payload = {
        name: modalForm.name.trim(),
        underCourt: modalForm.underCourt.trim(),
        ordering: Number(modalForm.ordering) || 1
      };

      if (editingItem) {
        await courtService.updateCourt(editingItem._id || editingItem.id, payload);
        showToast('success', `Court "${payload.name}" updated successfully.`);
      } else {
        await courtService.createCourt(payload);
        showToast('success', `Court "${payload.name}" added successfully.`);
      }

      setIsModalOpen(false);
      fetchCourts();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save court.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Are you sure you want to delete court "${c.name}"?`)) return;
    try {
      await courtService.deleteCourt(c._id || c.id);
      showToast('success', `Court "${c.name}" deleted successfully.`);
      fetchCourts();
    } catch {
      showToast('error', 'Failed to delete court.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-theme-bg flex flex-col font-sans transition-colors">
      
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-xs font-semibold animate-fade-in ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner Matching Screenshot 2 */}
      <div className="bg-[#B91C1C] text-white px-6 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-white/90" />
          <h1 className="text-base font-bold tracking-wide">Manage Courts</h1>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-4">
        {/* Search & Actions Bar matching Screenshot 2 */}
        <form onSubmit={handleSearch} className="bg-white dark:bg-theme-surface p-3.5 rounded-lg border border-theme-border shadow-sm flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            placeholder="Court Name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="flex-1 min-w-[200px] max-w-md px-3 py-1.5 text-xs bg-white dark:bg-theme-bg border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-[#00A8CC] hover:bg-[#0092b3] text-white rounded text-xs font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-1.5 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded text-xs font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>All</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-1.5 bg-[#2E7D32] hover:bg-[#256628] text-white rounded text-xs font-bold shadow-sm transition-colors ml-auto flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Court</span>
          </button>
        </form>

        <div className="px-2 flex justify-end items-center text-xs font-bold text-[#1E3A8A] dark:text-cyan-400">
          <span>Total Records: ({totalRecords})</span>
        </div>

        {/* Table View matching Screenshot 2 */}
        <div className="bg-white dark:bg-theme-surface rounded-lg border border-theme-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#E67E22] text-white text-xs font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-16 text-center border-r border-[#d35400]">Sr #</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">Court Name</th>
                  <th className="py-2.5 px-3 w-48 border-r border-[#d35400]">Under Court</th>
                  <th className="py-2.5 px-3 w-24 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-theme-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-orange" />
                      <span>Loading Courts...</span>
                    </td>
                  </tr>
                ) : courts.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-10 text-center text-theme-muted">
                      No courts found.
                    </td>
                  </tr>
                ) : (
                  courts.map((c, idx) => (
                    <tr key={c._id || idx} className="hover:bg-gray-50/70 dark:hover:bg-theme-surface-alt/30 transition-colors">
                      <td className="py-2.5 px-3 text-center text-theme-muted font-medium border-r border-theme-border/60">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-theme-main border-r border-theme-border/60">
                        {c.name}
                      </td>
                      <td className="py-2.5 px-3 text-theme-muted border-r border-theme-border/60 font-medium">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-theme-surface border border-theme-border/60">
                          {c.underCourt || 'High Court'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="w-6 h-6 rounded bg-[#00A8CC] hover:bg-[#0092b3] text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
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
      </div>

      {/* Add / Edit Court Detail Modal matching Screenshot 2 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Edit Court Detail" : "Add Court Detail"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleModalSubmit} className="space-y-3.5 pt-1 text-xs">
          {modalError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-theme-main mb-1">
              Court Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={modalForm.name}
              onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
              placeholder="e.g. Lahore High Court"
              className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-theme-main mb-1">
              Under Court <span className="text-red-500">*</span>
            </label>
            <select
              value={modalForm.underCourt}
              onChange={(e) => setModalForm({ ...modalForm, underCourt: e.target.value })}
              className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
            >
              {UNDER_COURT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-1.5 rounded border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-xs font-semibold text-theme-main cursor-pointer"
            >
              Closed
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded bg-[#00A8CC] hover:bg-[#0092b3] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Record'}
            </button>
          </div>
        </form>
      </Modal>

      <AdminFooter />
    </div>
  );
};

export default ManageCourtsPage;
