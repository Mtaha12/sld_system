import React, { useState, useEffect, useCallback } from 'react';
import { ShieldBan, Plus, Search, Trash2, RefreshCw, AlertCircle, Check, User, LogOut } from 'lucide-react';
import { ipBlockService } from '../../services/adminSettingsServices';
import { settingService } from '../../services/settingService';
import AdminFooter from '../../features/dashboard/components/AdminFooter';
import Modal from '../../components/ui/Modal';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const ManageIpBlockPage = () => {
  const { logout } = useUser();
  const navigate = useNavigate();

  const [blocks, setBlocks] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({ ipAddress: '', userName: '', cityName: '' });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCities = async () => {
    try {
      const res = await settingService.getCities({ status: 'active', limit: 500 });
      if (res && res.data) setCities(res.data);
    } catch {
      // Non-blocking
    }
  };

  const fetchBlocks = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await ipBlockService.getIpBlocks({
        search: params.search !== undefined ? params.search : searchQuery
      });
      if (res && res.data) {
        setBlocks(res.data);
        setTotalRecords(res.total ?? res.data.length);
      }
    } catch {
      showToast('error', 'Failed to load IP Block List.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchBlocks();
    fetchCities();
  }, [fetchBlocks]);

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchBlocks({ search: searchQuery });
  };

  const handleReset = () => {
    setSearchQuery('');
    fetchBlocks({ search: '' });
  };

  const handleOpenAdd = () => {
    setModalForm({
      ipAddress: '',
      userName: '',
      cityName: cities[0]?.name || 'Bannu'
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.ipAddress.trim()) {
      setModalError('IP Address is required.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      await ipBlockService.createIpBlock({
        ipAddress: modalForm.ipAddress.trim(),
        userName: modalForm.userName.trim(),
        cityName: modalForm.cityName.trim()
      });
      showToast('success', `IP ${modalForm.ipAddress} added to Block List.`);
      setIsModalOpen(false);
      fetchBlocks();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to add IP address to block list.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (b) => {
    if (!window.confirm(`Are you sure you want to unblock IP "${b.ipAddress}"?`)) return;
    try {
      await ipBlockService.deleteIpBlock(b._id || b.id);
      showToast('success', `IP ${b.ipAddress} unblocked successfully.`);
      fetchBlocks();
    } catch {
      showToast('error', 'Failed to unblock IP.');
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
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
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

      {/* Top Banner Matching Screenshot 3 */}
      <div className="bg-[#B91C1C] text-white px-6 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <ShieldBan className="w-5 h-5 text-white/90" />
          <h1 className="text-base font-bold tracking-wide">Manage Ip Block List</h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-white/80" onClick={() => navigate('/settings')}>
            <User className="w-4 h-4" />
            <span>My Account</span>
          </div>
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-white/80" onClick={logout}>
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-4">
        {/* Search & Actions Bar matching Screenshot 3 */}
        <form onSubmit={handleSearch} className="bg-white dark:bg-theme-surface p-3.5 rounded-lg border border-theme-border shadow-sm flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            placeholder="IP Address / User / City"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            <span>Add IP Address</span>
          </button>
        </form>

        <div className="px-2 flex justify-end items-center text-xs font-bold text-[#1E3A8A] dark:text-cyan-400">
          <span>Total Records: ({totalRecords})</span>
        </div>

        {/* Table View matching Screenshot 3 */}
        <div className="bg-white dark:bg-theme-surface rounded-lg border border-theme-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#E67E22] text-white text-xs font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-16 text-center border-r border-[#d35400]">Sr #</th>
                  <th className="py-2.5 px-3 w-44 border-r border-[#d35400]">Date/Time</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">Ip Address</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">User Name</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">City Name</th>
                  <th className="py-2.5 px-3 w-24 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-theme-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-orange" />
                      <span>Loading Blocked IPs...</span>
                    </td>
                  </tr>
                ) : blocks.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-theme-muted">
                      No blocked IP addresses.
                    </td>
                  </tr>
                ) : (
                  blocks.map((b, idx) => (
                    <tr key={b._id || idx} className="hover:bg-gray-50/70 dark:hover:bg-theme-surface-alt/30 transition-colors">
                      <td className="py-2.5 px-3 text-center text-theme-muted font-medium border-r border-theme-border/60">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-theme-muted text-[11px] border-r border-theme-border/60">
                        {formatDate(b.dated || b.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-red-600 dark:text-red-400 border-r border-theme-border/60">
                        {b.ipAddress}
                      </td>
                      <td className="py-2.5 px-3 text-theme-main font-medium border-r border-theme-border/60">
                        {b.userName || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-theme-muted border-r border-theme-border/60">
                        {b.cityName || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(b)}
                          className="w-6 h-6 rounded bg-[#E53935] hover:bg-[#c62828] text-white flex items-center justify-center shadow-sm cursor-pointer mx-auto transition-colors"
                          title="Unblock IP"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add IP Address for Block List Modal matching Screenshot 3 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Ip Address for Block List"
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
              Ip Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={modalForm.ipAddress}
              onChange={(e) => setModalForm({ ...modalForm, ipAddress: e.target.value })}
              placeholder="e.g. 182.184.254.151"
              className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-theme-main mb-1">
              User Name
            </label>
            <input
              type="text"
              value={modalForm.userName}
              onChange={(e) => setModalForm({ ...modalForm, userName: e.target.value })}
              placeholder="Optional user name"
              className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-theme-main mb-1">
              City Name
            </label>
            <select
              value={modalForm.cityName}
              onChange={(e) => setModalForm({ ...modalForm, cityName: e.target.value })}
              className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
            >
              <option value="">Select City</option>
              {cities.map((c) => (
                <option key={c._id || c.name} value={c.name}>{c.name}</option>
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
              {submitting ? 'Saving...' : 'Add Record'}
            </button>
          </div>
        </form>
      </Modal>

      <AdminFooter />
    </div>
  );
};

export default ManageIpBlockPage;
