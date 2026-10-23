import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AdminSidebar from '../features/dashboard/components/AdminSidebar';
import AdminHeader from '../features/dashboard/components/AdminHeader';
import PageTransition from '../components/ui/PageTransition';

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Side Panel Pin (Fixed) State - defaults to true so sidebar shows by default
  const [isSidebarPinned, setIsSidebarPinned] = useState(() => {
    const saved = localStorage.getItem('sld_sidebar_pinned');
    if (saved !== null) return saved === 'true';
    return true; // Default expanded/visible
  });

  // Whenever navigating to dashboard, ensure sidebar is visible by default
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      setIsSidebarPinned(true);
    }
  }, [location.pathname]);

  const handleTogglePin = () => {
    setIsSidebarPinned(prev => {
      const next = !prev;
      localStorage.setItem('sld_sidebar_pinned', String(next));
      return next;
    });
  };

  const isDesktopSidebarVisible = isSidebarPinned;

  return (
    <div className="flex h-[100dvh] bg-theme-base font-sans text-theme-main animate-fade-in overflow-hidden relative">
      
      {/* Fixed Desktop Sidebar: Toggled ONLY via the 'View Sidebar' / Pin button */}
      <div
        className={`hidden lg:block fixed left-0 top-0 h-screen z-40 transition-transform duration-[300ms] ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform ${
          isDesktopSidebarVisible ? 'translate-x-0 shadow-2xl' : '-translate-x-full pointer-events-none'
        }`}
      >
        <AdminSidebar 
          isPinned={isSidebarPinned}
          onTogglePin={handleTogglePin}
        />
      </div>

      {/* 3. Mobile / Tablet Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer Container */}
          <div className="relative z-50 animate-fade-in flex h-full">
            <AdminSidebar 
              isMobile={true}
              onClose={() => setIsMobileMenuOpen(false)}
              onItemClick={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 4. Main Content Column (smoothly shifts when sidebar is pinned vs hidden) */}
      <div 
        className={`flex-1 flex flex-col min-w-0 h-full relative transition-[margin-left] duration-[300ms] ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[margin-left] ${
          isSidebarPinned ? 'lg:ml-[260px]' : 'lg:ml-0'
        }`}
      >
        {/* Shared Global Header */}
        <AdminHeader 
          onToggleMenu={() => setIsMobileMenuOpen(prev => !prev)} 
          onOpenChat={() => navigate('/ai-assistant')}
          isSidebarPinned={isSidebarPinned}
          onToggleSidebar={handleTogglePin}
        />
        
        {/* Scrollable Page Content */}
        <main className="flex-1 p-6 sm:p-8 w-full overflow-y-auto overflow-x-hidden relative z-0">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>

    </div>
  );
};

export default AdminLayout;
