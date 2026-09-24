import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, Plus, Search, Edit2, Trash2, RefreshCw, AlertCircle, Check, User, LogOut, Eye, EyeOff
} from 'lucide-react';
import { adminService } from '../services/adminSettingsServices';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import Modal from '../components/ui/Modal';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const ADMIN_TYPES = [
  'Select Type',
  'Super Admin',
  'Sub Admin',
  'Data Entry Admin',
  'Manager'
];

const STATUS_OPTIONS = [
  'Select Status',
  'Active',
  'Inactive'
];

const ManageAdminsPage = () => {
  const { logout } = useUser();
  const navigate = useNavigate();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  const [searchName, setSearchName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [modalForm, setModalForm] = useState({
    fullName: '',
    loginId: '',
    password: '',
    email: '',
    phoneNo: '',
    userType: 'Super Admin',
    status: 'Active'
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAdmins = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await adminService.getAdmins({
        search: params.search !== undefined ? params.search : searchName
      });
      if (res && res.data) {
        setAdmins(res.data);
        setTotalRecords(res.total ?? res.data.length);
      }
    } catch {
      showToast('error', 'Failed to load administrators.');
    } finally {
      setLoading(false);
    }
  }, [searchName]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchAdmins({ search: searchName });
  };

  const handleReset = () => {
    setSearchName('');
    fetchAdmins({ search: '' });
  };

  const handleOpenAdd = () => {
    setEditingAdmin(null);
    setShowPassword(false);
    setModalForm({
      fullName: '',
      loginId: '',
      password: '',
      email: '',
      phoneNo: '',
      userType: 'Super Admin',
      status: 'Active'
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a) => {
    setEditingAdmin(a);
    setShowPassword(false);
    setModalForm({
      fullName: a.fullName || a.name || '',
      loginId: a.loginId || a.username || '',
      password: '',
      email: a.email || '',
      phoneNo: a.contactNumber || a.phoneNo || '',
      userType: a.userType || 'Super Admin',
      status: (a.status || 'Active').toLowerCase() === 'active' ? 'Active' : 'Inactive'
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.fullName.trim()) {
      setModalError('Full Name is required.');
      return;
    }
    if (!modalForm.loginId.trim()) {
      setModalError('Login ID / Email is required.');
      return;
    }
    if (!editingAdmin && !modalForm.password.trim()) {
      setModalError('Login Password is required.');
      return;
    }
    if (!modalForm.phoneNo.trim()) {
      setModalError('Phone No. is required.');
      return;
    }
    if (modalForm.userType === 'Select Type') {
      setModalError('Please select a valid User Type.');
      return;
    }
    if (modalForm.status === 'Select Status') {
      setModalError('Please select a valid Status.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const payload = {
        fullName: modalForm.fullName.trim(),
        loginId: modalForm.loginId.trim(),
        username: modalForm.loginId.trim(),
        password: modalForm.password ? modalForm.password.trim() : undefined,
        email: modalForm.email.trim(),
        phoneNo: modalForm.phoneNo.trim(),
        contactNumber: modalForm.phoneNo.trim(),
        userType: modalForm.userType,
        status: modalForm.status
      };

      if (editingAdmin) {
        await adminService.updateAdmin(editingAdmin._id || editingAdmin.id, payload);
        showToast('success', `Administrator "${payload.fullName}" updated successfully.`);
      } else {
        await adminService.createAdmin(payload);
        showToast('success', `Administrator "${payload.fullName}" created successfully.`);
      }

      setIsModalOpen(false);
      fetchAdmins();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save administrator.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Are you sure you want to delete administrator "${a.fullName || a.username}"?`)) return;
    try {
      await adminService.deleteAdmin(a._id || a.id);
      showToast('success', `Administrator "${a.fullName || a.username}" deleted successfully.`);
      fetchAdmins();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete administrator.');
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

      {/* Top Banner Matching Screenshot 5 */}
      <div className="bg-[#B91C1C] text-white px-6 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-white/90" />
          <h1 className="text-base font-bold tracking-wide">Manage Admins</h1>
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
        {/* Search & Actions Bar matching Screenshot 5 */}
        <form onSubmit={handleSearch} className="bg-white dark:bg-theme-surface p-3.5 rounded-lg border border-theme-border shadow-sm flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            placeholder="User Name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="flex-1 min-w-[200px] max-w-md px-3 py-1.5 text-xs bg-white dark:bg-theme-bg border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-[#00A8CC] hover:bg-[#0092b3] text-white rounded text-xs font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search User</span>
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
            <span>+ Add User</span>
          </button>
        </form>

        <div className="px-2 flex justify-end items-center text-xs font-bold text-[#1E3A8A] dark:text-cyan-400">
          <span>Total Records: ({totalRecords})</span>
        </div>

        {/* Table View matching Screenshot 5 */}
        <div className="bg-white dark:bg-theme-surface rounded-lg border border-theme-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#E67E22] text-white text-xs font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-16 text-center border-r border-[#d35400]">Sr #</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">Login ID</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">Full Name</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">Email Address</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">Phone No.</th>
                  <th className="py-2.5 px-3 w-32 text-center border-r border-[#d35400]">User Type</th>
                  <th className="py-2.5 px-3 w-28 text-center border-r border-[#d35400]">Status</th>
                  <th className="py-2.5 px-3 w-24 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-theme-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-orange" />
                      <span>Loading Admins...</span>
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-10 text-center text-theme-muted">
                      No administrators found.
                    </td>
                  </tr>
                ) : (
                  admins.map((a, idx) => (
                    <tr key={a._id || idx} className="hover:bg-gray-50/70 dark:hover:bg-theme-surface-alt/30 transition-colors">
                      <td className="py-2.5 px-3 text-center text-theme-muted font-medium border-r border-theme-border/60">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-theme-main border-r border-theme-border/60">
                        {a.loginId || a.username}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-theme-main border-r border-theme-border/60">
                        {a.fullName || a.name}
                      </td>
                      <td className="py-2.5 px-3 text-theme-muted border-r border-theme-border/60">
                        {a.email}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-theme-muted border-r border-theme-border/60">
                        {a.contactNumber || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-theme-border/60">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                          {a.userType || 'Super Admin'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-theme-border/60">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          String(a.status).toUpperCase() === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {a.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(a)}
                            className="w-6 h-6 rounded bg-[#00A8CC] hover:bg-[#0092b3] text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(a)}
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

      {/* Add / Edit Admin Detail Modal matching Screenshot 5 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAdmin ? "Edit User Detail" : "Add User Detail"}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleModalSubmit} className="space-y-4 pt-1 text-xs">
          {modalError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Row 1: Full Name *, Login ID/ Email *, Login Password * */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-theme-main mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={modalForm.fullName}
                onChange={(e) => setModalForm({ ...modalForm, fullName: e.target.value })}
                placeholder="Full Name"
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-theme-main mb-1">
                Login ID/ Email <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={modalForm.loginId}
                onChange={(e) => setModalForm({ ...modalForm, loginId: e.target.value })}
                placeholder="e.g. admin or admin@sldsystem.com"
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-theme-main mb-1">
                Login Password {editingAdmin ? '(blank to keep)' : <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!editingAdmin}
                  value={modalForm.password}
                  onChange={(e) => setModalForm({ ...modalForm, password: e.target.value })}
                  placeholder={editingAdmin ? '••••••••' : 'Enter password'}
                  className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 text-theme-muted hover:text-theme-main"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Email Address, Phone No. *, User Type * */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-theme-main mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={modalForm.email}
                onChange={(e) => setModalForm({ ...modalForm, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-theme-main mb-1">
                Phone No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={modalForm.phoneNo}
                onChange={(e) => setModalForm({ ...modalForm, phoneNo: e.target.value })}
                placeholder="e.g. 03001234567"
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-theme-main mb-1">
                User Type <span className="text-red-500">*</span>
              </label>
              <select
                value={modalForm.userType}
                onChange={(e) => setModalForm({ ...modalForm, userType: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              >
                {ADMIN_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Status * */}
          <div className="max-w-xs">
            <label className="block text-xs font-bold text-theme-main mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={modalForm.status}
              onChange={(e) => setModalForm({ ...modalForm, status: e.target.value })}
              className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Footer Buttons matching Screenshot 5 */}
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
              {submitting ? 'Saving...' : editingAdmin ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      <AdminFooter />
    </div>
  );
};

export default ManageAdminsPage;
