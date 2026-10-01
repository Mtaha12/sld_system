import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, AlertCircle, Paperclip } from 'lucide-react';
import Input from '../../../components/ui/Input';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import { newsletterService } from '../services/newsletterService';

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const CATEGORY_OPTIONS = [
  { label: 'Updates', value: 'Updates' },
  { label: 'Case Laws & News', value: 'Case Laws & News' },
  { label: 'Tax Notifications', value: 'Tax Notifications' },
  { label: 'Circulars & Orders', value: 'Circulars & Orders' },
  { label: 'General Announcement', value: 'General Announcement' },
];

const AddNewsletterForm = ({
  editData = null,
  onClose,
  onSuccess,
  className = ""
}) => {
  const isEdit = Boolean(editData && (editData.id || editData.mongoId));
  const fileInputRef = useRef(null);

  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [category, setCategory] = useState('Updates');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (editData) {
      setSubject(editData.subject || '');
      setDate(editData.date || getTodayDateString());
      setCategory(editData.category || 'Updates');
      setMessage(editData.message || '');
      setAttachment(editData.attachment || '');
      setAttachmentName(editData.attachmentName || '');
    } else {
      setSubject('');
      setDate(getTodayDateString());
      setCategory('Updates');
      setMessage('');
      setAttachment('');
      setAttachmentName('');
    }
    setErrors({});
    setServerError('');
  }, [editData]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, attachment: 'File size exceeds 5MB limit.' }));
      return;
    }

    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment(reader.result);
      setErrors(prev => ({ ...prev, attachment: null }));
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors = {};
    if (!subject.trim()) newErrors.subject = 'Subject is required';
    if (!date) newErrors.date = 'Date is required';
    if (!category) newErrors.category = 'Category is required';
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
        subject: subject.trim(),
        date: date.trim(),
        category: category.trim(),
        message: message || '',
        attachment,
        attachmentName
      };

      let result;
      if (isEdit) {
        const targetId = editData.mongoId || editData.id || editData.newsletterId;
        result = await newsletterService.updateNewsletter(targetId, payload);
      } else {
        result = await newsletterService.createNewsletter(payload);
      }

      if (onSuccess) {
        onSuccess(result, isEdit ? 'Newsletter updated successfully.' : 'Newsletter created successfully.');
      }
      if (onClose) onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to save newsletter record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden animate-fade-in ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-theme-border bg-gray-50/70 dark:bg-theme-surface-alt/40">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-brand-orange" />
          <h2 className="text-sm font-semibold text-theme-main">
            {isEdit ? 'Edit Newsletter Detail' : 'Add Newsletter Detail'}
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

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {serverError && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Row 1: Subject * */}
        <FormField label="Subject" required>
          <Input
            inputSize="sm"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              if (errors.subject) setErrors(prev => ({ ...prev, subject: null }));
            }}
            placeholder="e.g. CASE LAWS & NEWS Updates"
            error={Boolean(errors.subject)}
            autoFocus
          />
          {errors.subject && <span className="text-[11px] text-red-500">{errors.subject}</span>}
        </FormField>

        {/* Row 2: Date *, Category * (NO status box) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Date" required>
            <Input
              type="date"
              inputSize="sm"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors(prev => ({ ...prev, date: null }));
              }}
              error={Boolean(errors.date)}
            />
            {errors.date && <span className="text-[11px] text-red-500">{errors.date}</span>}
          </FormField>

          <FormField label="Category" required>
            <Input
              type="select"
              inputSize="sm"
              value={category}
              options={CATEGORY_OPTIONS}
              onChange={(e) => {
                setCategory(e.target.value);
                if (errors.category) setErrors(prev => ({ ...prev, category: null }));
              }}
              error={Boolean(errors.category)}
            />
            {errors.category && <span className="text-[11px] text-red-500">{errors.category}</span>}
          </FormField>
        </div>

        {/* Message (Rich text editor) */}
        <FormField label="Message">
          <div className="border border-theme-border rounded-lg overflow-hidden shadow-sm">
            <RichTextEditor
              value={message}
              onChange={(val) => setMessage(val)}
              placeholder="Enter newsletter message..."
              minHeight={200}
            />
          </div>
        </FormField>

        {/* Attachment */}
        <FormField label="Attachment">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 h-[34px] bg-[#00bcd4] hover:bg-[#00acc1] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Paperclip className="w-3.5 h-3.5" />
              Choose Files
            </button>
            <span className="text-xs text-theme-muted truncate max-w-[200px]">
              {attachmentName || 'No file chosen'}
            </span>
            {attachmentName && (
              <button
                type="button"
                onClick={() => {
                  setAttachment('');
                  setAttachmentName('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-gray-400 hover:text-red-500 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <span className="text-[10px] text-red-500 block mt-1">Max allowed size is 5MB</span>
          {errors.attachment && <span className="text-[11px] text-red-500">{errors.attachment}</span>}
        </FormField>

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
              Cancel
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="bg-[#00bcd4] hover:bg-[#00acc1] text-white h-[34px] px-5 text-xs font-medium cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Record' : 'Add Record')}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default AddNewsletterForm;
