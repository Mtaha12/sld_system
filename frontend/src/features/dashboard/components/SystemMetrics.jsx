import { Briefcase, Scale, FileText, Bell, Paperclip } from 'lucide-react';

const METRICS = [
  { label: 'Total Cases', value: '476,889', icon: Briefcase, color: 'text-gray-900' },
  { label: 'Active Cases', value: '162,415', icon: Scale, color: 'text-gray-900' },
  { label: 'Total Statutes', value: '98,765', icon: FileText, color: 'text-gray-900' },
  { label: 'Total Notifications', value: '2,456', icon: Bell, color: 'text-gray-900' },
  { label: 'Total Attachments', value: '156,987', icon: Paperclip, color: 'text-gray-900' },
];

const SystemMetrics = () => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-2 flex flex-col md:flex-row mb-8">
      {METRICS.map((metric, index) => (
        <div 
          key={metric.label} 
          className="flex-1 flex flex-col relative group cursor-pointer"
        >
          {/* Vertical Divider (Desktop) */}
          {index !== METRICS.length - 1 && (
            <div className="hidden md:block absolute right-0 top-4 bottom-4 w-px bg-gray-100 z-0"></div>
          )}
          {/* Horizontal Divider (Mobile) */}
          {index !== METRICS.length - 1 && (
            <div className="md:hidden absolute bottom-0 left-4 right-4 h-px bg-gray-100 z-0"></div>
          )}

          <div className="flex items-center gap-4 w-full p-4 rounded-xl hover:bg-gray-50 transition-all duration-300 justify-center md:justify-start lg:justify-center relative z-10">
            <div className={`p-3 rounded-xl bg-gray-50 border border-gray-100 shrink-0 group-hover:bg-white group-hover:shadow-sm group-hover:border-gray-200 transition-all duration-300 ${metric.color}`}>
              <metric.icon className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-medium group-hover:text-gray-700 transition-colors">{metric.label}</span>
              <span className="text-2xl font-bold text-gray-900 leading-tight group-hover:text-brand-orange transition-colors">{metric.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SystemMetrics;
