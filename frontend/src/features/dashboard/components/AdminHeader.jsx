import { Bell, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';

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
    title: 'Manage Cases Law',
    subtitle: 'Add new case law detail and publication records'
  },
  '/manage-notifications': {
    title: 'Manage Notifications / Circulars / Letters / General Orders',
    subtitle: 'View, search and manage notifications and orders'
  },
  '/manage-notifications/add': {
    title: 'Manage Notifications / Circulars / Letters / General Orders',
    subtitle: 'Add new notifications, circulars, letters, and general orders'
  },
  '/manage-statutes': {
    title: 'Manage Statutes Forms',
    subtitle: 'View, search and manage all statutes'
  },
  '/manage-statutes/add': {
    title: 'Manage Statutes Forms',
    subtitle: 'Add new statute forms'
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Manage your application and account preferences'
  }
};

const AdminHeader = () => {
  const location = useLocation();
  
  // Fallback to Dashboard if route is unknown
  const headerContent = PAGE_HEADERS[location.pathname] || {
    title: 'Overview',
    subtitle: 'SLD System Administration'
  };

  return (
    <header className="h-24 px-6 sm:px-8 flex items-center justify-between bg-white/50 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20 shrink-0">
      
      <div className="flex flex-col">
        <h1 className="text-2xl font-semibold text-gray-900">{headerContent.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{headerContent.subtitle}</p>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative w-11 h-11 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100 shrink-0">
          <Bell className="w-6 h-6 shrink-0" strokeWidth={1.5} />
          <span className="absolute top-1 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white box-content">
            3
          </span>
        </button>

        <div className="flex items-center gap-3 cursor-pointer pl-4 border-l border-gray-200 group">
          <div className="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-sm group-hover:ring-2 ring-brand-orange/20 transition-all">
            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Adam Admin" className="w-full h-full object-cover" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-semibold text-gray-900">Adam Admin</span>
            <span className="text-xs text-gray-500">Administrator</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
