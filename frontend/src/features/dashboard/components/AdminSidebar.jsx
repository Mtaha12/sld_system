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
  Search,
  Newspaper,
  MessageSquare,
  Globe,
  Download,
  Video,
  Bot,
  Building2,
  BookOpen,
  Library,
  Users,
  Activity,
  BellRing,
  FileSpreadsheet,
  ShieldCheck,
  ShieldBan,
  BookMarked,
  Gavel,
  Replace,
  CreditCard,
  BookA,
  Mail,
  Layers,
  Receipt,
  Folder,
  Briefcase,
  User
} from 'lucide-react';
import logo from '../../../assets/branding/logo/SLD_Logo.png';

// Standalone top navigation items
const TOP_NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Legal Core', path: '/ai-assistant', icon: Bot, isHighlight: true },
  { label: 'Search Case Law', path: '/search-case-law', icon: Search },
];

// Dropdown Folder Categories requested by user
const FOLDER_GROUPS = [
  {
    id: 'main-pages',
    label: 'Main Pages',
    icon: Folder,
    items: [
      { label: 'Manage Case Law', path: '/manage-cases', icon: Scale },
      { label: 'Manage Notification', path: '/manage-notifications', icon: Bell },
      { label: 'Manage Statute', path: '/manage-statutes', icon: FileText },
      { label: 'Manage Other Case Law', path: '/other-caselaws', icon: Scale },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      { label: 'Manage Users', path: '/manage-users', icon: Users },
      { label: 'Manage Admins', path: '/manage-admins', icon: ShieldCheck },
      { label: 'Batch Replacement', path: '/replacement', icon: Replace },
      { label: 'Case Activity', path: '/activity/cases', icon: Activity },
      { label: 'Notification Activity', path: '/activity/notifications', icon: BellRing },
      { label: 'Statute Activity', path: '/activity/statutes', icon: FileSpreadsheet },
      { label: 'Manage Magazines', path: '/setting/magazines', icon: BookMarked },
      { label: 'Manage Courts', path: '/setting/courts', icon: Gavel },
      { label: 'Manage IP Block List', path: '/setting/ip-blocks', icon: ShieldBan },
      { label: 'WhatsApp Updates', path: '/whatsapp-updates', icon: MessageSquare },
      { label: 'Manage Updates', path: '/manage-updates', icon: Globe },
      { label: 'YouTube Updates', path: '/youtube-updates', icon: Video },
      { label: 'Manage Cities', path: '/setting/cities', icon: Building2 },
      { label: 'Manage Principle of Law', path: '/setting/principles', icon: BookOpen },
      { label: 'Manage Laws / Statute', path: '/setting/laws', icon: Library },
    ]
  },
  {
    id: 'other-services',
    label: 'Other Services',
    icon: Briefcase,
    items: [
      { label: 'Manage News', path: '/news', icon: Newspaper },
      { label: 'Manage Downloads', path: '/manage-downloads', icon: Download },
      { label: 'Manage Tax Cards', path: '/manage-tax-cards', icon: CreditCard },
      { label: 'Manage Dictionary', path: '/manage-dictionary', icon: BookA },
      { label: 'Manage Newsletters', path: '/manage-newsletters', icon: Mail },
      { label: 'Manage Custom Tariffs', path: '/manage-custom-tariffs', icon: Layers },
      { label: 'Manage Invoices', path: '/manage-invoices', icon: Receipt },
    ]
  }
];

const AdminSidebar = ({ className = '', isMobile = false, onItemClick, onClose }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  // State to track which folder dropdowns are expanded
  const [openFolders, setOpenFolders] = useState({
    'main-pages': true,
    'settings': false,
    'other-services': false
  });

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
    <aside className={`bg-brand-dark-surface text-gray-300 flex-col h-full border-r border-brand-dark-border transition-[width] duration-300 ease-in-out ${
      isMobile 
        ? 'w-[260px] flex shadow-2xl z-50' 
        : 'w-[80px] hover:w-[260px] group overflow-hidden'
    } ${className}`}>
      
      {/* Logo Container */}
      <div className={`h-24 flex items-center border-b border-brand-dark-border shrink-0 pt-2 w-full transition-all duration-300 ${
        isMobile ? 'justify-between px-4' : 'justify-center'
      }`}>
        <img 
          src={logo} 
          alt="SLD System" 
          className={`${
            isMobile ? 'h-[44px]' : 'h-[36px] group-hover:h-[64px]'
          } object-contain transition-all duration-300 ease-in-out shrink-0`} 
        />
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

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1.5 scrollbar-hide w-[260px]">
        
        {/* Top-Level Items (Dashboard, AI Assistant, Search) */}
        {TOP_NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              onClick={onItemClick}
              className={`flex items-center px-3 py-2.5 rounded-xl transition-all relative ${
                isActive
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'hover:bg-brand-dark-border hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-white' : item.isHighlight ? 'text-brand-orange' : 'text-gray-400'}`} />
              <span className={`text-xs font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isMobile 
                  ? 'max-w-[180px] opacity-100 ml-3.5' 
                  : 'max-w-0 opacity-0 group-hover:max-w-[180px] group-hover:opacity-100 ml-0 group-hover:ml-3.5'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}

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
                
                <span className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap overflow-hidden transition-all duration-300 ${
                  isMobile 
                    ? 'max-w-[160px] opacity-100 ml-3.5 text-left' 
                    : 'max-w-0 opacity-0 group-hover:max-w-[160px] group-hover:opacity-100 ml-0 group-hover:ml-3.5 text-left'
                }`}>
                  {folder.label}
                </span>

                <span className={`ml-auto shrink-0 transition-all duration-300 ${
                  isMobile
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}>
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
                    const isSubActive = location.pathname === subItem.path || location.pathname.startsWith(subItem.path + '/');
                    return (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        title={subItem.label}
                        onClick={onItemClick}
                        className={`flex items-center px-2.5 py-2 rounded-lg transition-all ${
                          isSubActive
                            ? 'bg-brand-orange text-white font-semibold shadow-sm'
                            : 'text-gray-400 hover:text-white hover:bg-brand-dark-border/50'
                        }`}
                      >
                        <subItem.icon className={`w-4 h-4 shrink-0 transition-colors ${isSubActive ? 'text-white' : 'text-gray-400'}`} />
                        <span className={`text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ${
                          isMobile 
                            ? 'max-w-[180px] opacity-100 ml-2.5' 
                            : 'max-w-0 opacity-0 group-hover:max-w-[180px] group-hover:opacity-100 ml-0 group-hover:ml-2.5'
                        }`}>
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
          <span className={`text-xs font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${
            isMobile 
              ? 'max-w-[180px] opacity-100 ml-3.5' 
              : 'max-w-0 opacity-0 group-hover:max-w-[180px] group-hover:opacity-100 ml-0 group-hover:ml-3.5'
          }`}>
            {isDarkMode ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        {/* User Profile (formerly Settings) */}
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
          <span className={`text-xs font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${
            isMobile 
              ? 'max-w-[180px] opacity-100 ml-3.5' 
              : 'max-w-0 opacity-0 group-hover:max-w-[180px] group-hover:opacity-100 ml-0 group-hover:ml-3.5'
          }`}>
            User Profile
          </span>
          <ChevronRight className={`w-4 h-4 shrink-0 transition-all duration-300 ${
            isMobile
              ? 'max-w-[20px] opacity-100 ml-auto'
              : 'max-w-0 opacity-0 group-hover:max-w-[20px] group-hover:opacity-100 ml-auto'
          } ${location.pathname === '/settings' || location.pathname.startsWith('/settings/') ? 'text-white' : 'text-gray-500'}`} />
        </Link>
      </div>

    </aside>
  );
};

export default AdminSidebar;
