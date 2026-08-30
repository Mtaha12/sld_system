import { useState, useMemo, useEffect } from 'react';
import GlobalSearch from '../features/dashboard/components/GlobalSearch';
import SystemMetrics from '../features/dashboard/components/SystemMetrics';
import RecentActivity, { ACTIVITIES } from '../features/dashboard/components/RecentActivity';
import QuickActions from '../features/dashboard/components/QuickActions';
import AtAGlance from '../features/dashboard/components/AtAGlance';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import api from '../services/api.js';
import { Briefcase, Edit, FileText, Bell } from 'lucide-react';

const DashboardPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    recordType: 'all',
    court: 'all',
    timeframe: 'all',
    status: 'all',
    hasAttachment: false
  });

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    api.get('/api/dashboard/activities')
      .then(res => {
        if (res.data.success && isMounted) {
          const formatted = res.data.data.map(item => {
            let icon = Briefcase;
            let iconColor = 'text-brand-orange';
            if (item.type === 'case') {
              icon = item.action.toLowerCase().includes('updated') ? Edit : Briefcase;
            } else if (item.type === 'statute') {
              icon = FileText;
            } else if (item.type === 'notification') {
              icon = Bell;
            }
            return {
              ...item,
              icon,
              iconColor,
              bgColor: 'bg-brand-orange/10'
            };
          });
          setActivities(formatted);
        }
      })
      .catch(err => {
        console.error('Failed to load dashboard activities', err);
        if (isMounted) setActivities(ACTIVITIES);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.recordType !== 'all') count++;
    if (filters.court !== 'all') count++;
    if (filters.timeframe !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.hasAttachment) count++;
    return count;
  }, [filters]);

  const filteredActivities = useMemo(() => {
    return activities.filter(item => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesAction = item.action?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesCourt = item.court?.toLowerCase().includes(q);
        if (!matchesAction && !matchesDesc && !matchesCourt) return false;
      }

      // Record Type filter
      if (filters.recordType !== 'all' && item.type !== filters.recordType) {
        return false;
      }

      // Court filter
      if (filters.court !== 'all' && item.court !== filters.court) {
        return false;
      }

      // Timeframe filter
      if (filters.timeframe !== 'all') {
        if (filters.timeframe === 'today' && item.timeframe !== 'today') return false;
        if (filters.timeframe === 'week' && !['today', 'week'].includes(item.timeframe)) return false;
        if (filters.timeframe === '2026' && item.year !== '2026') return false;
        if (filters.timeframe === '2025' && item.year !== '2025') return false;
      }

      // Status filter
      if (filters.status !== 'all' && item.status !== filters.status) {
        return false;
      }

      // Attachment filter
      if (filters.hasAttachment && !item.hasAttachment) {
        return false;
      }

      return true;
    });
  }, [searchQuery, filters, activities]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilters({
      recordType: 'all',
      court: 'all',
      timeframe: 'all',
      status: 'all',
      hasAttachment: false
    });
  };

  return (
    <div className="flex flex-col h-full w-full animate-fade-in">
      <GlobalSearch 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filters={filters}
        setFilters={setFilters}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        activeFiltersCount={activeFiltersCount}
        onSearch={() => {}}
        onReset={handleResetFilters}
      />
      
      <SystemMetrics />
      
      <div className="flex flex-col xl:flex-row gap-6 lg:gap-8 flex-1">
        <div className="w-full xl:w-2/3 flex flex-col">
          <RecentActivity 
            activities={filteredActivities}
            activeFiltersCount={activeFiltersCount}
            searchQuery={searchQuery}
            onResetFilters={handleResetFilters}
            isLoading={isLoading}
          />
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

