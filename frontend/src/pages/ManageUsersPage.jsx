import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Plus, Search, Edit2, Trash2, X, AlertCircle, RefreshCw, 
  ShieldAlert, ShieldCheck, Check, User, LogOut, Lock, Eye, EyeOff
} from 'lucide-react';
import { userService } from '../services/userService';
import { settingService } from '../services/settingService';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import Modal from '../components/ui/Modal';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const ManageUsersPage = () => {
  const { user: currentUser, logout } = useUser();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [cities, setCities] = useState([]);

  // Search & Filter
  const [searchName, setSearchName] = useState('');
  const [filterSpammer, setFilterSpammer] = useState('all'); // 'all', 'yes', 'no'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State matching screenshot Image 3
  const [modalForm, setModalForm] = useState({
    loginId: '',
    password: '',
    name: '',
    companyName: '',
    contactNo: '',
    email: '',
    address: '',
    city: '',
    activeDate: new Date().toISOString().split('T')[0],
    inactiveDate: '',
    agencyName: 'Haroon',
    status: 'Active',
    userType: 'Special',
    aiAssistant: 'Yes',
    alreadyLogin: 'No',
    isSpammer: 'No',
    ipRestriction: 'No',
    displayStatute: 'Yes',
    displayNotification: 'Yes',
  });

  // Feedback Toast
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCities = async () => {
    try {
      const res = await settingService.getCities({ status: 'active', limit: 500 });
      if (res && res.data) {
        setCities(res.data);
      }
    } catch (err) {
      console.error('Failed to load cities:', err);
    }
  };

  const fetchUsers = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = {
        search: params.search !== undefined ? params.search : searchName,
        isSpammer: params.isSpammer !== undefined ? params.isSpammer : (filterSpammer === 'all' ? undefined : filterSpammer)
      };
      const res = await userService.getUsers(queryParams);
      if (res && res.data) {
        setUsers(res.data);
        setTotalRecords(res.pagination?.totalItems ?? res.data.length);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      showToast('error', 'Failed to load users from server.');
    } finally {
      setLoading(false);
    }
  }, [searchName, filterSpammer]);

  useEffect(() => {
    fetchUsers();
    fetchCities();
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchUsers({ search: searchName });
  };

  const handleResetAll = () => {
    setSearchName('');
    setFilterSpammer('all');
    fetchUsers({ search: '', isSpammer: undefined });
  };

  const handleToggleSpammerFilter = () => {
    const next = filterSpammer === 'all' ? 'yes' : filterSpammer === 'yes' ? 'no' : 'all';
    setFilterSpammer(next);
    fetchUsers({ isSpammer: next === 'all' ? undefined : next });
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setShowPassword(false);
    setModalForm({
      loginId: '',
      password: '',
      name: '',
      companyName: '',
      contactNo: '',
      email: '',
      address: '',
      city: cities[0]?.name || '',
      activeDate: new Date().toISOString().split('T')[0],
      inactiveDate: '',
      agencyName: 'Haroon',
      status: 'Active',
      userType: 'Special',
      aiAssistant: 'Yes',
      alreadyLogin: 'No',
      isSpammer: 'No',
      ipRestriction: 'No',
      displayStatute: 'Yes',
      displayNotification: 'Yes',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u) => {
    setEditingUser(u);
    setShowPassword(false);
    setModalForm({
      loginId: u.loginId || u.username || '',
      password: '', // Blank unless modifying
      name: u.fullName || u.name || '',
      companyName: u.companyName || '',
      contactNo: u.contactNumber || u.contactNo || '',
      email: u.email || '',
      address: u.address || '',
      city: u.city || '',
      activeDate: u.activeDate ? String(u.activeDate).split('T')[0] : '',
      inactiveDate: u.inactiveDate ? String(u.inactiveDate).split('T')[0] : '',
      agencyName: u.agencyName || 'Haroon',
      status: (u.status || 'Active').toLowerCase() === 'active' ? 'Active' : 'Inactive',
      userType: u.userType || 'Special',
      aiAssistant: u.aiAssistant === false ? 'No' : 'Yes',
      alreadyLogin: u.alreadyLogin ? 'Yes' : 'No',
      isSpammer: u.isSpammer ? 'Yes' : 'No',
      ipRestriction: u.ipRestriction ? 'Yes' : 'No',
      displayStatute: u.displayStatute === false ? 'No' : 'Yes',
      displayNotification: u.displayNotification === false ? 'No' : 'Yes',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.loginId.trim()) {
      setModalError('Login ID / Email is required.');
      return;
    }
    if (!editingUser && !modalForm.password.trim()) {
      setModalError('Login Password is required.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const payload = {
        loginId: modalForm.loginId.trim(),
        username: modalForm.loginId.trim(),
        password: modalForm.password ? modalForm.password.trim() : undefined,
        name: modalForm.name.trim(),
        fullName: modalForm.name.trim(),
        companyName: modalForm.companyName.trim(),
        contactNo: modalForm.contactNo.trim(),
        contactNumber: modalForm.contactNo.trim(),
        email: modalForm.email.trim(),
        address: modalForm.address.trim(),
        city: modalForm.city.trim(),
        activeDate: modalForm.activeDate || undefined,
        inactiveDate: modalForm.inactiveDate || null,
        agencyName: modalForm.agencyName.trim(),
        status: modalForm.status,
        userType: modalForm.userType,
        aiAssistant: modalForm.aiAssistant === 'Yes',
        alreadyLogin: modalForm.alreadyLogin === 'Yes',
        isSpammer: modalForm.isSpammer === 'Yes',
        ipRestriction: modalForm.ipRestriction === 'Yes',
        displayStatute: modalForm.displayStatute === 'Yes',
        displayNotification: modalForm.displayNotification === 'Yes',
      };

      if (editingUser) {
        await userService.updateUser(editingUser._id || editingUser.id, payload);
        showToast('success', `User "${payload.loginId}" updated successfully.`);
      } else {
        await userService.createUser(payload);
        showToast('success', `User "${payload.loginId}" created successfully.`);
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSpammer = async (u) => {
    try {
      const res = await userService.toggleSpammer(u._id || u.id);
      showToast(
        res.data?.isSpammer ? 'warning' : 'success',
        res.data?.isSpammer 
          ? `User "${u.username}" marked as Spammer! They will now only be served dummy/incorrect data.`
          : `User "${u.username}" unmarked as Spammer. Normal access restored.`
      );
      fetchUsers();
    } catch {
      showToast('error', 'Failed to update spammer status.');
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Are you sure you want to delete user "${u.fullName || u.username}"?`)) {
      return;
    }
    try {
      await userService.deleteUser(u._id || u.id);
      showToast('success', `User "${u.fullName || u.username}" deleted successfully.`);
      fetchUsers();
    } catch {
      showToast('error', 'Failed to delete user.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-theme-bg flex flex-col font-sans transition-colors">
      
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-xs font-semibold animate-fade-in ${
          toast.type === 'error' ? 'bg-red-600' : toast.type === 'warning' ? 'bg-amber-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner Matching Screenshot 3 */}
      <div className="bg-[#B91C1C] text-white px-6 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-white/90" />
          <h1 className="text-base font-bold tracking-wide">Manage Users</h1>
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
            onClick={handleResetAll}
            className="px-4 py-1.5 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded text-xs font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>All</span>
          </button>
          <button
            type="button"
            onClick={handleToggleSpammerFilter}
            className={`px-3 py-1.5 rounded text-xs font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer ${
              filterSpammer === 'yes'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
            title="Filter by Spammers"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{filterSpammer === 'yes' ? 'Spammers (Active Filter)' : filterSpammer === 'no' ? 'Non-Spammers' : 'Spammer Filter'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-1.5 bg-[#2E7D32] hover:bg-[#256628] text-white rounded text-xs font-bold shadow-sm transition-colors ml-auto flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add User</span>
          </button>
        </form>

        {/* Total Records Right Banner */}
        <div className="px-2 flex justify-between items-center text-xs font-bold text-[#1E3A8A] dark:text-cyan-400">
          <span className="text-gray-500 font-normal">
            Users marked as <strong className="text-red-600">Spammer</strong> are shadow-banned and automatically served dummy/incorrect legal data.
          </span>
          <span>Total Records: ({totalRecords})</span>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-theme-surface rounded-lg border border-theme-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#E67E22] text-white text-xs font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-12 text-center border-r border-[#d35400]">Sr #</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">Login ID</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">Full Name</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">Agency</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">City</th>
                  <th className="py-2.5 px-3 text-center border-r border-[#d35400]">Type</th>
                  <th className="py-2.5 px-3 text-center border-r border-[#d35400]">Status</th>
                  <th className="py-2.5 px-3 text-center border-r border-[#d35400]">Permissions</th>
                  <th className="py-2.5 px-3 text-center border-r border-[#d35400]">Spammer?</th>
                  <th className="py-2.5 px-3 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-theme-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-orange" />
                      <span>Loading Users...</span>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-10 text-center text-theme-muted">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u, idx) => (
                    <tr 
                      key={u._id || idx}
                      className={`hover:bg-gray-50/70 dark:hover:bg-theme-surface-alt/30 transition-colors ${
                        u.isSpammer ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-theme-muted font-medium border-r border-theme-border/60">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-theme-main border-r border-theme-border/60">
                        {u.loginId || u.username}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-theme-main border-r border-theme-border/60">
                        {u.fullName || u.name || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-theme-muted border-r border-theme-border/60">
                        {u.agencyName || 'Haroon'}
                      </td>
                      <td className="py-2.5 px-3 text-theme-muted border-r border-theme-border/60">
                        {u.city || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-theme-border/60">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          {u.userType || 'Special'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-theme-border/60">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          String(u.status).toUpperCase() === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {u.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-theme-border/60">
                        <div className="flex items-center justify-center gap-1 text-[10px]">
                          <span 
                            title={`Statutes: ${u.displayStatute !== false ? 'Allowed' : 'Blocked'}`}
                            className={`px-1.5 py-0.5 rounded font-semibold ${u.displayStatute !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 line-through'}`}
                          >
                            Stat
                          </span>
                          <span 
                            title={`Notifications: ${u.displayNotification !== false ? 'Allowed' : 'Blocked'}`}
                            className={`px-1.5 py-0.5 rounded font-semibold ${u.displayNotification !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 line-through'}`}
                          >
                            Notif
                          </span>
                          <span 
                            title={`AI Assistant: ${u.aiAssistant !== false ? 'Allowed' : 'Blocked'}`}
                            className={`px-1.5 py-0.5 rounded font-semibold ${u.aiAssistant !== false ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}
                          >
                            AI
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-theme-border/60">
                        <button
                          type="button"
                          onClick={() => handleToggleSpammer(u)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                            u.isSpammer 
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-gray-100 dark:bg-theme-bg text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                          title={u.isSpammer ? "Spammer Active: User is shown dummy data" : "Click to mark as Spammer"}
                        >
                          {u.isSpammer ? '⚠️ Spammer (Dummy)' : 'No'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="w-6 h-6 rounded bg-[#00A8CC] hover:bg-[#0092b3] text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            className="w-6 h-6 rounded bg-[#E53935] hover:bg-[#c62828] text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors"
                            title="Delete User"
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

      {/* Add / Edit User Detail Modal (Matching Screenshot 3) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? "Edit User Detail" : "Add User Detail"}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleModalSubmit} className="space-y-3.5 pt-1 text-xs">
          {modalError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Row 1: Login ID/ Email *, Login Password *, Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">
                Login ID/ Email <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={modalForm.loginId}
                onChange={(e) => setModalForm({ ...modalForm, loginId: e.target.value })}
                placeholder="Enter login ID or email"
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">
                Login Password {editingUser ? '(leave blank to keep)' : <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!editingUser}
                  value={modalForm.password}
                  onChange={(e) => setModalForm({ ...modalForm, password: e.target.value })}
                  placeholder={editingUser ? '••••••••' : 'Enter password'}
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
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">
                Name
              </label>
              <input
                type="text"
                value={modalForm.name}
                onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                placeholder="Full Name"
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              />
            </div>
          </div>

          {/* Row 2: Company Name, Contact No., Email Address */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">Company Name</label>
              <input
                type="text"
                value={modalForm.companyName}
                onChange={(e) => setModalForm({ ...modalForm, companyName: e.target.value })}
                placeholder="Company Name"
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">Contact No.</label>
              <input
                type="text"
                value={modalForm.contactNo}
                onChange={(e) => setModalForm({ ...modalForm, contactNo: e.target.value })}
                placeholder="e.g. 03001234567"
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">Email Address</label>
              <input
                type="email"
                value={modalForm.email}
                onChange={(e) => setModalForm({ ...modalForm, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              />
            </div>
          </div>

          {/* Row 3: Address */}
          <div>
            <label className="block text-[11px] font-bold text-theme-main mb-1">Address</label>
            <input
              type="text"
              value={modalForm.address}
              onChange={(e) => setModalForm({ ...modalForm, address: e.target.value })}
              placeholder="Full postal address"
              className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
            />
          </div>

          {/* Row 4: City, Active Date, Inactive Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">City</label>
              <select
                value={modalForm.city}
                onChange={(e) => setModalForm({ ...modalForm, city: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              >
                <option value="">Select City</option>
                {cities.map((c) => (
                  <option key={c._id || c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">Active Date</label>
              <input
                type="date"
                value={modalForm.activeDate}
                onChange={(e) => setModalForm({ ...modalForm, activeDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">Inactive Date</label>
              <input
                type="date"
                value={modalForm.inactiveDate}
                onChange={(e) => setModalForm({ ...modalForm, inactiveDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              />
            </div>
          </div>

          {/* Row 5: Agency Name, Status *, User Type *, AI Assistant? * */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">Agency Name</label>
              <input
                type="text"
                value={modalForm.agencyName}
                onChange={(e) => setModalForm({ ...modalForm, agencyName: e.target.value })}
                placeholder="e.g. Haroon"
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={modalForm.status}
                onChange={(e) => setModalForm({ ...modalForm, status: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">
                User Type <span className="text-red-500">*</span>
              </label>
              <select
                value={modalForm.userType}
                onChange={(e) => setModalForm({ ...modalForm, userType: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              >
                <option value="Special">Special</option>
                <option value="Regular">Regular</option>
                <option value="Corporate">Corporate</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">
                AI Assistant? <span className="text-red-500">*</span>
              </label>
              <select
                value={modalForm.aiAssistant}
                onChange={(e) => setModalForm({ ...modalForm, aiAssistant: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>

          {/* Row 6: Already Login *, Is Spammer? *, IP Restriction * */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">
                Already Login <span className="text-red-500">*</span>
              </label>
              <select
                value={modalForm.alreadyLogin}
                onChange={(e) => setModalForm({ ...modalForm, alreadyLogin: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-red-600 dark:text-red-400 mb-1">
                Is Spammer? <span className="text-red-500">*</span>
              </label>
              <select
                value={modalForm.isSpammer}
                onChange={(e) => setModalForm({ ...modalForm, isSpammer: e.target.value })}
                className="w-full px-3 py-1.5 bg-red-50/50 dark:bg-red-950/20 border border-red-300 dark:border-red-900 rounded text-red-700 dark:text-red-300 font-semibold focus:outline-none shadow-inner"
              >
                <option value="No">No (Genuine Access)</option>
                <option value="Yes">Yes (Serve Fake/Dummy Data)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">
                IP Restriction <span className="text-red-500">*</span>
              </label>
              <select
                value={modalForm.ipRestriction}
                onChange={(e) => setModalForm({ ...modalForm, ipRestriction: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>

          {/* Row 7: Display Statute *, Display Notification * */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-theme-border/60">
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">
                Display Statute <span className="text-red-500">*</span>
              </label>
              <select
                value={modalForm.displayStatute}
                onChange={(e) => setModalForm({ ...modalForm, displayStatute: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              >
                <option value="Yes">Yes (Allowed to view statutes)</option>
                <option value="No">No (Access Blocked)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-theme-main mb-1">
                Display Notification <span className="text-red-500">*</span>
              </label>
              <select
                value={modalForm.displayNotification}
                onChange={(e) => setModalForm({ ...modalForm, displayNotification: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
              >
                <option value="Yes">Yes (Allowed to view notifications)</option>
                <option value="No">No (Access Blocked)</option>
              </select>
            </div>
          </div>

          {/* Modal Footer matching screenshot 3 */}
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
              {submitting ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      <AdminFooter />
    </div>
  );
};

export default ManageUsersPage;
