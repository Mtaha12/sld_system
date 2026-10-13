import WarningAlert from '../features/dashboard/components/WarningAlert';
import TickerBanner from '../features/dashboard/components/TickerBanner';
import FeaturedSection from '../features/dashboard/components/FeaturedSection';
import NewsFeed from '../features/dashboard/components/NewsFeed';
import InfoWidgets from '../features/dashboard/components/InfoWidgets';
import BottomBanners from '../features/dashboard/components/BottomBanners';
import AdminFooter from '../features/dashboard/components/AdminFooter';

const DashboardPage = () => {
  return (
    <div className="flex flex-col h-full w-full animate-fade-in space-y-4 pb-4">
      <TickerBanner />
      <WarningAlert />
      
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
        <div className="xl:col-span-8 flex flex-col">
          <FeaturedSection />
        </div>
        <div className="xl:col-span-4 flex flex-col">
          <NewsFeed />
        </div>
      </div>
      
      <InfoWidgets />
      <BottomBanners />
      <AdminFooter />
    </div>
  );
};

export default DashboardPage;
