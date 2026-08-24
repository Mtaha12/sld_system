import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Scale,
  Bell,
  FileText,
  Settings,
  ChevronRight
} from 'lucide-react';
import logo from '../../../assets/branding/logo/Logo_Dark_No_Bg.png';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Manage Cases Law', path: '/manage-cases', icon: Scale },
  { label: 'Manage Notifications', path: '/manage-notifications', icon: Bell },
  { label: 'Manage Statuses Forms', path: '/manage-statuses-forms', icon: FileText },
];

const AdminSidebar = ({ className = '' }) => {
  const location = useLocation();

  return (
    <aside className={`bg-[#14151A] text-gray-300 flex-col h-full border-r border-[#262833] transition-[width] duration-300 ease-in-out group w-[80px] hover:w-[260px] overflow-hidden ${className}`}>
      
      {/* Logo Container */}
      <div className="h-24 flex items-center justify-center border-b border-[#262833] shrink-0 pt-2 w-full transition-all duration-300">
        <img 
          src={logo} 
          alt="SLD System" 
          className="h-[36px] group-hover:h-[64px] object-contain transition-all duration-300 ease-in-out shrink-0" 
        />
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
              className={`flex items-center px-3 py-3 rounded-xl transition-colors relative ${
                isActive
                  ? 'bg-brand-orange text-white'
                  : 'hover:bg-[#262833] hover:text-white'
              }`}
            >
              <item.icon className={`w-6 h-6 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 max-w-0 opacity-0 group-hover:max-w-[180px] group-hover:opacity-100 ml-0 group-hover:ml-4">
                {item.label}
              </span>
              {item.hasChildren && (
                <ChevronRight className={`w-4 h-4 shrink-0 transition-all duration-300 max-w-0 opacity-0 group-hover:max-w-[20px] group-hover:opacity-100 ml-auto ${isActive ? 'text-white' : 'text-gray-500'}`} />
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="px-4 pb-6 mt-auto shrink-0 w-[260px]">
        <Link
          to="/settings"
          title="Settings"
          className={`flex items-center px-3 py-3 rounded-xl transition-colors relative ${
            location.pathname === '/settings' || location.pathname.startsWith('/settings/')
              ? 'bg-brand-orange text-white'
              : 'hover:bg-[#262833] hover:text-white'
          }`}
        >
          <Settings className={`w-6 h-6 shrink-0 transition-colors ${location.pathname === '/settings' || location.pathname.startsWith('/settings/') ? 'text-white' : 'text-gray-400'}`} />
          <span className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 max-w-0 opacity-0 group-hover:max-w-[180px] group-hover:opacity-100 ml-0 group-hover:ml-4">
            Settings
          </span>
          <ChevronRight className={`w-4 h-4 shrink-0 transition-all duration-300 max-w-0 opacity-0 group-hover:max-w-[20px] group-hover:opacity-100 ml-auto ${location.pathname === '/settings' || location.pathname.startsWith('/settings/') ? 'text-white' : 'text-gray-500'}`} />
        </Link>
      </div>
    </aside>
  );
};

export default AdminSidebar;
