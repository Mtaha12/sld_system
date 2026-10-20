import React, { useState, useEffect, useCallback } from 'react';
import { 
  Layers, Plus, Search, Edit2, Trash2, X, 
  Check, AlertCircle, ChevronUp, ChevronDown
} from 'lucide-react';
import { settingService } from '../../services/settingService';
import Modal from '../../components/ui/Modal';
import { useUser } from '../../contexts/UserContext';

const ManageTopicsPage = () => {
  const { user } = useUser();

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortAsc, setSortAsc] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [modalForm, setModalForm] = useState({
    heading: '',
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Feedback Toast
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTopics = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await settingService.getTopics({
        search: params.search !== undefined ? params.search : searchQuery,
        all: true,
      });
      if (res && res.data) {
        setTopics(res.data);
        setTotalRecords(res.total ?? res.data.length);
      }
    } catch (err) {
      console.error('Failed to load topics:', err);
      showToast('error', 'Failed to load Topics from server.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchTopics({ search: searchQuery });
  };

  const handleResetAll = () => {
    setSearchQuery('');
    fetchTopics({ search: '' });
  };

  const handleOpenAddModal = () => {
    setEditingTopic(null);
    setModalForm({ heading: '' });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingTopic(item);
    setModalForm({ heading: item.heading || '' });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.heading.trim()) {
      setModalError('Topic heading is required.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      if (editingTopic) {
        await settingService.updateTopic(editingTopic._id || editingTopic.id, modalForm);
        showToast('success', 'Topic updated successfully.');
      } else {
        await settingService.createTopic(modalForm);
        showToast('success', 'Topic added successfully.');
      }
      setIsModalOpen(false);
      fetchTopics();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save Topic.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete Topic "${item.heading}"?`)) {
      return;
    }
    try {
      await settingService.deleteTopic(item._id || item.id);
      showToast('success', 'Topic deleted.');
      fetchTopics();
    } catch {
      showToast('error', 'Failed to delete Topic.');
    }
  };

  const sortedTopics = [...topics].sort((a, b) => {
    const valA = (a.heading || '').toLowerCase();
    const valB = (b.heading || '').toLowerCase();
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
        
        {/* Top Header */}
        <div className="bg-[#B91C1C] text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-base tracking-wide">
            <Layers className="w-5 h-5 text-white" />
            <span>Manage Topics</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <form onSubmit={handleSearch} className="p-4 bg-gray-50/70 dark:bg-theme-surface-alt/30 border-b border-theme-border flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            placeholder="Search Topic Heading"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            <span>Add Topic</span>
          </button>
        </form>

        {/* Total Records Right Banner */}
        <div className="px-5 py-2 flex justify-end items-center text-xs font-bold text-[#1E3A8A] dark:text-cyan-400 bg-white dark:bg-theme-surface">
          <span>Total Records: ({totalRecords})</span>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto max-h-[680px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#E67E22] text-white text-xs font-bold uppercase tracking-wider">
                <th className="py-2.5 px-4 w-16 text-center border-r border-[#d35400]">Sr #</th>
                <th 
                  className="py-2.5 px-4 cursor-pointer hover:bg-[#d35400] transition-colors border-r border-[#d35400]"
                  onClick={() => setSortAsc(!sortAsc)}
                >
                  <div className="flex items-center gap-1">
                    <span>Topic / Heading</span>
                    {sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                </th>
                <th className="py-2.5 px-4 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-theme-muted font-medium">
                    Loading Topics...
                  </td>
                </tr>
              ) : sortedTopics.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-theme-muted font-medium">
                    No Topics found.
                  </td>
                </tr>
              ) : (
                sortedTopics.map((item, idx) => (
                  <tr 
                    key={item._id || item.id || idx}
                    className="hover:bg-blue-50/50 dark:hover:bg-theme-surface-alt/50 transition-colors"
                  >
                    <td className="py-2 px-4 text-center text-theme-disabled font-medium">
                      {item.srNumber || idx + 1}
                    </td>
                    <td className="py-2 px-4 text-theme-main font-semibold leading-relaxed">
                      {item.heading}
                    </td>
                    <td className="py-2 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                          title="Edit Topic"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                          title="Delete Topic"
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

      {/* Add / Edit Topic Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTopic ? 'Edit Topic' : 'Add New Topic'}
        icon={Layers}
      >
        <form onSubmit={handleModalSubmit} className="space-y-4 pt-1">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-theme-main mb-1">
              Heading / Topic Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={modalForm.heading}
              onChange={(e) => setModalForm(prev => ({ ...prev, heading: e.target.value }))}
              placeholder="Enter topic heading..."
              className="w-full px-3.5 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-theme-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-theme-border rounded-lg text-xs font-medium text-theme-muted hover:bg-theme-surface-alt transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#B91C1C] hover:bg-[#991b1b] text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Saving…' : editingTopic ? 'Update Topic' : 'Save Topic'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default ManageTopicsPage;
