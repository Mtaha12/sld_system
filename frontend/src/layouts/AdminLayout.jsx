import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from '../features/dashboard/components/AdminSidebar';
import AdminHeader from '../features/dashboard/components/AdminHeader';
import PageTransition from '../components/ui/PageTransition';

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Side Panel Pin (Fixed) State - defaults to false (auto-hide / hover mode)
  const [isSidebarPinned, setIsSidebarPinned] = useState(() => {
    const saved = localStorage.getItem('sld_sidebar_pinned');
    return saved === 'true';
  });

  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);

  // Prevent background scrolling while mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleTogglePin = () => {
    setIsSidebarPinned(prev => {
      const next = !prev;
      localStorage.setItem('sld_sidebar_pinned', String(next));
      return next;
    });
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsSidebarHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsSidebarHovered(false);
    }, 220);
  };

  const isDesktopSidebarVisible = isSidebarPinned || isSidebarHovered;

  return (
    <div className="flex h-[100dvh] bg-theme-base font-sans text-theme-main animate-fade-in overflow-hidden relative">
      
      {/* 1. Left Edge Hover Sensor Strip (Active when sidebar is unpinned/hidden) */}
      {!isSidebarPinned && (
        <div 
          className="hidden lg:flex fixed left-0 top-0 bottom-0 w-3.5 z-30 group cursor-pointer"
          onMouseEnter={handleMouseEnter}
          title="Hover to reveal side panel"
        >
          {/* Subtle grab indicator tab */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-brand-orange/60 group-hover:bg-brand-orange group-hover:w-2.5 rounded-r-md transition-all duration-200" />
        </div>
      )}

      {/* 2. Fixed Desktop Sidebar with Smooth Slide-in / Hover Transition */}
      <div
        className={`hidden lg:block fixed left-0 top-0 h-screen z-40 transition-transform duration-300 ease-in-out ${
          isDesktopSidebarVisible ? 'translate-x-0 shadow-2xl' : '-translate-x-full pointer-events-none'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <AdminSidebar 
          isPinned={isSidebarPinned}
          onTogglePin={handleTogglePin}
          onItemClick={() => {
            if (!isSidebarPinned) {
              setIsSidebarHovered(false);
            }
          }}
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
        className={`flex-1 flex flex-col min-w-0 h-full relative transition-[margin-left] duration-300 ease-in-out ${
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
