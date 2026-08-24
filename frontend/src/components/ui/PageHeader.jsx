import React from 'react';
import { X } from 'lucide-react';

const PageHeader = ({ title, subtitle, icon: Icon, onClose }) => {
  return (
    <div className="flex items-start justify-between p-6 border-b border-gray-100 shrink-0">
      <div className="flex gap-3">
        {Icon && (
          <div className="p-2 bg-orange-50 rounded-lg text-brand-orange">
            <Icon className="w-6 h-6" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {onClose && (
        <button 
          onClick={onClose}
          type="button"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default PageHeader;
