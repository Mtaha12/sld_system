import { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Sparkles, PanelLeftClose, PanelLeftOpen, KeyRound, Check, X, ShieldCheck, Calculator } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ACTIVITIES } from './RecentActivity';
import { useUser } from '../../../contexts/UserContext';
import api from '../../../services/api';
import appStoreLogo from '../../../assets/branding/dashboard/app store.png';
import playStoreLogo from '../../../assets/branding/dashboard/playstore.png';
import aiSearchLogo from '/ai-q-search-logo.png';
import aiBannerImg from '../../../assets/branding/dashboard/ai-banner.jpg';
import LegalReferenceModal from './LegalReferenceModal';

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
    title: 'Manage Notifications',
    subtitle: ''
  },
  '/manage-notifications/add': {
    title: 'Manage Notifications',
    subtitle: ''
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
  },
  '/statute-search': {
    title: 'Statute Search',
    subtitle: 'Search case laws and judgments by Law and Section, with alphabetical index.'
  },
  '/notification-search': {
    title: 'Notification Search',
    subtitle: 'Search case laws, circulars, SROs and notifications across departments.'
  },
  '/manage-tax-cards': {
    title: 'Manage Tax Cards',
    subtitle: 'View, search and manage official tax cards and annual schedules'
  },
  '/manage-dictionary': {
    title: 'Manage Dictionary',
    subtitle: 'Manage legal glossary terms, definitions and word meanings'
  },
  '/manage-newsletters': {
    title: 'Manage Emails',
    subtitle: 'Create, broadcast and archive email newsletters and circular updates'
  },
  '/manage-emails': {
    title: 'Manage Emails',
    subtitle: 'Create, broadcast and archive email newsletters and circular updates'
  },
  '/setting/legal-maxims': {
    title: 'Manage Legal Maxim',
    subtitle: 'Manage legal maxims, Latin legal principles and interpretations'
  },
  '/setting/articles': {
    title: 'Manage Articles',
    subtitle: 'Manage published legal articles, author records and annual listings'
  },
  '/setting/topics': {
    title: 'Manage Topics',
    subtitle: 'Manage topic headings and thematic legal categories'
  },
  '/setting/words-phrases': {
    title: 'Manage Words & Phrases',
    subtitle: 'Manage legal words, phrases and judicial interpretations'
  },
  '/setting/legal-terms': {
    title: 'Manage Legal Terms',
    subtitle: 'Manage defined legal and statutory terminology'
  },
  '/manage-custom-tariffs': {
    title: 'Manage Custom Tariffs',
    subtitle: 'Maintain custom duty rates, PCT codes and annual tariff schedules'
  },
  '/manage-invoices': {
    title: 'Manage Invoices',
    subtitle: 'Create, compute and manage client legal billing and invoices'
  },
  '/other-caselaws': {
    title: 'Other Case Laws',
    subtitle: 'View, search, edit and manage Supreme Court citations and law judgments'
  }
};

import AIChatDrawer from './AIChatDrawer';

const AdminHeader = ({ onToggleMenu, onOpenChat, isSidebarPinned = false, onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Change Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Legal Reference Library Modal State (Articles, Topics, Words & Phrases, Legal Terms, Maxims)
  const [isRefModalOpen, setIsRefModalOpen] = useState(false);
  const [selectedRefTab, setSelectedRefTab] = useState('articles');
  
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
  
  // Global keyboard shortcut: Ctrl+K or Cmd+K opens AI Legal Assistant Studio
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate('/ai-assistant');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const { user, logoutUser } = useUser();

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.newPassword || passwordForm.newPassword.trim().length < 4) {
      setPasswordError('Password must be at least 4 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      await api.put('/api/auth/change-password', {
        newPassword: passwordForm.newPassword.trim()
      });
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err) {
      setPasswordError(err?.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Header content logic - enforce strictly "Manage Notifications" on manage notifications pages
  const getHeaderContent = () => {
    if (location.pathname.startsWith('/manage-notifications')) {
      return {
        title: 'Manage Notifications',
        subtitle: ''
      };
    }
    return PAGE_HEADERS[location.pathname] || {
      title: 'Overview',
      subtitle: 'SLD System Administration'
    };
  };

  const headerContent = getHeaderContent();

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

        {/* Desktop Sidebar Toggle Option (Click to View / Hide) */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-theme-border bg-theme-surface hover:bg-theme-surface-hover text-theme-main transition-all cursor-pointer shadow-xs mr-1"
            title={isSidebarPinned ? "Click to Hide sidebar (auto-reveal on hover)" : "Click to View and Fix sidebar open"}
          >
            {isSidebarPinned ? (
              <>
                <PanelLeftClose className="w-4 h-4 text-brand-orange" />
                <span>Hide Sidebar</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-4 h-4 text-brand-orange" />
                <span>View Sidebar</span>
              </>
            )}
          </button>
        )}

        <div className="flex flex-col min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-theme-main truncate">{headerContent.title}</h1>
          {headerContent.subtitle ? (
            <p className="text-xs sm:text-sm text-theme-muted mt-0.5 truncate">{headerContent.subtitle}</p>
          ) : null}
        </div>
      </div>

      {/* Right Header Actions: Tax Calculator, AI Banner Button, App Store & Play Store Badges, Change Password, Notifications, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
        {/* Tax Calculator Button - Opens Pakistan Tax Calculator in New Tab */}
        <a
          href="https://pakistan-tax-calculator-mmca.ai.studio/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-emerald-500/20 active:scale-95 shrink-0 border border-emerald-400/30 cursor-pointer"
          title="Open Pakistan Tax Calculator in New Tab"
        >
          <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-100 shrink-0" />
          <span className="whitespace-nowrap">Tax Calculator</span>
        </a>

        {/* AI Banner Button (Click to open AI Chatbot) - Compact & Sleek */}
        <button 
          type="button"
          onClick={() => navigate('/ai-assistant')}
          className="h-8 sm:h-9 md:h-10 rounded-lg overflow-hidden border border-blue-400/50 hover:border-cyan-400 shadow-xs hover:shadow-md hover:shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer shrink-0 bg-black flex items-center justify-center group"
          title="Artificial Intelligence - Click to Explore AI Legal Chambers & Chat"
        >
          <img 
            src={aiBannerImg} 
            alt="Artificial Intelligence - Click to Explore" 
            className="h-full w-auto object-contain group-hover:brightness-110 transition-all" 
          />
        </button>

        {/* SLD Mobile Apps Badges: Apple App Store & Google Play Store */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href="https://apps.apple.com/pk/app/sld-system/id6741755009"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors shadow-2xs h-8 sm:h-9 shrink-0 border border-white/10"
            title="Download SLD App on Apple App Store"
          >
            <img src={appStoreLogo} alt="App Store" className="h-4 w-4 object-contain shrink-0" />
            <span className="text-[10px] font-bold whitespace-nowrap hidden md:inline">App Store</span>
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.sldsystem"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors shadow-2xs h-8 sm:h-9 shrink-0 border border-white/10"
            title="Get SLD App on Google Play Store"
          >
            <img src={playStoreLogo} alt="Google Play" className="h-4 w-4 object-contain shrink-0" />
            <span className="text-[10px] font-bold whitespace-nowrap hidden md:inline">Google Play</span>
          </a>
        </div>

        {/* CHANGE PASSWORD OPTION ON TOP RIGHT */}
        <button
          type="button"
          onClick={() => {
            setIsPasswordModalOpen(true);
            setPasswordError('');
            setPasswordSuccess('');
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
          title="Change your account password"
        >
          <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">Change Password</span>
        </button>
        
        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileOpen(false);
            }}
            className={`relative w-10 h-10 flex items-center justify-center transition-colors rounded-full shrink-0 ${isNotificationsOpen ? 'text-theme-main bg-theme-surface-hover' : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover'}`}
          >
            <Bell className="w-5 h-5 shrink-0" strokeWidth={1.8} />
            <span className="absolute top-1 right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white box-content">
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

        {/* Profile Dropdown */}
        <div className="relative pl-2 sm:pl-3 border-l border-theme-border" ref={profileRef}>
          <div 
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 rounded-full bg-white dark:bg-theme-surface-alt border border-theme-border/80 flex items-center justify-center shrink-0 overflow-hidden shadow-xs group-hover:ring-2 ring-brand-orange/30 transition-all p-0.5">
              <img 
                src={user.avatarUrl && !user.avatarUrl.includes('pravatar') ? user.avatarUrl : '/sld-logo.jpeg'} 
                alt={user.fullName} 
                className="w-full h-full object-contain rounded-full" 
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-semibold text-theme-main leading-tight">{user.fullName}</span>
              <span className="text-xs text-theme-muted">{user.role || 'User'}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-all ${isProfileOpen ? 'text-theme-main rotate-180' : 'text-theme-disabled group-hover:text-theme-muted'}`} />
          </div>

          {isProfileOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setIsProfileOpen(false)} 
              />
              <div className="absolute top-full right-0 mt-2 w-52 bg-theme-surface rounded-xl shadow-xl border border-theme-border overflow-hidden z-50 p-1.5 animate-fade-in space-y-1">
                <button 
                  onClick={() => {
                    setIsProfileOpen(false);
                    setIsPasswordModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-theme-surface-hover rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-500" /> Change Password
                </button>
                <div className="border-t border-theme-border my-1" />
                <button 
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Change Password Modal ────────────────────────────────────────── */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#151821] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-stone-800 relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-stone-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Change Password</h3>
                  <p className="text-xs text-gray-500">Update your account login password</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter new password (min. 4 characters)"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                  required
                  minLength={4}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-stone-700 bg-gray-50 dark:bg-stone-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  required
                  minLength={4}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-stone-700 bg-gray-50 dark:bg-stone-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  {passwordLoading ? 'Saving…' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Legal Reference Directory Viewer Modal */}
      <LegalReferenceModal
        isOpen={isRefModalOpen}
        onClose={() => setIsRefModalOpen(false)}
        initialTab={selectedRefTab}
      />
    </header>
  );
};

export default AdminHeader;
