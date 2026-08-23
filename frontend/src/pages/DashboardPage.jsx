import GlobalSearch from '../features/dashboard/components/GlobalSearch';
import SystemMetrics from '../features/dashboard/components/SystemMetrics';
import RecentActivity from '../features/dashboard/components/RecentActivity';
import QuickActions from '../features/dashboard/components/QuickActions';
import AtAGlance from '../features/dashboard/components/AtAGlance';
import AdminFooter from '../features/dashboard/components/AdminFooter';

const DashboardPage = () => {
  return (
    <div className="flex flex-col h-full w-full animate-fade-in">
      <GlobalSearch />
      
      <SystemMetrics />
      
      <div className="flex flex-col xl:flex-row gap-6 lg:gap-8 flex-1">
        <div className="w-full xl:w-2/3 flex flex-col">
          <RecentActivity />
        </div>
        
        <div className="w-full xl:w-1/3 flex flex-col">
          <QuickActions />
          <AtAGlance />
        </div>
      </div>
      
      <AdminFooter />
    </div>
  );
};

export default DashboardPage;
