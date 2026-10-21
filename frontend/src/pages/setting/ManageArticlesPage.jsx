import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Plus, Search, Edit2, Trash2, X, 
  Check, AlertCircle, ChevronUp, ChevronDown, Eye, CheckCircle2 
} from 'lucide-react';
import { settingService } from '../../services/settingService';
import Modal from '../../components/ui/Modal';
import { useUser } from '../../contexts/UserContext';
import { openReferenceView } from '../../utils/referenceViewUtil';
import ReferenceViewFormSection from '../../components/common/ReferenceViewFormSection';

const ManageArticlesPage = () => {
  const { user } = useUser();

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Sorted strictly by Year descending: 2026, 2025, etc.

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [modalForm, setModalForm] = useState({
    title: '',
    year: '',
    author: '',
    viewType: '',
    viewData: '',
    viewTitle: '',
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Feedback Toast
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchArticles = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await settingService.getArticles({
        search: params.search !== undefined ? params.search : searchQuery,
        all: true,
      });
      if (res && res.data) {
        setArticles(res.data);
        setTotalRecords(res.total ?? res.data.length);
      }
    } catch (err) {
      console.error('Failed to load articles:', err);
      showToast('error', 'Failed to load Articles from server.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchArticles({ search: searchQuery });
  };

  const handleResetAll = () => {
    setSearchQuery('');
    fetchArticles({ search: '' });
  };

  const handleOpenAddModal = () => {
    setEditingArticle(null);
    setModalForm({
      title: '',
      year: new Date().getFullYear().toString(),
      author: '',
      viewType: '',
      viewData: '',
      viewTitle: '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingArticle(item);
    setModalForm({
      title: item.title || '',
      year: item.year || '',
      author: item.author || '',
      viewType: item.viewType || '',
      viewData: item.viewData || '',
      viewTitle: item.viewTitle || '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e, isNext = false) => {
    if (e?.preventDefault) e.preventDefault();
    if (!modalForm.title.trim()) {
      setModalError('Article title is required.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      if (editingArticle) {
        await settingService.updateArticle(editingArticle._id || editingArticle.id, modalForm);
        showToast('success', 'Article updated successfully.');
        
        if (isNext) {
          const currentId = editingArticle._id || editingArticle.id;
          const currentIndex = sortedArticles.findIndex(a => (a._id || a.id) === currentId);
          if (currentIndex !== -1 && currentIndex + 1 < sortedArticles.length) {
            const nextItem = sortedArticles[currentIndex + 1];
            setEditingArticle(nextItem);
            setModalForm({
              title: nextItem.title || '',
              year: nextItem.year || '',
              author: nextItem.author || '',
              viewType: nextItem.viewType || '',
              viewData: nextItem.viewData || '',
              viewTitle: nextItem.viewTitle || '',
            });
            showToast('success', 'Updated! Advanced to next article.');
          } else {
            setIsModalOpen(false);
            showToast('success', 'Article updated. Reached end of list.');
          }
        } else {
          setIsModalOpen(false);
        }
      } else {
        await settingService.createArticle(modalForm);
        showToast('success', 'Article added successfully.');

        if (isNext) {
          setEditingArticle(null);
          setModalForm(prev => ({
            title: '',
            year: prev.year || new Date().getFullYear().toString(),
            author: prev.author || '',
            viewType: '',
            viewData: '',
            viewTitle: '',
          }));
          showToast('success', 'Article added! Ready for next entry.');
        } else {
          setIsModalOpen(false);
        }
      }
      fetchArticles();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save Article.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete Article "${item.title}"?`)) {
      return;
    }
    try {
      await settingService.deleteArticle(item._id || item.id);
      showToast('success', 'Article deleted.');
      fetchArticles();
    } catch {
      showToast('error', 'Failed to delete Article.');
    }
  };

  // Results listed strictly on the basis of years descending, and in sequential order 1 to 1544
  const sortedArticles = [...articles].sort((a, b) => {
    const yearA = parseInt(String(a.year || '').replace(/\D/g, ''), 10) || 0;
    const yearB = parseInt(String(b.year || '').replace(/\D/g, ''), 10) || 0;
    if (yearB !== yearA) {
      return yearB - yearA; // 2026, then 2025, then 2024, etc.
    }
    const srA = typeof a.srNumber === 'number' ? a.srNumber : parseInt(a.srNumber, 10) || 0;
    const srB = typeof b.srNumber === 'number' ? b.srNumber : parseInt(b.srNumber, 10) || 0;
    if (srA !== srB && srA > 0 && srB > 0) {
      return srA - srB; // 1, 2, 3, 4, ...
    }
    return (a.title || '').localeCompare(b.title || '');
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
            <BookOpen className="w-5 h-5 text-white" />
            <span>Manage Articles</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <form onSubmit={handleSearch} className="p-4 bg-gray-50/70 dark:bg-theme-surface-alt/30 border-b border-theme-border flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            placeholder="Search by Title or Author"
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
            <span>Add Article</span>
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
                <th className="py-2.5 px-4 w-28 text-center border-r border-[#d35400]">Year</th>
                <th className="py-2.5 px-4 border-r border-[#d35400]">Title</th>
                <th className="py-2.5 px-4 w-64 border-r border-[#d35400]">Author</th>
                <th className="py-2.5 px-4 w-24 text-center border-r border-[#d35400]">View</th>
                <th className="py-2.5 px-4 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-theme-muted font-medium">
                    Loading Articles...
                  </td>
                </tr>
              ) : sortedArticles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-theme-muted font-medium">
                    No Articles found.
                  </td>
                </tr>
              ) : (
                sortedArticles.map((item, idx) => (
                  <tr 
                    key={item._id || item.id || idx}
                    className="hover:bg-blue-50/50 dark:hover:bg-theme-surface-alt/50 transition-colors"
                  >
                    <td className="py-2 px-4 text-center text-theme-disabled font-medium">
                      {item.srNumber || idx + 1}
                    </td>
                    <td className="py-2 px-4 text-center font-bold text-brand-orange whitespace-nowrap">
                      {item.year || '—'}
                    </td>
                    <td className="py-2 px-4 text-theme-main font-semibold leading-relaxed">
                      {item.title}
                    </td>
                    <td className="py-2 px-4 text-theme-muted font-medium">
                      {item.author || '—'}
                    </td>
                    <td className="py-2 px-4 text-center whitespace-nowrap">
                      {item.viewData ? (
                        <button
                          type="button"
                          onClick={() => openReferenceView(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900 transition-all shadow-2xs hover:scale-105 cursor-pointer"
                          title="Click to open attachment / link / text in new tab"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 font-mono">—</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                          title="Edit Article"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                          title="Delete Article"
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

      {/* Add / Edit Article Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingArticle ? 'Edit Article' : 'Add New Article'}
        icon={BookOpen}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleModalSubmit} className="space-y-4 pt-1">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Top Action Bar (as in ss 1) */}
          <div className="flex items-center justify-end gap-2.5 pb-2.5 border-b border-theme-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-theme-border rounded-lg text-xs font-medium text-theme-muted hover:bg-theme-surface-alt transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleModalSubmit(null, true)}
              className="px-4 py-2 border border-brand-orange text-brand-orange hover:bg-brand-orange/10 rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
              title={editingArticle ? "Update this article and load the next article" : "Save this article and prepare next new entry"}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving…' : editingArticle ? 'Update + Next' : 'Save + Next'}</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#B91C1C] hover:bg-[#991b1b] text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Saving…' : editingArticle ? 'Update Article' : 'Save Article'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-theme-main mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={modalForm.title}
              onChange={(e) => setModalForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter article title..."
              className="w-full px-3.5 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-theme-main mb-1">
                Year
              </label>
              <input
                type="text"
                value={modalForm.year}
                onChange={(e) => setModalForm(prev => ({ ...prev, year: e.target.value }))}
                placeholder="e.g. 2026"
                className="w-full px-3.5 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-theme-main mb-1">
                Author
              </label>
              <input
                type="text"
                value={modalForm.author}
                onChange={(e) => setModalForm(prev => ({ ...prev, author: e.target.value }))}
                placeholder="e.g. Dr Ikramul Haq"
                className="w-full px-3.5 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          {/* View / Attachment / Link / Text Section - Doubled Length */}
          <ReferenceViewFormSection
            minRows={8}
            expanded={true}
            value={{
              viewType: modalForm.viewType,
              viewData: modalForm.viewData,
              viewTitle: modalForm.viewTitle,
            }}
            onChange={(val) => setModalForm(prev => ({ ...prev, ...val }))}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-theme-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-theme-border rounded-lg text-xs font-medium text-theme-muted hover:bg-theme-surface-alt transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleModalSubmit(null, true)}
              className="px-4 py-2 border border-brand-orange text-brand-orange hover:bg-brand-orange/10 rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
              title={editingArticle ? "Update this article and load the next article" : "Save this article and prepare next new entry"}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving…' : editingArticle ? 'Update + Next' : 'Save + Next'}</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#B91C1C] hover:bg-[#991b1b] text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Saving…' : editingArticle ? 'Update Article' : 'Save Article'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default ManageArticlesPage;
