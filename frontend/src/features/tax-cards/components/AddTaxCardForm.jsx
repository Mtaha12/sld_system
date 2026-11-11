import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, CreditCard, AlertCircle, Paperclip, CheckCircle2 } from 'lucide-react';
import Input from '../../../components/ui/Input';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import { taxCardService } from '../services/taxCardService';

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const normalizeDateInput = (rawDate) => {
  if (!rawDate) return getTodayDateString();
  const s = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
};

const AddTaxCardForm = ({
  editData = null,
  defaultCategory = '',
  categoryTitle = 'Finance Act',
  lastEntry = null,
  onClose,
  onSuccess,
  className = ""
}) => {
  const isEdit = Boolean(editData && (editData.id || editData.mongoId));
  const isFinanceAct =
    categoryTitle === 'Finance Act' ||
    String(defaultCategory || '').toLowerCase().replace(/[-_\s]/g, '') === 'financeact';
  const fileInputRef = useRef(null);
  const preserveDraftDefaultsRef = useRef(null);

  const [heading, setHeading] = useState('');
  const [date, setDate] = useState(() => normalizeDateInput(lastEntry?.date));
  const [year, setYear] = useState(() => {
    if (lastEntry?.year) return String(lastEntry.year);
    if (lastEntry?.date) return String(lastEntry.date).slice(0, 4);
    return new Date().getFullYear().toString();
  });
  const [attachment, setAttachment] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [detail, setDetail] = useState('');
  const [nextSr, setNextSr] = useState(() => {
    const sr = Number(lastEntry?.srNumber);
    return !isNaN(sr) && sr > 0 ? sr + 1 : 1;
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteRecord = async () => {
    const id = editData?.mongoId || editData?.id || editData?.taxCardId;
    if (!id) return;
    if (!window.confirm('Are you sure you want to permanently delete record SR #' + (editData?.srNumber || id) + '? Subsequent SR numbers will automatically adjust down.')) return;
    setIsDeleting(true);
    try {
      await taxCardService.deleteTaxCard(id);
      if (onSuccess) onSuccess(null, 'Record deleted successfully. Sequential SR numbers auto-adjusted.');
      if (onClose) onClose();
    } catch (err) {
      setServerError(err.message || 'Failed to delete record.');
      setIsDeleting(false);
    }
  };

  // Keep Next SR#, Date, and Year synchronized from the latest existing entry in Add mode
  useEffect(() => {
    let mounted = true;
    if (!isEdit && !preserveDraftDefaultsRef.current) {
      if (lastEntry) {
        const srNum = Number(lastEntry.srNumber) || 0;
        setNextSr(srNum + 1);
        if (lastEntry.date) setDate(normalizeDateInput(lastEntry.date));
        if (lastEntry.year) setYear(String(lastEntry.year));
        else if (lastEntry.date) setYear(String(lastEntry.date).slice(0, 4));
      } else {
        taxCardService.getTaxCards()
          .then(list => {
            if (!mounted || !Array.isArray(list)) return;
            if (list.length > 0) {
              const latest = list.reduce((best, cur) =>
                (Number(cur.srNumber) || 0) >= (Number(best?.srNumber) || 0) ? cur : best,
                list[0]
              );
              const maxSr = Number(latest?.srNumber) || list.length;
              setNextSr(maxSr + 1);
              if (latest?.date) setDate(normalizeDateInput(latest.date));
              if (latest?.year) setYear(String(latest.year));
              else if (latest?.date) setYear(String(latest.date).slice(0, 4));
            } else {
              setNextSr(1);
            }
          })
          .catch(() => {});
      }
    }
    return () => { mounted = false; };
  }, [isEdit, lastEntry]);

  useEffect(() => {
    if (editData) {
      preserveDraftDefaultsRef.current = null;
      setHeading(editData.heading || '');
      const rawDate = normalizeDateInput(editData.date);
      setDate(rawDate);
      if (editData.year) {
        setYear(editData.year.toString());
      } else if (rawDate) {
        setYear(rawDate.slice(0, 4));
      }
      setAttachment(editData.attachment || '');
      setAttachmentName(editData.attachmentName || '');
      setDetail(editData.detail || '');
    } else {
      const preserved = preserveDraftDefaultsRef.current;
      preserveDraftDefaultsRef.current = null;

      setHeading('');
      setAttachment('');
      setAttachmentName('');
      setDetail('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (preserved) {
        setDate(preserved.date);
        setYear(preserved.year);
        if (preserved.nextSr) setNextSr(preserved.nextSr);
      } else if (lastEntry) {
        setDate(normalizeDateInput(lastEntry.date));
        setYear(
          lastEntry.year
            ? String(lastEntry.year)
            : (lastEntry.date ? String(lastEntry.date).slice(0, 4) : new Date().getFullYear().toString())
        );
        setNextSr((Number(lastEntry.srNumber) || 0) + 1);
      } else {
        const todayStr = getTodayDateString();
        setDate(todayStr);
        setYear(todayStr.slice(0, 4));
      }
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
    setSuccessMessage('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const savedDate = date.trim();
      const savedYear = String(parseInt(year, 10));
      const payload = {
        heading: heading.trim(),
        category: (defaultCategory || editData?.category || 'tax-cards').trim(),
        date: savedDate,
        year: parseInt(year, 10),
        attachment,
        attachmentName,
        detail: isFinanceAct ? (editData?.detail || '') : (detail || '')
      };

      let result;
      if (isEdit) {
        const targetId = editData.mongoId || editData.id || editData.taxCardId;
        const currentSr = Number(editData.srNumber) || 0;
        const nextSrNum = currentSr + 1;
        result = await taxCardService.updateTaxCard(targetId, payload);

        let nextRecord = null;
        try {
          const freshList = await taxCardService.getTaxCards();
          if (Array.isArray(freshList)) {
            nextRecord = freshList.find(r => Number(r.srNumber) === nextSrNum) || null;
          }
        } catch (fetchErr) {
          console.warn('Could not fetch next record after edit:', fetchErr);
        }

        if (nextRecord) {
          setSuccessMessage(`${categoryTitle} SR #${currentSr} updated! Loaded next SR #${nextSrNum}.`);
          if (onSuccess) {
            onSuccess(result, `${categoryTitle} SR #${currentSr} updated.`, { keepOpen: true, nextItem: nextRecord });
          }
        } else {
          preserveDraftDefaultsRef.current = { date: savedDate, year: savedYear, nextSr: nextSrNum };
          setNextSr(nextSrNum);
          setHeading('');
          setAttachment('');
          setAttachmentName('');
          setDetail('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          setSuccessMessage(`${categoryTitle} SR #${currentSr} updated! Ready for new entry SR #${nextSrNum} (previous Date & Year kept).`);
          if (onSuccess) {
            onSuccess(result, `${categoryTitle} SR #${currentSr} updated.`, { keepOpen: true, nextItem: null });
          }
        }
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        result = await taxCardService.createTaxCard(payload);
        const createdSr = Number(result?.srNumber) || Number(nextSr) || 1;
        const upcomingSr = createdSr + 1;

        preserveDraftDefaultsRef.current = { date: savedDate, year: savedYear, nextSr: upcomingSr };
        setNextSr(upcomingSr);
        setDate(savedDate);
        setYear(savedYear);
        setHeading('');
        setAttachment('');
        setAttachmentName('');
        setDetail('');
        if (fileInputRef.current) fileInputRef.current.value = '';

        setSuccessMessage(`${categoryTitle} SR #${createdSr} saved! Advanced to SR #${upcomingSr} (previous Date & Year kept).`);
        if (onSuccess) {
          onSuccess(result, `${categoryTitle} SR #${createdSr} added.`, { keepOpen: true });
        }
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || `Failed to save ${categoryTitle} record.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden animate-fade-in ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-theme-border bg-gray-50/70 dark:bg-theme-surface-alt/40">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-brand-orange" />
          <h2 className="text-sm font-semibold text-theme-main">
            {isEdit
              ? `Edit ${categoryTitle} Detail (SR #${editData?.srNumber || editData?.id || ''})`
              : `Add ${categoryTitle} Detail${nextSr ? ` (Auto New SR #${nextSr})` : ''}`}
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

        {/* Heading * */}
        <FormField label="Heading" required>
          <Input
            inputSize="sm"
            value={heading}
            onChange={(e) => {
              setHeading(e.target.value);
              if (errors.heading) setErrors(prev => ({ ...prev, heading: null }));
            }}
            placeholder={`Enter ${categoryTitle.toLowerCase()} heading...`}
            error={Boolean(errors.heading)}
            autoFocus
          />
          {errors.heading && <span className="text-[11px] text-red-500">{errors.heading}</span>}
        </FormField>

        {/* Row 2: Date *, Year * (NO status box) */}
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
              Choose File
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
          <span className="text-[10px] text-red-500 block mt-1">Max allowed size is 10MB</span>
          {errors.attachment && <span className="text-[11px] text-red-500">{errors.attachment}</span>}
        </FormField>

        {/* Detail (Rich text editor) - Removed from Manage Finance Act */}
        {!isFinanceAct && (
          <FormField label="Detail">
            <div className="border border-theme-border rounded-lg overflow-hidden shadow-sm">
              <RichTextEditor
                key={`tc-detail-${editData?.mongoId || editData?.id || editData?.srNumber || `new-${nextSr || 1}`}`}
                name={`tc_detail_${editData?.mongoId || editData?.id || nextSr || 'new'}`}
                value={detail}
                onChange={(val) => setDetail(val)}
                placeholder={`Enter ${categoryTitle.toLowerCase()} details...`}
                minHeight={180}
              />
            </div>
          </FormField>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-theme-border">
          {isEdit ? (
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
          ) : <div />}
          <div className="flex items-center gap-2">
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
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Record' : 'Add Record')}
          </Button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default AddTaxCardForm;
