import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Search, RefreshCw, User, LogOut, Eye, FileText, Bell, Scale, Calendar, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { activityService } from '../../../services/activityService';
import AdminFooter from '../../dashboard/components/AdminFooter';
import Modal from '../../../components/ui/Modal';
import { useUser } from '../../../contexts/UserContext';

const TABS = [
  { id: 'case', label: 'Law Cases Activity', path: '/activity/cases', icon: Scale, columnTitle: 'Case #' },
  { id: 'notification', label: 'Notification Activity', path: '/activity/notifications', icon: Bell, columnTitle: 'Notification #' },
  { id: 'statute', label: 'Statute Activity', path: '/activity/statutes', icon: FileText, columnTitle: 'Statute #' }
];

const UserActivityView = ({ activeType = 'case' }) => {
  const { user: currentUser, logout } = useUser();
  const navigate = useNavigate();

  const currentTab = TABS.find(t => t.id === activeType) || TABS[0];

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Inspection modal
  const [inspectModal, setInspectModal] = useState({ isOpen: false, data: null });

  const fetchActivities = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await activityService.getActivities({
        type: activeType,
        search: params.search !== undefined ? params.search : searchQuery,
      });
      if (res && res.data) {
        setActivities(res.data);
        setTotalRecords(res.pagination?.totalItems ?? res.data.length);
      }
    } catch (err) {
      console.error('Failed to load user activities:', err);
    } finally {
      setLoading(false);
    }
  }, [activeType, searchQuery]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchActivities({ search: searchQuery });
  };

  const handleReset = () => {
    setSearchQuery('');
    fetchActivities({ search: '' });
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
    } catch {
      return String(dateVal);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-theme-bg flex flex-col font-sans transition-colors">
      
      {/* Top Banner Matching Screenshot 4 */}
      <div className="bg-[#B91C1C] text-white px-6 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-white/90" />
          <h1 className="text-base font-bold tracking-wide">Users Activity</h1>
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

      <div className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-3.5">

        {/* 3 Activity Category Tabs */}
        <div className="flex items-center gap-2 border-b border-theme-border pb-2 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeType;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#E67E22] text-white shadow-sm'
                    : 'bg-white dark:bg-theme-surface text-theme-muted hover:text-theme-main hover:bg-gray-100 dark:hover:bg-theme-surface-alt'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar matching Screenshot 4 */}
        <form onSubmit={handleSearch} className="bg-white dark:bg-theme-surface p-3 rounded-lg border border-theme-border shadow-sm flex items-center gap-2">
          <input
            type="text"
            placeholder="User Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 max-w-md px-3 py-1.5 text-xs bg-white dark:bg-theme-bg border border-theme-border rounded text-theme-main focus:outline-none focus:border-brand-orange shadow-inner"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-[#00A8CC] hover:bg-[#0092b3] text-white rounded text-xs font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Search User</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-1.5 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded text-xs font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>All</span>
          </button>
        </form>

        {/* Total Records Right Banner matching Screenshot 4 */}
        <div className="px-2 flex justify-between items-center text-xs font-bold text-[#1E3A8A] dark:text-cyan-400">
          <span className="text-gray-500 font-normal">
            Real-time document access logs for <strong>{currentTab.label}</strong>
          </span>
          <span>Total Records: ({totalRecords.toLocaleString()})</span>
        </div>

        {/* Activity Table matching Screenshot 4 */}
        <div className="bg-white dark:bg-theme-surface rounded-lg border border-theme-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#E67E22] text-white text-xs font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-12 text-center border-r border-[#d35400]">Sr #</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400] w-36">Login ID/ Password</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400] w-28 text-center">{currentTab.columnTitle}</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400]">Full Name</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400] w-28">Agency</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400] w-40">Dated</th>
                  <th className="py-2.5 px-3 border-r border-[#d35400] w-36">Ip Address</th>
                  <th className="py-2.5 px-3 text-center w-12">
                    <span className="text-sm">≡</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-theme-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-orange" />
                      <span>Loading User Activities...</span>
                    </td>
                  </tr>
                ) : activities.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-10 text-center text-theme-muted">
                      No user activity records found.
                    </td>
                  </tr>
                ) : (
                  activities.map((item, idx) => (
                    <tr 
                      key={item._id || idx}
                      className="hover:bg-gray-50/70 dark:hover:bg-theme-surface-alt/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-theme-muted font-medium border-r border-theme-border/60">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-theme-main border-r border-theme-border/60">
                        {item.loginId || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-center text-[#1E3A8A] dark:text-cyan-400 border-r border-theme-border/60">
                        {item.documentNumber || item.documentId || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-theme-main border-r border-theme-border/60">
                        {item.fullName || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-theme-muted border-r border-theme-border/60">
                        {item.agency || 'Haroon'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-theme-muted text-[11px] border-r border-theme-border/60">
                        {formatDate(item.dated || item.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-theme-muted text-[11px] border-r border-theme-border/60">
                        {item.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setInspectModal({ isOpen: true, data: item })}
                          className="w-6 h-6 rounded bg-[#00A8CC] hover:bg-[#0092b3] text-white flex items-center justify-center shadow-sm cursor-pointer mx-auto transition-colors"
                          title="Inspect Activity Log"
                        >
                          <Search className="w-3 h-3" />
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

      {/* Activity Details Modal */}
      <Modal
        isOpen={inspectModal.isOpen}
        onClose={() => setInspectModal({ isOpen: false, data: null })}
        title="User Document Access Log Detail"
        maxWidth="max-w-lg"
      >
        {inspectModal.data && (
          <div className="space-y-3 pt-1 text-xs">
            <div className="p-3 bg-gray-50 dark:bg-theme-bg rounded-lg border border-theme-border space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-theme-border">
                <span className="font-bold text-theme-main">Login ID / User:</span>
                <span className="font-semibold text-brand-orange">{inspectModal.data.loginId}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-theme-border">
                <span className="font-bold text-theme-main">Full Name:</span>
                <span>{inspectModal.data.fullName || '—'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-theme-border">
                <span className="font-bold text-theme-main">Agency:</span>
                <span>{inspectModal.data.agency || '—'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-theme-border">
                <span className="font-bold text-theme-main">{currentTab.columnTitle}:</span>
                <span className="font-bold text-[#00A8CC]">{inspectModal.data.documentNumber || inspectModal.data.documentId}</span>
              </div>
              {inspectModal.data.documentTitle && (
                <div className="pb-2 border-b border-theme-border">
                  <span className="font-bold text-theme-main block mb-1">Document Subject / Title:</span>
                  <span className="text-theme-muted">{inspectModal.data.documentTitle}</span>
                </div>
              )}
              <div className="flex justify-between items-center pb-2 border-b border-theme-border">
                <span className="font-bold text-theme-main">IP Address:</span>
                <span className="font-mono">{inspectModal.data.ipAddress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-theme-main">Access Timestamp:</span>
                <span className="font-mono">{formatDate(inspectModal.data.dated || inspectModal.data.createdAt)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectModal({ isOpen: false, data: null })}
                className="px-4 py-1.5 rounded bg-gray-200 dark:bg-theme-surface hover:bg-gray-300 text-xs font-semibold text-theme-main cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <AdminFooter />
    </div>
  );
};

export default UserActivityView;
