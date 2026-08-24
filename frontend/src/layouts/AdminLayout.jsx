import { Outlet } from 'react-router-dom';
import AdminSidebar from '../features/dashboard/components/AdminSidebar';
import AdminHeader from '../features/dashboard/components/AdminHeader';
import PageTransition from '../components/ui/PageTransition';
import ChatWidget from '../components/ui/ChatWidget';

const AdminLayout = () => {
  return (
    <div className="flex h-[100dvh] bg-theme-base font-sans text-theme-main animate-fade-in overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar className="hidden lg:flex z-30 shrink-0" />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Shared Global Header */}
        <AdminHeader />
        
        {/* Scrollable Page Content */}
        <main className="flex-1 p-6 sm:p-8 w-full overflow-y-auto overflow-x-hidden relative z-0">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      
      {/* Global Floating Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default AdminLayout;
