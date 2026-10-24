import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, AlertCircle, Paperclip, CheckCircle2, ChevronRight } from 'lucide-react';
import Input from '../../../components/ui/Input';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import { whatsappService } from '../services/whatsappService';

const formatDateForDateInput = (val) => {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return s;
};

const AddWhatsappForm = ({
  editData = null,
  latestEntry = null,
  lastSavedDate = '',
  onClose,
  onSuccess,
  className = ""
}) => {
  const [currentEditData, setCurrentEditData] = useState(editData);
  const isEdit = Boolean(currentEditData && (currentEditData.id || currentEditData.mongoId));
  const fileInputRef = useRef(null);
  const headingInputRef = useRef(null);

  const resolveInitialDate = () => {
    if (editData?.dated || editData?.date) {
      return formatDateForDateInput(editData.dated || editData.date);
    }
    const candidate = lastSavedDate || latestEntry?.dated || latestEntry?.date;
    if (candidate) {
      return formatDateForDateInput(candidate);
    }
    return '';
  };

  const resolveInitialSr = () => {
    if (editData?.srNumber) return String(editData.srNumber);
    if (latestEntry?.srNumber) return String(Number(latestEntry.srNumber) + 1);
    return '';
  };

  const [srNumber, setSrNumber] = useState(resolveInitialSr());
  const [heading, setHeading] = useState('');
  const [dated, setDated] = useState(resolveInitialDate());
  const [attachment, setAttachment] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Initial load or when editData/latestEntry/lastSavedDate prop changes
  useEffect(() => {
    setCurrentEditData(editData);
    if (editData) {
      setSrNumber(editData.srNumber ? String(editData.srNumber) : String(editData.id || ''));
      setHeading(editData.heading || '');
      setDated(formatDateForDateInput(editData.dated || editData.date));
      setAttachment(editData.attachment || '');
      setAttachmentName(editData.attachmentName || '');
    } else {
      setHeading('');
      setAttachment('');
      setAttachmentName('');

      // Pick date of last entry immediately from props
      const immediateDate = formatDateForDateInput(lastSavedDate || latestEntry?.dated || latestEntry?.date);
      if (immediateDate) {
        setDated(immediateDate);
      }
      if (latestEntry?.srNumber) {
        setSrNumber(String(Number(latestEntry.srNumber) + 1));
      }

      // Authoritative fallback from backend /next-sr
      whatsappService.getNextSr()
        .then((res) => {
          const sSr = res?.nextSr ?? res?.data?.nextSr;
          const sDate = res?.lastDated ?? res?.data?.lastDated;
          if (sSr) setSrNumber(String(sSr));
          if (sDate) {
            setDated(formatDateForDateInput(sDate));
          }
        })
        .catch((err) => {
          console.warn('[AddWhatsappForm] Could not fetch next SR:', err);
        });
    }
    setErrors({});
    setServerError('');
    setSuccessBanner('');
  }, [editData, latestEntry, lastSavedDate]);

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
    if (!heading.trim()) newErrors.heading = 'Heading is required';
    if (!dated) newErrors.dated = 'Dated is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (advanceNext = true) => {
    setServerError('');
    setSuccessBanner('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const savedDate = dated.trim();
      const currentSrNum = Number(srNumber) || 1;
      const nextSrNum = currentSrNum + 1;

      const payload = {
        heading: heading.trim(),
        dated: savedDate,
        attachment,
        attachmentName,
        srNumber: currentSrNum
      };

      let result;
      if (isEdit) {
        const targetId = currentEditData.mongoId || currentEditData.id || currentEditData.whatsappId || currentSrNum;
        result = await whatsappService.updateUpdate(targetId, payload);
      } else {
        result = await whatsappService.createUpdate(payload);
      }

      const successMsg = isEdit 
        ? `SR #${currentSrNum} updated successfully.` 
        : `SR #${currentSrNum} added successfully.`;

      if (advanceNext) {
        // Advance to next SR# and keep the last saved date!
        if (isEdit) {
          // Check if the next record exists in database
          try {
            const nextRecord = await whatsappService.getUpdateById(nextSrNum);
            if (nextRecord) {
              setCurrentEditData(nextRecord);
              setSrNumber(String(nextRecord.srNumber || nextSrNum));
              setHeading(nextRecord.heading || '');
              setDated(nextRecord.dated || nextRecord.date || savedDate);
              setAttachment(nextRecord.attachment || '');
              setAttachmentName(nextRecord.attachmentName || '');
              setSuccessBanner(`SR #${currentSrNum} updated! Advanced to edit SR #${nextSrNum}.`);
            } else {
              // Transition to Add new record for next SR#
              setCurrentEditData(null);
              setSrNumber(String(nextSrNum));
              setHeading('');
              setDated(savedDate);
              setAttachment('');
              setAttachmentName('');
              setSuccessBanner(`SR #${currentSrNum} updated! Ready for new entry at SR #${nextSrNum}.`);
            }
          } catch {
            setCurrentEditData(null);
            setSrNumber(String(nextSrNum));
            setHeading('');
            setDated(savedDate);
            setAttachment('');
            setAttachmentName('');
            setSuccessBanner(`SR #${currentSrNum} updated! Ready for new entry at SR #${nextSrNum}.`);
          }
        } else {
          // In Add mode: Advance to next SR# and keep last saved date!
          setSrNumber(String(nextSrNum));
          setHeading('');
          setDated(savedDate);
          setAttachment('');
          setAttachmentName('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          setSuccessBanner(`SR #${currentSrNum} saved! Advanced to SR #${nextSrNum} (Date: ${savedDate}).`);
        }

        if (headingInputRef.current) {
          setTimeout(() => headingInputRef.current?.focus(), 50);
        }

        if (onSuccess) {
          onSuccess(result, successMsg, { keepOpen: true });
        }
      } else {
        // Save and close
        if (onSuccess) {
          onSuccess(result, successMsg, { keepOpen: false });
        }
        if (onClose) onClose();
      }
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to save record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden animate-fade-in ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-theme-border bg-gray-50/70 dark:bg-theme-surface-alt/40">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-orange" />
          <h2 className="text-sm font-semibold text-theme-main flex items-center gap-2">
            <span>{isEdit ? 'Edit Whatsapp Update' : 'Add Whatsapp Update'}</span>
            {srNumber && (
              <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950/60 text-[#f15a24] font-bold text-xs rounded-full">
                SR #{srNumber}
              </span>
            )}
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

      {/* Form Body */}
      <form onSubmit={(e) => { e.preventDefault(); handleSave(true); }} className="p-4 space-y-3">
        {serverError && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {successBanner && (
          <div className="p-2.5 bg-green-50 dark:bg-green-950/30 border border-green-200 text-green-700 dark:text-green-400 rounded-lg text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
            <span className="font-medium">{successBanner}</span>
          </div>
        )}

        {/* Row 1: SR# and Heading */}
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <div className="sm:col-span-1">
            <FormField label="SR #">
              <Input
                type="number"
                inputSize="sm"
                value={srNumber}
                onChange={(e) => setSrNumber(e.target.value)}
                placeholder="Auto"
                className="font-bold text-brand-orange"
              />
            </FormField>
          </div>

          <div className="sm:col-span-5">
            <FormField label="Heading" required>
              <Input
                ref={headingInputRef}
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
          </div>
        </div>

        {/* Row 2: Dated * and Attachment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">Optional. Max allowed size 5MB.</span>
          </FormField>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-theme-border">
          <div className="text-[11px] text-slate-400">
            <span>After saving, automatically advances to next SR # carrying forward the date.</span>
          </div>

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
                Close
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="h-[34px] px-3.5 text-xs text-slate-700 dark:text-slate-300"
            >
              {isSubmitting ? 'Saving...' : (isEdit ? 'Update & Close' : 'Save & Close')}
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#00bcd4] hover:bg-[#00acc1] text-white h-[34px] px-5 text-xs font-medium flex items-center gap-1.5 shadow-xs"
            >
              <span>{isSubmitting ? 'Saving...' : (isEdit ? 'Update + Next' : 'Save + Next')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default AddWhatsappForm;
