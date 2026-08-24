import React from 'react';
import Button from './Button';
import { Save } from 'lucide-react';

const FormFooter = ({ 
  onCancel, 
  cancelText = "Cancel", 
  submitText = "Save", 
  formId, 
  isSubmitting = false,
  submitIcon: SubmitIcon = Save
}) => {
  return (
    <div className="p-6 border-t border-gray-200 shrink-0 bg-white rounded-b-2xl flex justify-end gap-3">
      {onCancel && (
        <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
          {cancelText}
        </Button>
      )}
      <Button 
        variant="primary" 
        form={formId} 
        type="submit" 
        className="bg-brand-orange text-white"
        disabled={isSubmitting}
      >
        {SubmitIcon && <SubmitIcon className="w-4 h-4 mr-2" />} 
        {submitText}
      </Button>
    </div>
  );
};

export default FormFooter;
