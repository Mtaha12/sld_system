import { User, Users, UserCheck, FileText, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATS = [
  { label: 'Registered Lawyers', value: '15,245', icon: User, path: '/lawyers', color: 'text-brand-orange' },
  { label: 'Petitioners', value: '98,452', icon: Users, path: '/petitioners', color: 'text-brand-orange' },
  { label: 'Respondents', value: '74,892', icon: UserCheck, path: '/respondents', color: 'text-brand-orange' },
  { label: 'Today\'s Activity', value: '156', icon: FileText, path: '/activity/today', color: 'text-brand-orange' },
];

const AtAGlance = () => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col flex-1">
      <div className="p-6 pb-2">
        <h2 className="text-lg font-semibold text-gray-900">At a Glance</h2>
      </div>
      
      <div className="px-6 pb-6 pt-2 flex flex-col">
        {STATS.map((stat, index) => (
          <Link
            key={stat.label}
            to={stat.path}
            className={`flex items-center gap-4 py-3.5 group hover:bg-gray-50 -mx-6 px-6 transition-colors ${
              index !== STATS.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <stat.icon className={`w-5 h-5 shrink-0 ${stat.color}`} strokeWidth={1.5} />
            <span className="text-sm text-gray-600 flex-1 group-hover:text-gray-900 transition-colors">{stat.label}</span>
            <span className="text-sm font-semibold text-gray-900">{stat.value}</span>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AtAGlance;
