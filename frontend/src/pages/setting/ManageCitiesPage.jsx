import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, Plus, Search, Edit2, Trash2, X, 
  Check, AlertCircle, RefreshCw, ChevronUp, ChevronDown, User, LogOut
} from 'lucide-react';
import { settingService } from '../../services/settingService';
import { PROVINCES } from '../../constants/provinces';
import AdminFooter from '../../features/dashboard/components/AdminFooter';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const DEFAULT_PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Azad Jammu and Kashmir',
  'Gilgit-Baltistan',
];

const ManageCitiesPage = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('All');

  // Sorting
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [modalForm, setModalForm] = useState({
    name: '',
    province: 'Punjab',
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Feedback Toast
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCities = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await settingService.getCities({
        search: params.search !== undefined ? params.search : searchName,
        province: params.province !== undefined ? params.province : selectedProvince,
      });
      if (res && res.data) {
        setCities(res.data);
        setTotalRecords(res.total ?? res.data.length);
      }
    } catch (err) {
      console.error('Failed to load cities:', err);
      showToast('error', 'Failed to load cities from server.');
    } finally {
      setLoading(false);
    }
  }, [searchName, selectedProvince]);

  useEffect(() => {
    fetchCities();
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchCities({ search: searchName, province: selectedProvince });
  };

  const handleResetAll = () => {
    setSearchName('');
    setSelectedProvince('All');
    fetchCities({ search: '', province: 'All' });
  };

  const handleOpenAddModal = () => {
    setEditingCity(null);
    setModalForm({
      name: '',
      province: 'Punjab',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (city) => {
    setEditingCity(city);
    setModalForm({
      name: city.name || '',
      province: city.province || 'Punjab',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.name.trim()) {
      setModalError('City Name is required.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      if (editingCity) {
        await settingService.updateCity(editingCity._id || editingCity.id, modalForm);
        showToast('success', `City "${modalForm.name}" updated successfully.`);
      } else {
        await settingService.createCity(modalForm);
        showToast('success', `City "${modalForm.name}" added successfully.`);
      }
      setIsModalOpen(false);
      fetchCities();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save city. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCity = async (city) => {
    if (!window.confirm(`Are you sure you want to delete city "${city.name}"?`)) return;

    try {
      await settingService.deleteCity(city._id || city.id);
      showToast('success', `City "${city.name}" deleted.`);
      fetchCities();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete city.');
    }
  };

  // Sort cities
  const sortedCities = [...cities].sort((a, b) => {
    let valA = (a[sortField] || '').toLowerCase();
    let valB = (b[sortField] || '').toLowerCase();
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
            <Folder className="w-5 h-5 fill-white/20 text-white" />
            <span>Manage Cities</span>
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
            placeholder="City Name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="px-3.5 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange w-60 shadow-inner"
          />

          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="px-3.5 py-1.5 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
          >
            <option value="All">Provinces</option>
            {DEFAULT_PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

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
            <span>Add City</span>
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
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>City Name</span>
                    {sortField === 'name' ? (
                      sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : <span className="text-white/60 text-[10px]">⇅</span>}
                  </div>
                </th>
                <th 
                  className="py-2.5 px-4 cursor-pointer hover:bg-[#d35400] transition-colors border-r border-[#d35400]"
                  onClick={() => toggleSort('province')}
                >
                  <div className="flex items-center gap-1">
                    <span>Province</span>
                    {sortField === 'province' ? (
                      sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : <span className="text-white/60 text-[10px]">⇅</span>}
                  </div>
                </th>
                <th className="py-2.5 px-4 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border text-xs">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-theme-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-orange" />
                    <span>Loading cities...</span>
                  </td>
                </tr>
              ) : sortedCities.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-theme-muted">
                    No cities matching your criteria found.
                  </td>
                </tr>
              ) : (
                sortedCities.map((city, idx) => (
                  <tr 
                    key={city._id || idx}
                    className="hover:bg-gray-50/70 dark:hover:bg-theme-surface-alt/30 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-center text-theme-muted font-medium border-r border-theme-border/60">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-theme-main border-r border-theme-border/60">
                      {city.name}
                    </td>
                    <td className="py-2.5 px-4 text-theme-muted border-r border-theme-border/60">
                      {city.province}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(city)}
                          className="w-6 h-6 rounded bg-[#00A8CC] hover:bg-[#0092b3] text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors"
                          title="Edit City"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCity(city)}
                          className="w-6 h-6 rounded bg-[#E53935] hover:bg-[#c62828] text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors"
                          title="Delete City"
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

      {/* Add / Edit City Modal (Screenshot 3 Matching) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCity ? "Edit City Detail" : "Add City Detail"}
        maxWidth="max-w-md"
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
              City Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={modalForm.name}
              onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
              placeholder="Enter city name..."
              className="w-full px-3.5 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-theme-main mb-1">
              Province <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={modalForm.province}
              onChange={(e) => setModalForm({ ...modalForm, province: e.target.value })}
              className="w-full px-3.5 py-2 bg-white dark:bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
            >
              {DEFAULT_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
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
              {submitting ? 'Saving...' : editingCity ? 'Save Changes' : 'Add Record'}
            </button>
          </div>
        </form>
      </Modal>

      <AdminFooter />
    </div>
  );
};

export default ManageCitiesPage;
