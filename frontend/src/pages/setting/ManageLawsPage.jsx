import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Plus, Search, Edit2, Trash2, X, 
  Check, AlertCircle, RefreshCw, ChevronUp, ChevronDown, User, LogOut, Calendar
} from 'lucide-react';
import { settingService } from '../../services/settingService';
import AdminFooter from '../../features/dashboard/components/AdminFooter';
import Modal from '../../components/ui/Modal';
import DatePicker from '../../components/ui/DatePicker';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const ManageLawsPage = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const [laws, setLaws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [searchCourt, setSearchCourt] = useState('');

  // Sorting
  const [sortField, setSortField] = useState('ordering');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLaw, setEditingLaw] = useState(null);
  const [modalForm, setModalForm] = useState({
    name: '',
    ordering: 1,
    date: new Date(),
    court: '',
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Ordering Conflict Modal State (Prompt requested popup notification)
  const [conflictModal, setConflictModal] = useState({
    isOpen: false,
    conflictingLaw: null,
    pendingPayload: null
  });

  // Feedback Toast
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchLaws = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await settingService.getLaws({
        search: params.search !== undefined ? params.search : searchName,
        court: params.court !== undefined ? params.court : searchCourt,
      });
      if (res && res.data) {
        setLaws(res.data);
        setTotalRecords(res.total ?? res.data.length);
      }
    } catch (err) {
      console.error('Failed to load laws:', err);
      showToast('error', 'Failed to load Laws / Statutes from server.');
    } finally {
      setLoading(false);
    }
  }, [searchName, searchCourt]);

  useEffect(() => {
    fetchLaws();
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchLaws({ search: searchName, court: searchCourt });
  };

  const handleResetAll = () => {
    setSearchName('');
    setSearchCourt('');
    fetchLaws({ search: '', court: '' });
  };

  const handleOpenAddModal = () => {
    setEditingLaw(null);
    setModalForm({
      name: '',
      ordering: (laws.length ? Math.max(...laws.map(l => l.ordering || 0)) + 1 : 1),
      date: new Date(),
      court: '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingLaw(item);
    setModalForm({
      name: item.name || '',
      ordering: item.ordering || 1,
      date: item.date ? new Date(item.date) : new Date(),
      court: item.court || '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.name.trim()) {
      setModalError('Law / Statute Name is required.');
      return;
    }

    const targetOrder = Number(modalForm.ordering) || 1;
    const currentLawId = editingLaw ? (editingLaw._id || editingLaw.id) : null;
    const conflictingLaw = laws.find(l => 
      Number(l.ordering) === targetOrder && 
      (currentLawId ? String(l._id || l.id) !== String(currentLawId) : true)
    );

    // If an existing law already has this order, trigger popup notification to allow replacing
    if (conflictingLaw) {
      setConflictModal({
        isOpen: true,
        conflictingLaw,
        pendingPayload: { ...modalForm }
      });
      return;
    }

    await saveLaw(modalForm);
  };

  const saveLaw = async (payload, swapWithId = null) => {
    setSubmitting(true);
    setModalError('');

    try {
      const dataToSend = swapWithId ? { ...payload, swapWithId } : payload;
      if (editingLaw) {
        const res = await settingService.updateLaw(editingLaw._id || editingLaw.id, dataToSend);
        const count = res?.casesUpdated;
        showToast('success', swapWithId 
          ? `Order updated! Replaced and swapped ordering with "${conflictModal.conflictingLaw?.name}".`
          : (count > 0 
              ? `Law / Statute updated! Date synchronized across ${count} associated law case(s).`
              : 'Law / Statute updated successfully.')
        );
      } else {
        const res = await settingService.createLaw(dataToSend);
        const count = res?.casesUpdated;
        showToast('success', swapWithId
          ? `Law added! Replaced ordering at #${payload.ordering}.`
          : (count > 0
              ? `Law / Statute added! Date synchronized across ${count} associated law case(s).`
              : 'Law / Statute added successfully.')
        );
      }
      setIsModalOpen(false);
      setConflictModal({ isOpen: false, conflictingLaw: null, pendingPayload: null });
      fetchLaws();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save Law / Statute.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReplace = async () => {
    if (!conflictModal.conflictingLaw || !conflictModal.pendingPayload) return;
    await saveLaw(conflictModal.pendingPayload, conflictModal.conflictingLaw._id || conflictModal.conflictingLaw.id);
  };

  const handleQuickReorder = async (law, direction) => {
    const currentIndex = sortedLaws.findIndex(l => (l._id || l.id) === (law._id || law.id));
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedLaws.length) return;
    const otherLaw = sortedLaws[targetIndex];

    try {
      await settingService.swapLaws(law._id || law.id, otherLaw._id || otherLaw.id);
      showToast('success', `Moved "${law.name}" to order ${otherLaw.ordering}.`);
      fetchLaws();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to change ordering.');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      await settingService.deleteLaw(item._id || item.id);
      showToast('success', 'Law / Statute deleted.');
      fetchLaws();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete law.');
    }
  };

  const sortedLaws = [...laws].sort((a, b) => {
    if (sortField === 'ordering') {
      const numA = Number(a.ordering) || 0;
      const numB = Number(b.ordering) || 0;
      return sortAsc ? numA - numB : numB - numA;
    }
    let valA = (a[sortField] || '').toString().toLowerCase();
    let valB = (b[sortField] || '').toString().toLowerCase();
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

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
            <span>Manage Laws / Statutes</span>
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
            placeholder="Court Name / Search"
            value={searchCourt}
            onChange={(e) => setSearchCourt(e.target.value)}
            className="px-3.5 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange w-60 shadow-inner"
          />

          <input
            type="text"
            placeholder="Law Name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="px-3.5 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange w-60 shadow-inner"
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
            <span>Add Law / Statute</span>
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
                  className="py-2.5 px-4 w-24 text-center cursor-pointer hover:bg-[#d35400] transition-colors border-r border-[#d35400]"
                  onClick={() => toggleSort('ordering')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Ordering</span>
                    {sortField === 'ordering' ? (
                      sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : <span className="text-white/60 text-[10px]">⇅</span>}
                  </div>
                </th>
                <th 
                  className="py-2.5 px-4 cursor-pointer hover:bg-[#d35400] transition-colors border-r border-[#d35400]"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>Law / Statute Name</span>
                    {sortField === 'name' ? (
                      sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : <span className="text-white/60 text-[10px]">⇅</span>}
                  </div>
                </th>
                <th className="py-2.5 px-4 w-32 border-r border-[#d35400]">Date</th>
                <th className="py-2.5 px-4 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border text-xs">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-theme-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-orange" />
                    <span>Loading Laws & Statutes...</span>
                  </td>
                </tr>
              ) : sortedLaws.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-theme-muted">
                    No laws or statutes found.
                  </td>
                </tr>
              ) : (
                sortedLaws.map((item, idx) => (
                  <tr 
                    key={item._id || idx}
                    className="hover:bg-gray-50/70 dark:hover:bg-theme-surface-alt/30 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-center text-theme-muted font-medium border-r border-theme-border/60">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-theme-main border-r border-theme-border/60">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="w-5 text-center">{item.ordering || idx + 1}</span>
                        <div className="flex flex-col -space-y-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleQuickReorder(item, 'up')}
                            className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-theme-surface text-theme-muted hover:text-theme-main transition-colors ${idx === 0 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                            title="Move Order Up"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sortedLaws.length - 1}
                            onClick={() => handleQuickReorder(item, 'down')}
                            className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-theme-surface text-theme-muted hover:text-theme-main transition-colors ${idx === sortedLaws.length - 1 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                            title="Move Order Down"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-theme-main border-r border-theme-border/60">
                      {item.name}
                      {item.court && (
                        <span className="text-[11px] text-theme-muted block font-normal">
                          {item.court}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-theme-muted border-r border-theme-border/60">
                      {item.date ? new Date(item.date).toLocaleDateString('en-GB') : '-'}
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

      {/* Add / Edit Law or Statute Modal (Screenshot 5 Matching) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLaw ? "Edit Law / Statute Detail" : "Add Law / Statute Detail"}
        maxWidth="max-w-2xl"
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
              Law / Statute Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={modalForm.name}
              onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
              placeholder="Enter full law / statute name..."
              className="w-full px-3.5 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-theme-main mb-1">
                Ordering <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                value={modalForm.ordering}
                onChange={(e) => setModalForm({ ...modalForm, ordering: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-theme-main mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <DatePicker
                selectedDate={modalForm.date}
                onChange={(d) => setModalForm({ ...modalForm, date: d })}
                placeholder="Select date"
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-theme-main mb-1">
              Court / Authority
            </label>
            <input
              type="text"
              value={modalForm.court}
              onChange={(e) => setModalForm({ ...modalForm, court: e.target.value })}
              placeholder="e.g. High Court / Supreme Court / FBR"
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
              {submitting ? 'Saving...' : editingLaw ? 'Save Changes' : 'Add Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Ordering Conflict Popup Notification Modal (Prompt Requirement) */}
      <Modal
        isOpen={conflictModal.isOpen}
        onClose={() => setConflictModal({ isOpen: false, conflictingLaw: null, pendingPayload: null })}
        title="Ordering Number Notice"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-1">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <p className="font-bold text-sm">Law Already Exists at Order #{conflictModal.conflictingLaw?.ordering}</p>
              <p>
                At order number <span className="font-bold text-amber-950 dark:text-white">#{conflictModal.conflictingLaw?.ordering}</span>, you currently have:
              </p>
              <div className="p-2.5 bg-white dark:bg-theme-surface rounded-lg border border-amber-200 dark:border-amber-900 font-semibold text-theme-main">
                {conflictModal.conflictingLaw?.name}
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                You can replace it and swap orders without contradiction, ensuring all dropdowns and lists update cleanly in the database.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-border">
            <button
              type="button"
              onClick={() => setConflictModal({ isOpen: false, conflictingLaw: null, pendingPayload: null })}
              className="px-4 py-1.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-xs font-semibold text-theme-main cursor-pointer"
            >
              Change Order #
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmReplace}
              className="px-4 py-1.5 rounded-lg bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{submitting ? 'Updating...' : 'Replace & Swap Order'}</span>
            </button>
          </div>
        </div>
      </Modal>

      <AdminFooter />
    </div>
  );
};

export default ManageLawsPage;
