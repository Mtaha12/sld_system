import { Briefcase, Scale, FileText, Bell, Paperclip } from 'lucide-react';

const METRICS = [
  { label: 'Total Cases', value: '476,889', icon: Briefcase, color: 'text-theme-main' },
  { label: 'Active Cases', value: '162,415', icon: Scale, color: 'text-theme-main' },
  { label: 'Total Statutes', value: '98,765', icon: FileText, color: 'text-theme-main' },
  { label: 'Total Notifications', value: '2,456', icon: Bell, color: 'text-theme-main' },
  { label: 'Total Attachments', value: '156,987', icon: Paperclip, color: 'text-theme-main' },
];

const SystemMetrics = () => {
  return (
    <div className="bg-theme-surface rounded-2xl border border-theme-border shadow-sm p-2 flex flex-col md:flex-row mb-8">
      {METRICS.map((metric, index) => (
        <div 
          key={metric.label} 
          className="flex-1 flex flex-col relative group cursor-pointer"
        >
          {/* Vertical Divider (Desktop) */}
          {index !== METRICS.length - 1 && (
            <div className="hidden md:block absolute right-0 top-4 bottom-4 w-px bg-theme-surface-hover z-0"></div>
          )}
          {/* Horizontal Divider (Mobile) */}
          {index !== METRICS.length - 1 && (
            <div className="md:hidden absolute bottom-0 left-4 right-4 h-px bg-theme-surface-hover z-0"></div>
          )}

          <div className="flex items-center gap-4 w-full p-4 rounded-xl hover:bg-theme-surface-alt transition-all duration-300 justify-center md:justify-start lg:justify-center relative z-10">
            <div className={`p-3 rounded-xl bg-theme-surface-alt border border-theme-border/50 shrink-0 group-hover:bg-theme-surface group-hover:shadow-sm group-hover:border-theme-border transition-all duration-300 ${metric.color}`}>
              <metric.icon className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-theme-muted font-medium group-hover:text-theme-main transition-colors">{metric.label}</span>
              <span className="text-2xl font-bold text-theme-main leading-tight group-hover:text-brand-orange transition-colors">{metric.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SystemMetrics;
