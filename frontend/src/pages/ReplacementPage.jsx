import React, { useState, useEffect } from 'react';
import { Replace, Search, RefreshCw, AlertCircle, Check, History } from 'lucide-react';
import { replacementService } from '../services/adminSettingsServices';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const TARGET_FIELDS = [
  'Select',
  'Head Note',
  'Judgment',
  'Judges',
  'Petitioners',
  'Case #',
  'Laws',
  'References'
];

const ReplacementPage = () => {
  const { logout } = useUser();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    findText: '',
    replaceWith: '',
    fromId: '',
    toId: '',
    updateFor: 'Select'
  });

  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [toast, setToast] = useState(null);
  const [resultSummary, setResultSummary] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await replacementService.getHistory();
      if (res && res.data) setHistory(res.data);
    } catch {
      // Non-blocking
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.findText.trim()) {
      showToast('error', '"Find" text is required.');
      return;
    }
    if (!form.toId.trim()) {
      showToast('error', '"To ID" is required.');
      return;
    }
    if (form.updateFor === 'Select') {
      showToast('error', 'Please select a valid "Update For" target field.');
      return;
    }

    if (!window.confirm(`Are you sure you want to replace "${form.findText}" with "${form.replaceWith}" across ${form.updateFor} for cases between ID ${form.fromId || 1} and ${form.toId}? This will update the database directly.`)) {
      return;
    }

    setSubmitting(true);
    setResultSummary(null);

    try {
      const res = await replacementService.executeReplacement({
        findText: form.findText.trim(),
        replaceWith: form.replaceWith,
        fromId: form.fromId.trim(),
        toId: form.toId.trim(),
        updateFor: form.updateFor
      });

      showToast(res.affectedCasesCount > 0 ? 'success' : 'warning', res.message);
      setResultSummary(res);
      fetchHistory();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Replacement operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return '—';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}`;
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-theme-bg flex flex-col font-sans transition-colors">
      
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-xs font-semibold animate-fade-in ${
          toast.type === 'error' ? 'bg-red-600' : toast.type === 'warning' ? 'bg-amber-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner Matching Screenshot 4 */}
      <div className="bg-[#B91C1C] text-white px-6 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Replace className="w-5 h-5 text-white/90" />
          <h1 className="text-base font-bold tracking-wide">Replacement</h1>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-5">
        
        {/* Replacement Form Card matching Screenshot 4 */}
        <div className="bg-white dark:bg-theme-surface rounded-lg border border-theme-border shadow-sm overflow-hidden">
          <div className="bg-gray-100 dark:bg-theme-bg px-4 py-2 border-b border-theme-border">
            <h2 className="text-xs font-bold text-theme-main">Replacement</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
            {/* Row 1: Find * and Replace With * */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-theme-main mb-1">
                  Find <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.findText}
                  onChange={(e) => setForm({ ...form, findText: e.target.value })}
                  placeholder="Enter text to find..."
                  className="w-full px-3 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-main mb-1">
                  Replace With <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.replaceWith}
                  onChange={(e) => setForm({ ...form, replaceWith: e.target.value })}
                  placeholder="Enter replacement text..."
                  className="w-full px-3 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
                />
              </div>
            </div>

            {/* Row 2: From ID, To ID *, Update For * */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-theme-main mb-1">
                  From ID
                </label>
                <input
                  type="text"
                  value={form.fromId}
                  onChange={(e) => setForm({ ...form, fromId: e.target.value })}
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-main mb-1">
                  To ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.toId}
                  onChange={(e) => setForm({ ...form, toId: e.target.value })}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-main mb-1">
                  Update For <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.updateFor}
                  onChange={(e) => setForm({ ...form, updateFor: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
                >
                  {TARGET_FIELDS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-theme-border">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-[#00A8CC] hover:bg-[#0092b3] text-white rounded text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Executing Batch Replacement...' : 'Update'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Replacement Summary Feedback */}
        {resultSummary && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs space-y-2">
            <h3 className="font-bold text-[#1E3A8A] dark:text-cyan-400 text-sm">
              Batch Replacement Result:
            </h3>
            <p className="text-theme-main">{resultSummary.message}</p>
            {resultSummary.affectedCasesCount > 0 && (
              <p className="text-theme-muted">
                Total cases updated: <span className="font-bold text-emerald-600">{resultSummary.affectedCasesCount}</span>. The changes are now live across all searches and case detail views.
              </p>
            )}
          </div>
        )}

        {/* Audit History of Replacements */}
        <div className="bg-white dark:bg-theme-surface rounded-lg border border-theme-border shadow-sm overflow-hidden">
          <div className="bg-gray-100 dark:bg-theme-bg px-4 py-2.5 border-b border-theme-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-theme-muted" />
              <h3 className="text-xs font-bold text-theme-main">Replacement History & Audit Log</h3>
            </div>
            <span className="text-[11px] text-theme-muted">Showing recent operations</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#E67E22] text-white text-xs font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-12 text-center border-r border-[#d35400]">Sr #</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">Find Text</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">Replace With</th>
                  <th className="py-2.5 px-3 w-28 text-center border-r border-[#d35400]">Field</th>
                  <th className="py-2.5 px-3 w-28 text-center border-r border-[#d35400]">Range</th>
                  <th className="py-2.5 px-3 w-28 text-center border-r border-[#d35400]">Cases Updated</th>
                  <th className="py-2.5 px-3 w-36 border-r border-[#d35400]">Executed By</th>
                  <th className="py-2.5 px-3 w-36">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {loadingHistory ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-theme-muted">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-brand-orange" />
                      <span>Loading replacement history...</span>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-theme-muted">
                      No replacements executed yet.
                    </td>
                  </tr>
                ) : (
                  history.map((h, idx) => (
                    <tr key={h._id || idx} className="hover:bg-gray-50/70 dark:hover:bg-theme-surface-alt/30 transition-colors">
                      <td className="py-2 px-3 text-center text-theme-muted font-medium border-r border-theme-border/60">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-red-600 dark:text-red-400 border-r border-theme-border/60">
                        {h.findText}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-theme-border/60">
                        {h.replaceWith || '(blank)'}
                      </td>
                      <td className="py-2 px-3 text-center border-r border-theme-border/60">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          {h.updateFor}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-[11px] border-r border-theme-border/60">
                        {h.fromId || '1'} – {h.toId}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-theme-main border-r border-theme-border/60">
                        {h.affectedCasesCount}
                      </td>
                      <td className="py-2 px-3 text-theme-muted border-r border-theme-border/60">
                        {h.executedBy || 'Admin'}
                      </td>
                      <td className="py-2 px-3 font-mono text-theme-muted text-[11px]">
                        {formatDate(h.dated || h.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <AdminFooter />
    </div>
  );
};

export default ReplacementPage;
