import React, { useState, useEffect, useRef } from 'react';
import { X, Scale, AlertCircle, Paperclip } from 'lucide-react';
import Input from '../../../components/ui/Input';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import { otherCaseService } from '../services/otherCaseService';

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const AddOtherCaseForm = ({
  editData = null,
  onClose,
  onSuccess,
  className = ""
}) => {
  const isEdit = Boolean(editData && (editData.id || editData.mongoId));
  const fileInputRef = useRef(null);

  const [caseNo, setCaseNo] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [scCitation, setScCitation] = useState('');
  const [citation, setCitation] = useState('');
  const [judgmentDate, setJudgmentDate] = useState(getTodayDateString());
  const [orderPriority, setOrderPriority] = useState('');
  const [authorJudge, setAuthorJudge] = useState('');
  const [attachment, setAttachment] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentSize, setAttachmentSize] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (editData) {
      setCaseNo(editData.caseNo || '');
      setCaseTitle(editData.caseTitle || '');
      setScCitation(editData.scCitation || '');
      setCitation(editData.citation || '');
      setJudgmentDate(editData.judgmentDate || getTodayDateString());
      setOrderPriority(editData.orderPriority ? editData.orderPriority.toString() : '');
      setAuthorJudge(editData.authorJudge || '');
      setAttachment(editData.attachment || '');
      setAttachmentName(editData.attachmentName || '');
      setAttachmentSize(editData.attachmentSize || '');
      setNotes(editData.notes || '');
    } else {
      setCaseNo('');
      setCaseTitle('');
      setScCitation('');
      setCitation('');
      setJudgmentDate(getTodayDateString());
      setOrderPriority('');
      setAuthorJudge('');
      setAttachment('');
      setAttachmentName('');
      setAttachmentSize('');
      setNotes('');
    }
    setErrors({});
    setServerError('');
  }, [editData]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, attachment: 'File size exceeds 10MB limit.' }));
      return;
    }

    setAttachmentName(file.name);
    setAttachmentSize(formatFileSize(file.size));
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment(reader.result);
      setErrors(prev => ({ ...prev, attachment: null }));
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors = {};
    if (!caseNo.trim()) newErrors.caseNo = 'Case No is required';
    if (!caseTitle.trim()) newErrors.caseTitle = 'Case Title is required';
    if (!judgmentDate) newErrors.judgmentDate = 'Judgment Date is required';
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
        caseNo: caseNo.trim(),
        caseTitle: caseTitle.trim(),
        scCitation: scCitation.trim(),
        citation: citation.trim(),
        judgmentDate: judgmentDate.trim(),
        orderPriority: orderPriority.trim(),
        authorJudge: authorJudge.trim(),
        attachment,
        attachmentName,
        attachmentSize,
        notes
      };

      let result;
      if (isEdit) {
        const targetId = editData.mongoId || editData.id || editData.otherCaseId;
        result = await otherCaseService.updateOtherCase(targetId, payload);
      } else {
        result = await otherCaseService.createOtherCase(payload);
      }

      if (onSuccess) {
        onSuccess(result, isEdit ? 'Case law updated successfully.' : 'Case law record added successfully.');
      }
      if (onClose) onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to save case record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden animate-fade-in ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-theme-border bg-gray-50/70 dark:bg-theme-surface-alt/40">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-brand-orange" />
          <h2 className="text-sm font-semibold text-theme-main">
            {isEdit ? 'Edit Case Law Detail' : 'Add Other Case Law Detail'}
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
      <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
        {serverError && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Row 1: Case No * & Case Title * */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Case No" required>
            <Input
              inputSize="sm"
              value={caseNo}
              onChange={(e) => {
                setCaseNo(e.target.value);
                if (errors.caseNo) setErrors(prev => ({ ...prev, caseNo: null }));
              }}
              placeholder="e.g. Crl.P.L.A.187-P/2026"
              error={Boolean(errors.caseNo)}
              autoFocus
            />
            {errors.caseNo && <span className="text-[11px] text-red-500">{errors.caseNo}</span>}
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Case Title" required>
              <Input
                inputSize="sm"
                value={caseTitle}
                onChange={(e) => {
                  setCaseTitle(e.target.value);
                  if (errors.caseTitle) setErrors(prev => ({ ...prev, caseTitle: null }));
                }}
                placeholder="e.g. Nadar Khan v. The State through Advocate General..."
                error={Boolean(errors.caseTitle)}
              />
              {errors.caseTitle && <span className="text-[11px] text-red-500">{errors.caseTitle}</span>}
            </FormField>
          </div>
        </div>

        {/* Row 2: Citations and Judgment Date */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <FormField label="SC Citation">
            <Input
              inputSize="sm"
              value={scCitation}
              onChange={(e) => setScCitation(e.target.value)}
              placeholder="e.g. 2026 SCP 244"
            />
          </FormField>

          <FormField label="General Citation">
            <Input
              inputSize="sm"
              value={citation}
              onChange={(e) => setCitation(e.target.value)}
              placeholder="e.g. 2026 SCMR 123"
            />
          </FormField>

          <FormField label="Judgment Date" required>
            <Input
              type="date"
              inputSize="sm"
              value={judgmentDate}
              onChange={(e) => {
                setJudgmentDate(e.target.value);
                if (errors.judgmentDate) setErrors(prev => ({ ...prev, judgmentDate: null }));
              }}
              error={Boolean(errors.judgmentDate)}
            />
            {errors.judgmentDate && <span className="text-[11px] text-red-500">{errors.judgmentDate}</span>}
          </FormField>

          <FormField label="Priority / Order #">
            <Input
              inputSize="sm"
              value={orderPriority}
              onChange={(e) => setOrderPriority(e.target.value)}
              placeholder="e.g. 1, 2, 3..."
            />
          </FormField>
        </div>

        {/* Row 3: Author Judge & Attachment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Author Judge">
            <Input
              inputSize="sm"
              value={authorJudge}
              onChange={(e) => setAuthorJudge(e.target.value)}
              placeholder="e.g. Mr. Justice Aqeel Ahmed Abbasi"
            />
          </FormField>

          <FormField label="Judgment PDF Attachment">
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx"
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
                Choose PDF
              </button>
              <span className="text-xs text-theme-muted truncate max-w-[180px]">
                {attachmentName ? `${attachmentName} (${attachmentSize})` : 'No file chosen'}
              </span>
              {attachmentName && (
                <button
                  type="button"
                  onClick={() => {
                    setAttachment('');
                    setAttachmentName('');
                    setAttachmentSize('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-gray-400 hover:text-red-500 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <span className="text-[10px] text-theme-muted block mt-1">Accepted: PDF, DOCX up to 10MB</span>
            {errors.attachment && <span className="text-[11px] text-red-500">{errors.attachment}</span>}
          </FormField>
        </div>

        {/* Notes / Headnotes */}
        <FormField label="Headnotes / Summary / Important Notes">
          <div className="border border-theme-border rounded-lg overflow-hidden shadow-sm">
            <RichTextEditor
              value={notes}
              onChange={(val) => setNotes(val)}
              placeholder="Enter case law notes or summary..."
              minHeight={150}
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
            className="bg-[#00bcd4] hover:bg-[#00acc1] text-white h-[34px] px-5 text-xs font-medium cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Record' : 'Add Record')}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default AddOtherCaseForm;
