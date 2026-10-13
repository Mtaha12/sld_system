import React from 'react';
import Button from './Button';
import { Save, CheckCircle } from 'lucide-react';

const FormFooter = ({ 
  onCancel, 
  cancelText = "Cancel", 
  submitText = "Save", 
  formId, 
  isSubmitting = false,
  submitIcon: SubmitIcon = Save,
  className = ""
}) => {
  return (
    <div className={`mt-6 px-4 py-4 border-t border-theme-border flex items-center justify-between gap-3 ${className}`}>
      <div className="text-xs text-theme-muted font-medium hidden sm:flex items-center gap-1.5">
        <CheckCircle className="w-4 h-4 text-brand-orange" />
        <span>Fill in required details and click <strong>{submitText}</strong> to commit changes.</span>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {onCancel && (
          <Button 
            variant="outline" 
            type="button" 
            onClick={onCancel} 
            disabled={isSubmitting}
            className="px-5 h-[38px] text-xs font-semibold cursor-pointer"
          >
            {cancelText}
          </Button>
        )}

        <Button 
          variant="primary" 
          form={formId} 
          type="submit" 
          className="bg-brand-orange hover:bg-brand-orange-hover text-white px-6 h-[38px] text-xs font-bold shadow-md cursor-pointer flex items-center gap-2 active:scale-95 transition-all"
          disabled={isSubmitting}
        >
          {SubmitIcon && <SubmitIcon className="w-4 h-4" />} 
          <span>{isSubmitting ? 'Saving...' : submitText}</span>
        </Button>
      </div>
    </div>
  );
};

export default FormFooter;
