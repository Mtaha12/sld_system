import { Briefcase, Edit, FileText, Bell, ChevronRight, Filter, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import SquareLoader from '../../../components/ui/SquareLoader';

export const ACTIVITIES = [
  {
    id: 1,
    type: 'case',
    action: 'New case added',
    description: 'C.P.L.A 3458-K/2022 (Against the judgment dated 29.03.2022)',
    court: 'Supreme Court of Pakistan',
    timeframe: 'today',
    year: '2025',
    time: '2 mins ago',
    icon: Briefcase,
    iconColor: 'text-brand-orange',
    bgColor: 'bg-brand-orange/10',
    hasAttachment: true,
    status: 'active'
  },
  {
    id: 2,
    type: 'case',
    action: 'Case updated',
    description: 'S.L.D 2025 8335 (Federal Constitutional Court of Pakistan)',
    court: 'Federal Constitutional Court of Pakistan',
    timeframe: 'today',
    year: '2025',
    time: '15 mins ago',
    icon: Edit,
    iconColor: 'text-brand-orange',
    bgColor: 'bg-brand-orange/10',
    hasAttachment: true,
    status: 'active'
  },
  {
    id: 3,
    type: 'statute',
    action: 'New statute added',
    description: 'The Civil Procedure Code (Amendment) Act, 2025',
    court: 'Tax / FBR',
    timeframe: 'today',
    year: '2025',
    time: '1 hour ago',
    icon: FileText,
    iconColor: 'text-brand-orange',
    bgColor: 'bg-brand-orange/10',
    hasAttachment: true,
    status: 'active'
  },
  {
    id: 4,
    type: 'notification',
    action: 'New notification',
    description: 'Court Holiday Notification - May 2025 (S.R.O. 581(I)/2025)',
    court: 'Federal Constitutional Court of Pakistan',
    timeframe: 'today',
    year: '2025',
    time: '3 hours ago',
    icon: Bell,
    iconColor: 'text-brand-orange',
    bgColor: 'bg-brand-orange/10',
    hasAttachment: false,
    status: 'active'
  },
  {
    id: 5,
    type: 'case',
    action: 'New case added',
    description: 'S.L.D 2025 8333 (Tax 304 139)',
    court: 'High Court of Sindh',
    timeframe: 'today',
    year: '2025',
    time: '5 hours ago',
    icon: Briefcase,
    iconColor: 'text-brand-orange',
    bgColor: 'bg-brand-orange/10',
    hasAttachment: true,
    status: 'active'
  },
  {
    id: 6,
    type: 'case',
    action: 'Case updated',
    description: 'C.A. Misc. No. 4821/2022 (Order dtd: 06.05.2025)',
    court: 'Lahore High Court',
    timeframe: 'week',
    year: '2025',
    time: '1 day ago',
    icon: Edit,
    iconColor: 'text-brand-orange',
    bgColor: 'bg-brand-orange/10',
    hasAttachment: false,
    status: 'active'
  }
];

const RecentActivity = ({ 
  activities = ACTIVITIES, 
  onResetFilters,
  isLoading = false
}) => {
  return (
    <div className="bg-theme-surface rounded-2xl border border-theme-border shadow-sm flex flex-col h-full">
      <div className="p-6 flex items-center justify-between border-b border-theme-border/50">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-theme-main">Recent Activity</h2>
          {activities.length !== ACTIVITIES.length && (
            <span className="px-2 py-0.5 bg-brand-orange/10 text-brand-orange rounded-full text-xs font-semibold">
              {activities.length} of {ACTIVITIES.length}
            </span>
          )}
        </div>
        
        <Link to="/activity" className="text-sm font-medium text-brand-orange hover:text-brand-orange-hover flex items-center gap-1 transition-colors">
          View all activity <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-center">
        {isLoading ? (
          <SquareLoader size="sm" text="Loading recent activity..." minHeight="min-h-[220px]" />
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-theme-main">No Matching Records Found</h3>
            <p className="text-xs text-theme-muted max-w-xs">
              No recent activity matches your current search query or filter combination.
            </p>
            {onResetFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="mt-2 text-xs font-semibold text-brand-orange hover:text-brand-orange-hover flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Search & Filters
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-6 top-6 bottom-6 w-px bg-theme-border -translate-x-1/2"></div>
            
            <div className="space-y-8 relative">
              {activities.map((activity, index) => (
                <div key={activity.id} className="flex gap-4 group relative">
                  
                  {/* Connecting Dot */}
                  {index !== activities.length - 1 && (
                    <div className="absolute left-6 top-[64px] w-[5px] h-[5px] bg-brand-orange rounded-full -translate-x-1/2 -translate-y-1/2 z-10"></div>
                  )}

                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-theme-border z-10 bg-theme-surface ${activity.iconColor}`}>
                    <activity.icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-col pt-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-0.5">
                      <span className="text-sm font-semibold text-theme-main">{activity.action}</span>
                      <span className="text-xs text-theme-disabled shrink-0">{activity.time}</span>
                    </div>
                    <span className="text-sm text-theme-muted truncate group-hover:text-theme-main transition-colors">{activity.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;

