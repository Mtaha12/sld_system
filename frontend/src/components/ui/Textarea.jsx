import React, { forwardRef } from 'react';

const Textarea = forwardRef(({ 
  className = "", 
  minHeight = "100px",
  error,
  ...props 
}, ref) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <textarea 
        ref={ref}
        className={`w-full rounded-lg px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-200'} text-sm text-gray-900 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange shadow-sm resize-y ${className}`}
        style={{ minHeight }}
        {...props}
      />
      {error && <span className="text-sm text-red-500 ml-1">{error.message}</span>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
