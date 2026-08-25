import { Briefcase, Scale, Bell, Book, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ACTIONS = [
  {
    title: 'Add New Case',
    description: 'Create a new legal case',
    icon: Briefcase,
    path: '/manage-cases/add',
    iconColor: 'text-brand-orange',
    bgColor: 'bg-brand-orange/10'
  },
  {
    title: 'Add Statute',
    description: 'Add a new statute or law',
    icon: Scale,
    path: '/manage-statutes/add',
    iconColor: 'text-brand-orange',
    bgColor: 'bg-brand-orange/10'
  },
  {
    title: 'Add Notification',
    description: 'Create a new system notification',
    icon: Bell,
    path: '/manage-notifications/add',
    iconColor: 'text-brand-orange',
    bgColor: 'bg-brand-orange/10'
  },
  {
    title: 'Manage Cases',
    description: 'View, search and manage all cases',
    icon: Book,
    path: '/manage-cases',
    iconColor: 'text-brand-orange',
    bgColor: 'bg-brand-orange/10'
  }
];

const QuickActions = () => {
  return (
    <div className="bg-theme-surface rounded-2xl border border-theme-border shadow-sm flex flex-col mb-6">
      <div className="p-6 pb-4">
        <h2 className="text-lg font-semibold text-theme-main">Quick Actions</h2>
      </div>
      
      <div className="px-6 pb-6 space-y-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.title}
            to={action.path}
            className="flex items-center gap-4 p-4 rounded-xl border border-theme-border/50 hover:border-brand-orange/40 hover:shadow-md transition-all group bg-theme-surface hover:bg-theme-surface-hover"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${action.bgColor} ${action.iconColor}`}>
              <action.icon className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-semibold text-theme-main group-hover:text-brand-orange transition-colors">{action.title}</span>
              <span className="text-xs text-theme-muted">{action.description}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-theme-disabled group-hover:text-brand-orange transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;

