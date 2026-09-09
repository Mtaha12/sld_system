import React, { useState, useEffect } from 'react';
import { X, Globe, AlertCircle, Link as LinkIcon } from 'lucide-react';
import Input from '../../../components/ui/Input';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import { updateService } from '../services/updateService';

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const AddUpdateForm = ({
  editData = null,
  onClose,
  onSuccess,
  className = ""
}) => {
  const isEdit = Boolean(editData && (editData.id || editData.mongoId));

  const [heading, setHeading] = useState('');
  const [dated, setDated] = useState(getTodayDateString());
  const [url, setUrl] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (editData) {
      setHeading(editData.heading || '');
      setDated(editData.dated || editData.date || getTodayDateString());
      setUrl(editData.url || '');
    } else {
      setHeading('');
      setDated(getTodayDateString());
      setUrl('');
    }
    setErrors({});
    setServerError('');
  }, [editData]);

  const validate = () => {
    const newErrors = {};
    if (!heading.trim()) newErrors.heading = 'Heading is required';
    if (!dated) newErrors.dated = 'Dated is required';
    if (!url.trim()) newErrors.url = 'URL is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        heading: heading.trim(),
        dated: dated.trim(),
        url: url.trim()
      };

      let result;
      if (isEdit) {
        const targetId = editData.mongoId || editData.id || editData.updateId;
        result = await updateService.updateUpdate(targetId, payload);
      } else {
        result = await updateService.createUpdate(payload);
      }

      if (onSuccess) {
        onSuccess(result, isEdit ? 'Update record updated.' : 'Update record added.');
      }
      if (onClose) onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to save update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden animate-fade-in ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-theme-border bg-gray-50/70 dark:bg-theme-surface-alt/40">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#00bcd4]" />
          <h2 className="text-sm font-semibold text-theme-main">
            {isEdit ? 'Edit Update' : 'Add Update'}
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-theme-main dark:hover:text-white transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
          >
            <span>Closed</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Form Body: Compact single-screen layout */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {serverError && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Heading * */}
        <FormField label="Heading" required>
          <Input
            inputSize="sm"
            value={heading}
            onChange={(e) => {
              setHeading(e.target.value);
              if (errors.heading) setErrors(prev => ({ ...prev, heading: null }));
            }}
            placeholder="Enter update heading..."
            error={Boolean(errors.heading)}
            autoFocus
          />
          {errors.heading && <span className="text-[11px] text-red-500">{errors.heading}</span>}
        </FormField>

        {/* Row 2: Dated * and URL * side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <FormField label="Dated" required>
              <Input
                type="date"
                inputSize="sm"
                value={dated}
                onChange={(e) => {
                  setDated(e.target.value);
                  if (errors.dated) setErrors(prev => ({ ...prev, dated: null }));
                }}
                error={Boolean(errors.dated)}
              />
              {errors.dated && <span className="text-[11px] text-red-500">{errors.dated}</span>}
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField label="URL" required>
              <Input
                inputSize="sm"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errors.url) setErrors(prev => ({ ...prev, url: null }));
                }}
                placeholder="https://example.com/update..."
                error={Boolean(errors.url)}
              />
              {errors.url && <span className="text-[11px] text-red-500">{errors.url}</span>}
            </FormField>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-theme-border">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-[34px] px-4 text-xs"
            >
              Closed
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="bg-[#00bcd4] hover:bg-[#00acc1] text-white h-[34px] px-5 text-xs font-medium"
          >
            {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Record')}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default AddUpdateForm;
