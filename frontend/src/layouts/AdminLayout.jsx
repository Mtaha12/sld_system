import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../features/dashboard/components/AdminSidebar';
import AdminHeader from '../features/dashboard/components/AdminHeader';
import PageTransition from '../components/ui/PageTransition';
import ChatWidget from '../components/ui/ChatWidget';

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

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

  return (
    <div className="flex h-[100dvh] bg-theme-base font-sans text-theme-main animate-fade-in overflow-hidden">
      {/* Desktop Sidebar */}
      <AdminSidebar className="hidden lg:flex z-30 shrink-0" />

      {/* Mobile / Tablet Drawer */}
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

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Shared Global Header */}
        <AdminHeader 
          onToggleMenu={() => setIsMobileMenuOpen(prev => !prev)} 
          isAIChatOpen={isAIChatOpen} 
          setIsAIChatOpen={setIsAIChatOpen} 
        />
        
        {/* Scrollable Page Content */}
        <main className="flex-1 p-6 sm:p-8 w-full overflow-y-auto overflow-x-hidden relative z-0">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      
      {/* Global Floating Chat Widget */}
      <ChatWidget isHidden={isAIChatOpen} />
    </div>
  );
};

export default AdminLayout;
