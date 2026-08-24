import React from 'react';

const FormSection = ({ title, icon: Icon, children, className = "" }) => {
  return (
    <div className={`border border-gray-100 rounded-xl p-5 bg-gray-50/50 flex flex-col h-full ${className}`}>
      {(title || Icon) && (
        <div className="flex items-center gap-2 mb-4 text-brand-orange font-semibold text-lg">
          {Icon && <Icon className="w-5 h-5" />}
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
