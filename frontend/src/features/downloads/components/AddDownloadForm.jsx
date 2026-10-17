import React, { useState, useEffect, useRef } from 'react';
import { X, Download, AlertCircle, Paperclip, Eye, CheckCircle2 } from 'lucide-react';
import Input from '../../../components/ui/Input';
import DatePicker from '../../../components/ui/DatePicker';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import { downloadService } from '../services/downloadService';

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const LATEST_OPTIONS = [
  { label: 'Finance Act', value: 'Finance Act' },
  { label: 'Tax Return', value: 'Tax Return' },
  { label: 'Updated Law', value: 'Updated Law' }
];

const AddDownloadForm = ({
  editData = null,
  onClose,
  onSuccess,
  className = ""
}) => {
  const isEdit = Boolean(editData && (editData.id || editData.mongoId));
  const fileInputRef = useRef(null);

  const [heading, setHeading] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [latest, setLatest] = useState('Finance Act');
  const [attachment, setAttachment] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [detail, setDetail] = useState('');
  const [nextSr, setNextSr] = useState(null);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch highest existing download SR# in add mode
  useEffect(() => {
    let mounted = true;
    if (!isEdit) {
      downloadService.getDownloads()
        .then(list => {
          if (mounted && Array.isArray(list) && list.length > 0) {
            const maxSr = Math.max(0, ...list.map(d => Number(d.srNumber) || 0));
            setNextSr(maxSr + 1);
          }
        })
        .catch(() => {});
    }
    return () => { mounted = false; };
  }, [isEdit]);

  useEffect(() => {
    if (editData) {
      setHeading(editData.heading || '');
      setDate(editData.date || editData.dated || getTodayDateString());
      setLatest(editData.latest || 'Finance Act');
      setAttachment(editData.attachment || '');
      setAttachmentName(editData.attachmentName || '');
      setDetail(editData.detail || '');
    } else {
      setHeading('');
      setAttachment('');
      setAttachmentName('');
      setDetail('');
    }
    setErrors({});
    setServerError('');
  }, [editData]);

  const handleDateChange = (val) => {
    let dateStr = '';
    if (val instanceof Date && !isNaN(val)) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      dateStr = `${y}-${m}-${d}`;
    } else if (typeof val === 'string') {
      dateStr = val;
    }
    setDate(dateStr);
    if (errors.date) setErrors(prev => ({ ...prev, date: null }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, attachment: 'File size exceeds 10MB limit.' }));
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

  const handleViewAttachment = () => {
    const target = attachment || editData?.attachment;
    if (!target) return;
    const url = (typeof target === 'string' && (target.startsWith('http') || target.startsWith('data:') || target.startsWith('blob:')))
      ? target
      : `/uploads/${target}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const validate = () => {
    const newErrors = {};
    if (!heading.trim()) newErrors.heading = 'Heading is required';
    if (!date) newErrors.date = 'Date is required';
    if (!latest) newErrors.latest = 'Category is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setServerError('');
    setSuccessMessage('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        heading: heading.trim(),
        date: String(date).trim(),
        latest,
        attachment,
        attachmentName,
        detail: detail || ''
      };

      let result;
      if (isEdit) {
        const targetId = editData.mongoId || editData.id || editData.downloadId;
        result = await downloadService.updateDownload(targetId, payload);
        if (onSuccess) {
          onSuccess(result, 'Download record updated.');
        }
        if (onClose) onClose();
      } else {
        result = await downloadService.createDownload(payload);
        const createdSr = result?.srNumber || nextSr;
        const upcomingSr = (Number(createdSr) || 0) + 1;
        setNextSr(upcomingSr);
        setSuccessMessage(`Download record added successfully (SR #${createdSr}). Advanced to next SR #${upcomingSr}.`);
        // Clear heading, detail, attachment; keep date & latest category
        setHeading('');
        setDetail('');
        setAttachment('');
        setAttachmentName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (onSuccess) {
          onSuccess(result, 'Download record added.', { keepOpen: true });
        }
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to save download record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden animate-fade-in ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-theme-border bg-gray-50/70 dark:bg-theme-surface-alt/40">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-brand-orange" />
          <h2 className="text-sm font-semibold text-theme-main">
            {isEdit ? `Edit Download Detail (SR #${editData?.srNumber || editData?.id})` : `Add Download Detail${nextSr ? ` (Auto New SR #${nextSr})` : ''}`}
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

        {successMessage && (
          <div className="p-2.5 bg-green-50 dark:bg-green-950/30 border border-green-200 text-green-700 dark:text-green-300 rounded-lg text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Heading */}
        <FormField label="Heading" required>
          <Input
            inputSize="sm"
            value={heading}
            onChange={(e) => {
              setHeading(e.target.value);
              if (errors.heading) setErrors(prev => ({ ...prev, heading: null }));
            }}
            placeholder="Enter heading..."
            error={Boolean(errors.heading)}
            autoFocus
          />
          {errors.heading && <span className="text-[11px] text-red-500">{errors.heading}</span>}
        </FormField>

        {/* Row 2: Date (manual + table picker), Latest (dropdown), Attachment */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          
          <FormField label="Date" required>
            <DatePicker
              selectedDate={date}
              onChange={handleDateChange}
              placeholder="yyyy-mm-dd or dd/mm/yyyy"
              className="w-full h-[38px]"
            />
            {errors.date && <span className="text-[11px] text-red-500">{errors.date}</span>}
          </FormField>

          {/* Latest dropdown */}
          <FormField label="Latest" required>
            <Input
              type="select"
              inputSize="sm"
              value={latest}
              options={LATEST_OPTIONS}
              onChange={(e) => {
                setLatest(e.target.value);
                if (errors.latest) setErrors(prev => ({ ...prev, latest: null }));
              }}
              error={Boolean(errors.latest)}
            />
            {errors.latest && <span className="text-[11px] text-red-500">{errors.latest}</span>}
          </FormField>

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
                className="px-3 h-[38px] bg-[#00bcd4] hover:bg-[#00acc1] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Choose File
              </button>
              <span className="text-xs text-theme-muted truncate max-w-[110px]" title={attachmentName || 'No file chosen'}>
                {attachmentName || (attachment ? 'File attached' : 'No file chosen')}
              </span>
              {(attachment || attachmentName) && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleViewAttachment}
                    className="p-1.5 text-brand-orange hover:bg-brand-orange/10 rounded transition-colors"
                    title="View attachment in new window"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachment('');
                      setAttachmentName('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-gray-400 hover:text-red-500 p-1"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </FormField>

        </div>

        {/* Detail (Rich text editor) */}
        <FormField label="Detail">
          <div className="border border-theme-border rounded-lg overflow-hidden shadow-sm">
            <RichTextEditor
              value={detail}
              onChange={(val) => setDetail(val)}
              placeholder="Enter download details..."
              minHeight={170}
            />
          </div>
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
            className="bg-[#00bcd4] hover:bg-[#00acc1] text-white h-[34px] px-5 text-xs font-medium"
          >
            {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Record')}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default AddDownloadForm;
