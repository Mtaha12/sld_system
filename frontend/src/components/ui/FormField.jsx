import React from 'react';

const FormField = ({ label, required, children, className = "" }) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-theme-main mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
    </div>
  );
};

export default FormField;
