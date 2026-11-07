import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Mail, AlertCircle, Paperclip, Share2, Check, Loader2, Copy } from 'lucide-react';
import Input from '../../../components/ui/Input';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import FormFooter from '../../../components/ui/FormFooter';
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

  const [subject, setSubject] = useState(editData?.subject || 'CASE LAWS & NEWS Updates');
  const [date, setDate] = useState(editData?.date || getTodayDateString());
  const [category, setCategory] = useState(editData?.category || 'Updates');
  const [message, setMessage] = useState(editData?.message || '');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteRecord = async () => {
    const id = editData?.mongoId || editData?.id || editData?.newsletterId;
    if (!id) return;
    if (!window.confirm('Are you sure you want to permanently delete newsletter SR #' + (editData?.srNumber || id) + '? Subsequent SR numbers will automatically adjust down.')) return;
    setIsDeleting(true);
    try {
      await newsletterService.deleteNewsletter(id);
      if (onSuccess) onSuccess(null, 'Newsletter deleted successfully. Sequential SR numbers auto-adjusted.');
      if (onClose) onClose();
    } catch (err) {
      setServerError(err.message || 'Failed to delete record.');
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (editData) {
      setSubject(editData.subject || 'CASE LAWS & NEWS Updates');
      setDate(editData.date || getTodayDateString());
      setCategory(editData.category || 'Updates');
      setMessage(editData.message || '');
      
      let initialAtts = [];
      if (Array.isArray(editData.attachments) && editData.attachments.length > 0) {
        initialAtts = editData.attachments.map(a => typeof a === 'string' ? { url: a, name: a.split('/').pop() } : a);
      } else if (editData.attachment) {
        const urls = String(editData.attachment).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        initialAtts = urls.map(u => ({ url: u, name: u.split('/').pop() || 'Attachment' }));
      }
      setAttachments(initialAtts);
    } else {
      setSubject('CASE LAWS & NEWS Updates');
      setDate(getTodayDateString());
      setCategory('Updates');
      setMessage('');
      setAttachments([]);
    }
    setErrors({});
    setServerError('');
  }, [editData]);

  const handleFileChange = async (e) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;

    // Verify 5MB per file limit
    const oversized = fileList.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) {
      setErrors(prev => ({
        ...prev,
        attachment: `File "${oversized[0].name}" exceeds 5MB limit. Please upload files under 5MB each.`
      }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setErrors(prev => ({ ...prev, attachment: null }));
    setIsUploading(true);

    try {
      const newlyUploaded = [];
      for (const file of fileList) {
        const res = await newsletterService.uploadAttachment(file);
        if (res) {
          const item = res.data || res;
          newlyUploaded.push({
            url: item.url,
            relativeUrl: item.relativeUrl,
            name: item.name || file.name,
            size: item.size
          });
        }
      }

      // CUMULATIVE: Append new files to existing attachments (never vanish previously attached files!)
      setAttachments(prev => [...prev, ...newlyUploaded]);
    } catch (err) {
      console.error('Error uploading newsletter attachments:', err);
      setErrors(prev => ({
        ...prev,
        attachment: err.response?.data?.message || err.message || 'Failed to upload attachments.'
      }));
    } finally {
      setIsUploading(false);
      // Reset input value so user can click Choose Files again anytime
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCopyUrl = (url, idx) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
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
        attachments,
        attachment: attachments.map(a => a.url).join('\n'),
        attachmentName: attachments.map(a => a.name || a.url.split('/').pop()).join(', ')
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
      <form id="newsletter-form" onSubmit={handleSubmit} className="p-4 space-y-3">
        {serverError && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {isEdit && editData && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 min-w-0">
              <Share2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="truncate">
                Public Shareable Link: <span className="font-mono font-medium">{`${window.location.origin}/newsletters/view/${editData.mongoId || editData.id}`}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/newsletters/view/${editData.mongoId || editData.id}`);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="px-2.5 py-1 bg-white dark:bg-stone-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-50 shrink-0 cursor-pointer shadow-2xs"
            >
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </button>
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

        {/* Row 2: Date *, Category * */}
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
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.rtf"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 h-[34px] bg-[#00bcd4] hover:bg-[#00acc1] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Choose Files</span>
                </>
              )}
            </button>
            <span className="text-xs text-theme-muted">
              {isUploading
                ? 'Uploading attachments...'
                : attachments.length === 0
                ? 'No file chosen'
                : `${attachments.length} file(s) attached`}
            </span>
          </div>
          <span className="text-[11px] text-red-500 block mt-1">Max allowed size is 5MB</span>
          {errors.attachment && <span className="text-[11px] text-red-500 block mt-0.5">{errors.attachment}</span>}

          {/* List of uploaded URLs displayed line-by-line as in previous system */}
          {attachments.length > 0 && (
            <div className="mt-2.5 p-2.5 bg-slate-50 dark:bg-theme-surface-alt/50 border border-theme-border rounded-lg space-y-1.5">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 group hover:bg-white dark:hover:bg-theme-surface p-1 rounded transition-colors text-xs">
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0275d8] hover:text-[#014c8c] hover:underline font-mono text-[12px] break-all leading-tight"
                    title={`Click to open ${att.name || 'document'}`}
                  >
                    {att.url}
                  </a>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(att.url, idx)}
                      className="px-2 py-0.5 text-[11px] font-sans font-medium bg-white dark:bg-theme-surface border border-theme-border rounded text-slate-600 dark:text-slate-300 hover:text-brand-orange hover:border-brand-orange cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                      title="Copy URL to clipboard for pasting in Message"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedIndex === idx ? 'Copied!' : 'Copy URL'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-gray-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormField>

      </form>
      {isEdit && (
          <div className="flex justify-start px-1 -mb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeleteRecord}
              disabled={isSubmitting || isDeleting}
              className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 h-[34px] px-3.5 text-xs font-medium"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete Record
            </Button>
          </div>
        )}
        <FormFooter
        formId="newsletter-form"
        onCancel={onClose}
        isSubmitting={isSubmitting}
        submitText={isEdit ? "Update Record" : "Add Record"}
      />
    </div>
  );
};

export default AddNewsletterForm;
