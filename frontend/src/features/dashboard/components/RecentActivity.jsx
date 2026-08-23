import { Briefcase, Edit, FileText, Bell, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ACTIVITIES = [
  {
    id: 1,
    action: 'New case added',
    description: 'C.P.L.A 3458-K/2022 (Against the judgment dated 29.03.2022)',
    time: '2 mins ago',
    icon: Briefcase,
    iconColor: 'text-brand-orange',
    bgColor: 'bg-orange-50'
  },
  {
    id: 2,
    action: 'Case updated',
    description: 'S.L.D 2025 8335 (Federal Constitutional Court of Pakistan)',
    time: '15 mins ago',
    icon: Edit,
    iconColor: 'text-brand-orange',
    bgColor: 'bg-orange-50'
  },
  {
    id: 3,
    action: 'New statute added',
    description: 'The Civil Procedure Code (Amendment) Act, 2025',
    time: '1 hour ago',
    icon: FileText,
    iconColor: 'text-brand-orange',
    bgColor: 'bg-orange-50'
  },
  {
    id: 4,
    action: 'New notification',
    description: 'Court Holiday Notification - May 2025',
    time: '3 hours ago',
    icon: Bell,
    iconColor: 'text-brand-orange',
    bgColor: 'bg-orange-50'
  },
  {
    id: 5,
    action: 'New case added',
    description: 'S.L.D 2025 8333 (Tax 304 139)',
    time: '5 hours ago',
    icon: Briefcase,
    iconColor: 'text-brand-orange',
    bgColor: 'bg-orange-50'
  },
  {
    id: 6,
    action: 'Case updated',
    description: 'C.A. Misc. No. 4821/2022 (Order dtd: 06.05.2025)',
    time: '1 day ago',
    icon: Edit,
    iconColor: 'text-brand-orange',
    bgColor: 'bg-orange-50'
  }
];

const RecentActivity = () => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full">
      <div className="p-6 flex items-center justify-between border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <Link to="/activity" className="text-sm font-medium text-[#641E16] hover:text-[#4A1610] flex items-center gap-1 transition-colors">
          View all activity <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="p-6 flex-1">
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-6 bottom-6 w-px bg-gray-200"></div>
          
          <div className="space-y-8 relative">
            {ACTIVITIES.map((activity) => (
              <div key={activity.id} className="flex gap-4 group">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-white ring-4 ring-white z-10 ${activity.bgColor} ${activity.iconColor}`}>
                  <activity.icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col pt-1.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-0.5">
                    <span className="text-sm font-semibold text-gray-900">{activity.action}</span>
                    <span className="text-xs text-gray-400 shrink-0">{activity.time}</span>
                  </div>
                  <span className="text-sm text-gray-500 truncate group-hover:text-gray-700 transition-colors">{activity.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentActivity;
