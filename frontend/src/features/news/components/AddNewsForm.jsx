import React, { useState, useEffect } from 'react';
import { X, Newspaper, AlertCircle } from 'lucide-react';
import Input from '../../../components/ui/Input';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import { newsService } from '../services/newsService';

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const AddNewsForm = ({
  editData = null,
  onClose,
  onSuccess,
  className = ""
}) => {
  const isEdit = Boolean(editData && (editData.id || editData.mongoId));

  const [heading, setHeading] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [detail, setDetail] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (editData) {
      setHeading(editData.heading || '');
      const rawDate = editData.date || getTodayDateString();
      setDate(rawDate);
      if (editData.year) {
        setYear(editData.year.toString());
      } else if (rawDate) {
        setYear(rawDate.slice(0, 4));
      }
      setDetail(editData.detail || '');
    } else {
      const todayStr = getTodayDateString();
      setHeading('');
      setDate(todayStr);
      setYear(todayStr.slice(0, 4));
      setDetail('');
    }
    setErrors({});
    setServerError('');
  }, [editData]);

  const handleDateChange = (e) => {
    const val = e.target.value;
    setDate(val);
    if (val && val.length >= 4) {
      const parsedYear = val.slice(0, 4);
      if (!isNaN(Number(parsedYear))) {
        setYear(parsedYear);
      }
    }
    if (errors.date) setErrors(prev => ({ ...prev, date: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!heading.trim()) newErrors.heading = 'Heading is required';
    if (!date) newErrors.date = 'Date is required';
    if (!year || isNaN(Number(year))) newErrors.year = 'Valid year is required';
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
        date: date.trim(),
        year: parseInt(year, 10),
        detail: detail || ''
      };

      let result;
      if (isEdit) {
        const targetId = editData.mongoId || editData.id || editData.newsId;
        result = await newsService.updateNews(targetId, payload);
      } else {
        result = await newsService.createNews(payload);
      }

      if (onSuccess) {
        onSuccess(result, isEdit ? 'News record updated.' : 'News record added.');
      }
      if (onClose) onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to save news record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden animate-fade-in ${className}`}>
      
      {/* Compact Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-theme-border bg-gray-50/70 dark:bg-theme-surface-alt/40">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-brand-orange" />
          <h2 className="text-sm font-semibold text-theme-main">
            {isEdit ? 'Edit News Detail' : 'Add News Detail'}
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-theme-main dark:hover:text-white transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
          >
            <span>close</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Compact Body: Single-screen alignment */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {serverError && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Row 1: Heading (full width) */}
        <FormField label="Heading" required>
          <Input
            inputSize="sm"
            value={heading}
            onChange={(e) => {
              setHeading(e.target.value);
              if (errors.heading) setErrors(prev => ({ ...prev, heading: null }));
            }}
            placeholder="Enter news heading..."
            error={Boolean(errors.heading)}
            autoFocus
          />
          {errors.heading && <span className="text-[11px] text-red-500">{errors.heading}</span>}
        </FormField>

        {/* Row 2: Date and Year side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Date" required>
            <Input
              type="date"
              inputSize="sm"
              value={date}
              onChange={handleDateChange}
              error={Boolean(errors.date)}
            />
            {errors.date && <span className="text-[11px] text-red-500">{errors.date}</span>}
          </FormField>

          <FormField label="Year" required>
            <Input
              type="number"
              inputSize="sm"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                if (errors.year) setErrors(prev => ({ ...prev, year: null }));
              }}
              placeholder="e.g. 2026"
              error={Boolean(errors.year)}
            />
            {errors.year && <span className="text-[11px] text-red-500">{errors.year}</span>}
          </FormField>
        </div>

        {/* Detail: Compact Editor */}
        <FormField label="Detail">
          <div className="border border-theme-border rounded-lg overflow-hidden shadow-sm">
            <RichTextEditor
              value={detail}
              onChange={(val) => setDetail(val)}
              placeholder="Enter news details..."
              minHeight={170}
            />
          </div>
        </FormField>

        {/* Compact Footer */}
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
              Cancel
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="bg-[#009688] hover:bg-[#00897b] text-white h-[34px] px-5 text-xs font-medium"
          >
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Record' : 'Add Record')}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default AddNewsForm;
