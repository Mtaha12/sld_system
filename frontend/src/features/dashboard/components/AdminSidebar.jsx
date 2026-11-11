import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  LayoutDashboard,
  Scale,
  Bell,
  FileText,
  Settings,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  X,
  Pin,
  PinOff,
  Network,
  ExternalLink,
  User
} from 'lucide-react';
import logo from '../../../assets/branding/logo/SLD_Logo.webp';
import { useUser } from '../../../contexts/UserContext';
import { TOP_NAV_ITEMS, USER_MENU_ITEMS, QUICK_LINKS, FOLDER_GROUPS } from '../constants/navigationConfig';

// Intelligent Route Preloaders: dynamically preload page chunks on mouse enter / focus
const PRELOAD_MAP = {
  '/dashboard': () => import('../../../pages/DashboardPage'),
  '/search-case-law': () => import('../../../pages/SearchCaseLawPage'),
  '/ai-assistant': () => import('../../../pages/AIAssistantPage'),
  '/statute-search': () => import('../../../pages/StatuteSearchPage'),
  '/notification-search': () => import('../../../pages/NotificationSearchPage'),
  '/manage-cases': () => import('../../../pages/ManageCasesPage'),
  '/manage-cases/add': () => import('../../../pages/AddCaseLawPage'),
  '/manage-notifications': () => import('../../../pages/ManageNotificationsPage'),
  '/manage-notifications/add': () => import('../../../pages/AddNotificationPage'),
  '/manage-statutes': () => import('../../../pages/ManageStatutesPage'),
  '/manage-statutes/add': () => import('../../../pages/AddStatutePage'),
  '/updates': () => import('../../../pages/UpdatesPage'),
  '/manage-dictionary': () => import('../../../pages/ManageDictionaryPage'),
  '/news': () => import('../../../pages/NewsPage'),
  '/manage-tax-cards': () => import('../../../pages/ManageTaxCardsPage'),
  '/manage-custom-tariffs': () => import('../../../pages/ManageCustomTariffsPage'),
  '/whatsapp-updates': () => import('../../../pages/WhatsappUpdatesPage'),
  '/youtube-updates': () => import('../../../pages/YoutubeUpdatesPage'),
  '/downloads': () => import('../../../pages/DownloadsPage'),
  '/manage-invoices': () => import('../../../pages/ManageInvoicesPage'),
  '/manage-newsletters': () => import('../../../pages/ManageNewslettersPage'),
  '/manage-emails': () => import('../../../pages/ManageNewslettersPage'),
  '/emails': () => import('../../../pages/ClientEmailsPage'),
  '/newsletters': () => import('../../../pages/ClientEmailsPage'),
  '/other-caselaws': () => import('../../../pages/OtherCaseLawsPage'),
  '/settings': () => import('../../../pages/SettingsPage'),
  '/manage-users': () => import('../../../pages/ManageUsersPage'),
  '/manage-admins': () => import('../../../pages/ManageAdminsPage'),
};

const preloadRoute = (path) => {
  if (!path) return;
  const cleanPath = path.split('?')[0];
  const loader = PRELOAD_MAP[cleanPath];
  if (loader) {
    try {
      loader();
    } catch (_) {}
  }
};

const AdminSidebar = ({ 
  className = '', 
  isMobile = false, 
  isPinned = false, 
  onTogglePin, 
  onItemClick, 
  onClose 
}) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const isDarkMode = theme === 'dark';

  const isAdmin = user?.role === 'Administrator' || Boolean(user?.allowAllForms);

  // Filter top navigation items based on user permissions
  const visibleTopNavItems = React.useMemo(() => {
    return TOP_NAV_ITEMS.filter((item) => {
      if (item.path === '/dashboard') return true;
      if (item.path === '/ai-assistant') return user?.aiAssistant !== false;
      if (item.path === '/search-case-law') return user?.displayCase !== false;
      if (item.path === '/statute-search') return user?.displayStatute !== false;
      if (item.path === '/notification-search') return user?.displayNotification !== false;
      return true;
    });
  }, [user, isAdmin]);

  // State to track which folder dropdowns are expanded
  const [openFolders, setOpenFolders] = useState({
    'main-pages': true,
    'settings': false,
    'other-services': false
  });
  const [isQuickLinksOpen, setIsQuickLinksOpen] = useState(true);

  // Automatically expand the folder containing the currently active page
  useEffect(() => {
    const curPath = location.pathname;
    FOLDER_GROUPS.forEach(folder => {
      const containsActive = folder.items.some(
        it => curPath === it.path || curPath.startsWith(it.path + '/')
      );
      if (containsActive) {
        setOpenFolders(prev => ({ ...prev, [folder.id]: true }));
      }
    });
  }, [location.pathname]);

  const toggleFolder = (folderId) => {
    setOpenFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  return (
    <aside className={`bg-brand-dark-surface text-gray-300 flex flex-col h-full border-r border-brand-dark-border w-[260px] select-none ${className}`}>
      
      {/* Logo & Header Controls */}
      <div className="h-20 px-4 flex items-center justify-between border-b border-brand-dark-border shrink-0 w-full">
        <Link to="/dashboard" onClick={onItemClick} className="flex items-center gap-2">
          <img 
            src={logo} 
            alt="SLD System" 
            className="h-[44px] object-contain transition-all duration-300 ease-in-out shrink-0" 
          />
        </Link>

        <div className="flex items-center gap-1.5">
          {/* Click to View / Hide (Pin) button on Desktop */}
          {!isMobile && onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isPinned 
                  ? 'bg-brand-orange text-white border-brand-orange shadow-xs' 
                  : 'bg-brand-dark-border/40 text-gray-400 border-brand-dark-border hover:text-white hover:bg-brand-dark-border'
              }`}
              title={isPinned ? "Side panel is Fixed (Click to Auto-hide on hover)" : "Click to Fix / Keep side panel open"}
            >
              {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
            </button>
          )}

          {isMobile && onClose && (
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-brand-dark-border transition-colors cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1.5 scrollbar-hide w-[260px]">
        
        {/* Top-Level Items (Dashboard, AI Assistant, Search) */}
        {visibleTopNavItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              onClick={onItemClick}
              onMouseEnter={() => preloadRoute(item.path)}
              onFocus={() => preloadRoute(item.path)}
              className={`flex items-center px-3 py-2.5 rounded-xl transition-all relative ${
                isActive
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'hover:bg-brand-dark-border hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-white' : item.isHighlight ? 'text-brand-orange' : 'text-gray-400'}`} />
              <span className="text-xs font-semibold whitespace-nowrap overflow-hidden ml-3.5 max-w-[200px] opacity-100 inline-flex items-center">
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-1.5 font-serif italic text-gray-200 dark:text-gray-200 text-xs font-normal tracking-wide">
                    {item.badge}
                  </span>
                )}
              </span>
            </Link>
          );
        })}

        {/* Backend Management Folders: Strictly restricted to Administrators and users with allowAllForms */}
        {isAdmin && (
          <>
            {/* Separator */}
            <div className="pt-1 border-t border-brand-dark-border/60 my-1" />

            {/* Dropdown Folder Groups */}
            {FOLDER_GROUPS.map((folder) => {
              const isOpen = Boolean(openFolders[folder.id]);
              const containsActive = folder.items.some(
                it => location.pathname === it.path || location.pathname.startsWith(it.path + '/')
              );

              return (
                <div key={folder.id} className="flex flex-col">
                  
                  {/* Folder Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleFolder(folder.id)}
                    title={folder.label}
                    className={`flex items-center w-full px-3 py-2.5 rounded-xl transition-all select-none cursor-pointer ${
                      containsActive
                        ? 'bg-brand-dark-border/70 text-white font-semibold'
                        : 'text-gray-300 hover:bg-brand-dark-border hover:text-white'
                    }`}
                  >
                    <folder.icon className={`w-5 h-5 shrink-0 transition-colors ${containsActive ? 'text-brand-orange' : 'text-gray-400'}`} />
                    
                    <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap overflow-hidden ml-3.5 text-left max-w-[160px] opacity-100">
                      {folder.label}
                    </span>

                    <span className="ml-auto shrink-0 opacity-100">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </span>
                  </button>

                  {/* Collapsible Children Items */}
                  {isOpen && (
                    <div className="flex flex-col space-y-1 mt-1 pl-2 border-l border-brand-dark-border/70 ml-5 animate-fade-in">
                      {folder.items.map((subItem) => {
                        const [subPath, subQuery] = subItem.path.split('?');
                        const isSubActive = subQuery
                          ? (location.pathname === subPath && location.search === `?${subQuery}`)
                          : (location.pathname === subPath && !new URLSearchParams(location.search).get('category')) ||
                            location.pathname.startsWith(subPath + '/');
                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            title={subItem.label}
                            onClick={onItemClick}
                            onMouseEnter={() => preloadRoute(subItem.path)}
                            onFocus={() => preloadRoute(subItem.path)}
                            className={`flex items-center px-2.5 py-2 rounded-lg transition-all ${
                              isSubActive
                                ? 'bg-brand-orange text-white font-semibold shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-brand-dark-border/50'
                            }`}
                          >
                            <subItem.icon className={`w-4 h-4 shrink-0 transition-colors ${isSubActive ? 'text-white' : 'text-gray-400'}`} />
                            <span className="text-xs whitespace-nowrap overflow-hidden ml-2.5 max-w-[180px] opacity-100">
                              {subItem.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </>
        )}

        {/* Regular User Portal Menu (matching user screenshot with dial/gauge icons & quick links) */}
        {!isAdmin && (
          <>
            {/* Separator */}
            <div className="pt-1 border-t border-brand-dark-border/60 my-1" />

            {/* User Navigation Links */}
            {USER_MENU_ITEMS.map((item) => {
              const currentFull = `${location.pathname}${location.search}`;
              const isActive = item.path.includes('?')
                ? currentFull === item.path
                : (location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  title={item.label}
                  onClick={onItemClick}
                  onMouseEnter={() => preloadRoute(item.path)}
                  onFocus={() => preloadRoute(item.path)}
                  className={`flex items-center px-3 py-2 rounded-xl transition-all relative ${
                    isActive
                      ? 'bg-brand-orange text-white shadow-sm font-semibold'
                      : 'text-gray-300 hover:bg-brand-dark-border hover:text-white'
                  }`}
                >
                  <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-400/90'}`} />
                  <span className="text-xs font-medium whitespace-nowrap overflow-hidden ml-3 max-w-[180px]">
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* Quick Links Dropdown Accordion matching Screenshot */}
            <div className="flex flex-col pt-1">
              <button
                type="button"
                onClick={() => setIsQuickLinksOpen(prev => !prev)}
                title="Quick Links"
                className="flex items-center w-full px-3 py-2 rounded-xl text-gray-300 hover:bg-brand-dark-border hover:text-white transition-all select-none cursor-pointer"
              >
                <Network className="w-4 h-4 shrink-0 text-blue-400/90" />
                <span className="text-xs font-semibold whitespace-nowrap overflow-hidden ml-3 text-left max-w-[160px]">
                  Quick Links
                </span>
                <span className="ml-auto shrink-0">
                  {isQuickLinksOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </span>
              </button>

              {isQuickLinksOpen && (
                <div className="flex flex-col space-y-0.5 mt-1 pl-3 border-l border-brand-dark-border/70 ml-5 animate-fade-in">
                  {QUICK_LINKS.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-2 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-brand-dark-border/50 transition-colors gap-2"
                    >
                      <span className="text-gray-500 font-mono text-sm leading-none">-</span>
                      <span className="truncate">{link.label}</span>
                      <ExternalLink className="w-3 h-3 text-gray-500 ml-auto shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* Bottom Actions */}
      <div className="px-3 pb-5 mt-auto shrink-0 w-[260px] flex flex-col gap-1.5 border-t border-brand-dark-border/60 pt-3">
        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle Theme"
          className="flex items-center px-3 py-2.5 rounded-xl transition-colors relative hover:bg-brand-dark-border hover:text-white text-left w-full cursor-pointer"
        >
          {isDarkMode ? (
            <Moon className="w-5 h-5 shrink-0 transition-colors text-gray-400" />
          ) : (
            <Sun className="w-5 h-5 shrink-0 transition-colors text-gray-400" />
          )}
          <span className="text-xs font-semibold whitespace-nowrap overflow-hidden ml-3.5 max-w-[180px] opacity-100">
            {isDarkMode ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        {/* User Profile */}
        <Link
          to="/settings"
          title="User Profile"
          onClick={onItemClick}
          className={`flex items-center px-3 py-2.5 rounded-xl transition-colors relative ${
            location.pathname === '/settings' || location.pathname.startsWith('/settings/')
              ? 'bg-brand-orange text-white shadow-sm'
              : 'hover:bg-brand-dark-border hover:text-white'
          }`}
        >
          <User className={`w-5 h-5 shrink-0 transition-colors ${location.pathname === '/settings' || location.pathname.startsWith('/settings/') ? 'text-white' : 'text-gray-400'}`} />
          <span className="text-xs font-semibold whitespace-nowrap overflow-hidden ml-3.5 max-w-[180px] opacity-100">
            User Profile
          </span>
          <ChevronRight className={`w-4 h-4 shrink-0 transition-all duration-300 ml-auto max-w-[20px] opacity-100 ${
            location.pathname === '/settings' || location.pathname.startsWith('/settings/') ? 'text-white' : 'text-gray-500'
          }`} />
        </Link>
      </div>

    </aside>
  );
};

export default AdminSidebar;
