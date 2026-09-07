import React from 'react';

const FormSection = ({ title, icon: Icon, children, className = "", compact = false }) => {
  return (
    <div className={`border border-theme-border/50 rounded-xl bg-theme-surface-alt/50 flex flex-col h-full ${compact ? 'p-3' : 'p-5'} ${className}`}>
      {(title || Icon) && (
        <div className={`flex items-center gap-2 text-brand-orange font-semibold ${compact ? 'mb-2 text-sm' : 'mb-4 text-lg'}`}>
          {Icon && <Icon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />}
          {title}
        </div>
      )}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default FormSection;
