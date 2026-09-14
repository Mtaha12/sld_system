import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  LayoutDashboard,
  Scale,
  Bell,
  FileText,
  Settings,
  ChevronRight,
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
  Sparkles,
  Building2,
  BookOpen,
  Library
} from 'lucide-react';
import logo from '../../../assets/branding/logo/SLD_Logo.jpeg';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Legal Core', path: '/ai-assistant', icon: Bot, isHighlight: true },
  { label: 'Search Case Law', path: '/search-case-law', icon: Search },
  { label: 'Manage Cases Law', path: '/manage-cases', icon: Scale },
  { label: 'Manage Notifications', path: '/manage-notifications', icon: Bell },
  { label: 'Manage Statutes Forms', path: '/manage-statutes', icon: FileText },
  { label: 'Manage News', path: '/news', icon: Newspaper },
  { label: 'Whatsapp Updates', path: '/whatsapp-updates', icon: MessageSquare },
  { label: 'Manage Updates', path: '/manage-updates', icon: Globe },
  { label: 'Manage Downloads', path: '/manage-downloads', icon: Download },
  { label: 'Youtube Updates', path: '/youtube-updates', icon: Video },
  { label: 'Manage Cities', path: '/setting/cities', icon: Building2 },
  { label: 'Manage Principle of Laws', path: '/setting/principles', icon: BookOpen },
  { label: 'Manage Laws / Statutes', path: '/setting/laws', icon: Library },
];

const AdminSidebar = ({ className = '', isMobile = false, onItemClick, onClose }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

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
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-brand-dark-border transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-4 space-y-2 scrollbar-hide w-[260px]">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              onClick={onItemClick}
              className={`flex items-center px-3 py-3 rounded-xl transition-colors relative ${
                isActive
                  ? 'bg-brand-orange text-white'
                  : 'hover:bg-brand-dark-border hover:text-white'
              }`}
            >
              <item.icon className={`w-6 h-6 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isMobile 
                  ? 'max-w-[180px] opacity-100 ml-4' 
                  : 'max-w-0 opacity-0 group-hover:max-w-[180px] group-hover:opacity-100 ml-0 group-hover:ml-4'
              }`}>
                {item.label}
              </span>
              {item.hasChildren && (
                <ChevronRight className={`w-4 h-4 shrink-0 transition-all duration-300 ${
                  isMobile
                    ? 'max-w-[20px] opacity-100 ml-auto'
                    : 'max-w-0 opacity-0 group-hover:max-w-[20px] group-hover:opacity-100 ml-auto'
                } ${isActive ? 'text-white' : 'text-gray-500'}`} />
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="px-4 pb-6 mt-auto shrink-0 w-[260px] flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          title="Toggle Theme"
          className="flex items-center px-3 py-3 rounded-xl transition-colors relative hover:bg-brand-dark-border hover:text-white text-left w-full"
        >
          {isDarkMode ? (
            <Moon className="w-6 h-6 shrink-0 transition-colors text-gray-400" />
          ) : (
            <Sun className="w-6 h-6 shrink-0 transition-colors text-gray-400" />
          )}
          <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
            isMobile 
              ? 'max-w-[180px] opacity-100 ml-4' 
              : 'max-w-0 opacity-0 group-hover:max-w-[180px] group-hover:opacity-100 ml-0 group-hover:ml-4'
          }`}>
            {isDarkMode ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        <Link
          to="/settings"
          title="Settings"
          onClick={onItemClick}
          className={`flex items-center px-3 py-3 rounded-xl transition-colors relative ${
            location.pathname === '/settings' || location.pathname.startsWith('/settings/')
              ? 'bg-brand-orange text-white'
              : 'hover:bg-brand-dark-border hover:text-white'
          }`}
        >
          <Settings className={`w-6 h-6 shrink-0 transition-colors ${location.pathname === '/settings' || location.pathname.startsWith('/settings/') ? 'text-white' : 'text-gray-400'}`} />
          <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
            isMobile 
              ? 'max-w-[180px] opacity-100 ml-4' 
              : 'max-w-0 opacity-0 group-hover:max-w-[180px] group-hover:opacity-100 ml-0 group-hover:ml-4'
          }`}>
            Settings
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
