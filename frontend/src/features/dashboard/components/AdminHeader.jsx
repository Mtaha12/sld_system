import { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Sparkles } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ACTIVITIES } from './RecentActivity';
import { useUser } from '../../../contexts/UserContext';

const PAGE_HEADERS = {
  '/dashboard': {
    title: 'Dashboard',
    subtitle: "Overview of your legal system's activity"
  },
  '/manage-cases': {
    title: 'Manage Cases Law',
    subtitle: 'View, search and manage all legal cases'
  },
  '/manage-cases/add': {
    title: 'Add Case Law Detail',
    subtitle: 'Add new case law detail and publication records'
  },
  '/manage-notifications': {
    title: 'Manage Notifications / Circulars / Letters / General Orders',
    subtitle: 'View, search and manage notifications and orders'
  },
  '/manage-notifications/add': {
    title: 'Add Notifications / Circulars / Letters / General Orders Detail',
    subtitle: 'Add new notifications, circulars, letters, and general orders'
  },
  '/manage-statutes': {
    title: 'Manage Statutes Forms',
    subtitle: 'View, search and manage all statutes'
  },
  '/manage-statutes/add': {
    title: 'Add Statute Form Detail',
    subtitle: 'Add new statute forms and categories'
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Manage your application preferences and settings'
  },
  '/news': {
    title: 'News Updates',
    subtitle: 'Stay updated with the latest legal and tax news'
  },
  '/whatsapp-updates': {
    title: 'Whatsapp Updates',
    subtitle: 'View and manage all official Whatsapp communications'
  },
  '/search-case-law': {
    title: 'Case Law Search',
    subtitle: 'Search case laws, judgments and legal references across multiple sources.'
  }
};

import AIChatDrawer from './AIChatDrawer';

const AdminHeader = ({ onToggleMenu, onOpenChat }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const { user, logoutUser } = useUser();

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  // Fallback to Dashboard if route is unknown
  const headerContent = PAGE_HEADERS[location.pathname] || {
    title: 'Overview',
    subtitle: 'SLD System Administration'
  };

  return (
    <header className="h-20 sm:h-24 px-6 sm:px-8 flex items-center justify-between bg-theme-base border-b border-theme-border relative z-50 shrink-0">
      
      <div className="flex items-center gap-3 min-w-0 pr-4">
        {onToggleMenu && (
          <button
            onClick={onToggleMenu}
            className="p-2 -ml-2 rounded-xl text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover lg:hidden shrink-0 transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <div className="flex flex-col min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-theme-main truncate">{headerContent.title}</h1>
          <p className="text-xs sm:text-sm text-theme-muted mt-0.5 truncate">{headerContent.subtitle}</p>
        </div>
      </div>

      {/* AI Search Button - Centered */}
      <div className="hidden md:flex flex-1 max-w-2xl px-8 items-center justify-center">
        <button 
          onClick={() => onOpenChat?.()}
          className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-[#1A1C23] border border-gray-200 dark:border-theme-border rounded-xl text-sm text-gray-500 hover:border-[#f15a24] hover:ring-1 hover:ring-[#f15a24] hover:text-gray-800 dark:hover:text-gray-200 transition-all group focus:outline-none shadow-sm cursor-text"
        >
          <Sparkles className="w-4 h-4 text-[#f15a24]" />
          <span>Search with the help of AI...</span>
          <div className="ml-auto flex items-center gap-1">
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-400 bg-white dark:bg-[#14151A] border border-gray-200 dark:border-[#262833] rounded">
              <span className="text-xs">⌘</span> K
            </kbd>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileOpen(false);
            }}
            className={`relative w-11 h-11 flex items-center justify-center transition-colors rounded-full shrink-0 ${isNotificationsOpen ? 'text-theme-main bg-theme-surface-hover' : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover'}`}
          >
            <Bell className="w-6 h-6 shrink-0" strokeWidth={1.5} />
            <span className="absolute top-1 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white box-content">
              3
            </span>
          </button>

          {isNotificationsOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setIsNotificationsOpen(false)} 
              />
              <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-theme-surface rounded-xl shadow-2xl border border-theme-border overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt">
                  <h3 className="font-semibold text-theme-main">Notifications</h3>
                  <span className="text-xs font-medium text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">3 New</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto divide-y divide-theme-border bg-theme-surface">
                  {ACTIVITIES.slice(0, 4).map((activity) => (
                    <div key={activity.id} className="px-4 py-3 hover:bg-theme-surface-hover transition-colors flex gap-3 cursor-pointer bg-theme-surface">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activity.bgColor} ${activity.iconColor}`}>
                        <activity.icon className="w-4 h-4" strokeWidth={2} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-theme-main">{activity.action}</span>
                          <span className="text-[10px] text-theme-disabled shrink-0 whitespace-nowrap">{activity.time}</span>
                        </div>
                        <p className="text-xs text-theme-muted truncate">{activity.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-theme-border bg-theme-surface-alt text-center">
                  <Link to="/dashboard" onClick={() => setIsNotificationsOpen(false)} className="text-sm font-medium text-brand-orange hover:underline">
                    View all activity
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative pl-4 border-l border-theme-border" ref={profileRef}>
          <div 
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-sm group-hover:ring-2 ring-brand-orange/20 transition-all">
              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-semibold text-theme-main">{user.fullName}</span>
              <span className="text-xs text-theme-muted">{user.role || 'Administrator'}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-all ${isProfileOpen ? 'text-theme-main rotate-180' : 'text-theme-disabled group-hover:text-theme-muted'}`} />
          </div>

          {isProfileOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setIsProfileOpen(false)} 
              />
              <div className="absolute top-full right-0 mt-2 w-full min-w-[160px] bg-theme-surface rounded-xl shadow-xl border border-theme-border overflow-hidden z-50 p-1 animate-fade-in">
                <button 
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <AIChatDrawer isOpen={false} onClose={() => {}} />
    </header>
  );
};

export default AdminHeader;
