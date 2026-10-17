import React, { useState, useEffect, useRef } from 'react';
import { X, Scale, AlertCircle, Paperclip, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Check, ExternalLink } from 'lucide-react';
import Input from '../../../components/ui/Input';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import FormFooter from '../../../components/ui/FormFooter';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import DatePicker from '../../../components/ui/DatePicker';
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

const APEX_COURT_OPTIONS = [
  'Supreme Court of Pakistan',
  'Appellate Tribunal',
  'Federal Shariat Court',
  'High Court of Balochistan',
  'Islamabad High Court',
  'Lahore High Court',
  'Peshawar High Court',
  'Sindh High Court'
];

const APEX_STATUS_OPTIONS = [
  'Allowed',
  'Converted into Appeal',
  'Decided',
  'Dismissed',
  'Disposed of',
  'Leave Granted',
  'Leave Refused',
  'Pending'
];

const AddOtherCaseForm = ({
  editData = null,
  onClose,
  onSuccess,
  className = ""
}) => {
  const [currentId, setCurrentId] = useState(editData?.id || editData?.mongoId || null);
  const isEdit = Boolean(currentId || (editData && (editData.id || editData.mongoId)));
  const fileInputRef = useRef(null);

  // Column A: S.No.
  const [srNumber, setSrNumber] = useState(editData?.srNumber ? String(editData.srNumber) : '');
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [loadFeedback, setLoadFeedback] = useState(null);

  // Column B: Citation
  const [citation, setCitation] = useState('');

  // Column C: Case No.
  const [caseNo, setCaseNo] = useState('');

  // Column D: Case Year
  const [caseYear, setCaseYear] = useState('');

  // Column E: Parties
  const [parties, setParties] = useState('');

  // Column F: Order_Date
  const [orderDate, setOrderDate] = useState(getTodayDateString());

  // Column G: Head Notes/ Tag Line
  const [headNotes, setHeadNotes] = useState('');

  // Column H: Bench
  const [bench, setBench] = useState('');

  // Column I: Apex Court
  const [apexCourt, setApexCourt] = useState('');

  // Column J: Apex Status
  const [apexStatus, setApexStatus] = useState('');

  // Column K: Downloads (URL link + Document attachment)
  const [downloadLink, setDownloadLink] = useState('');
  const [attachment, setAttachment] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentSize, setAttachmentSize] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (editData) {
      setCurrentId(editData.id || editData.mongoId || null);
      setSrNumber(editData.srNumber ? String(editData.srNumber) : '');
      setCitation(editData.citation && editData.citation !== 'Nil' ? editData.citation : '');
      setCaseNo(editData.caseNo || '');
      setCaseYear(editData.caseYear ? String(editData.caseYear) : '');
      setParties(editData.parties || editData.caseTitle || '');
      setOrderDate(editData.orderDate || editData.judgmentDate || getTodayDateString());
      setHeadNotes(editData.headNotes || editData.notes || '');
      setBench(editData.bench || editData.authorJudge || '');
      setApexCourt(editData.apexCourt || '');
      setApexStatus(editData.apexStatus || '');
      setDownloadLink(editData.downloadLink && editData.downloadLink !== 'Nil' ? editData.downloadLink : '');
      setAttachment(editData.attachment || '');
      setAttachmentName(editData.attachmentName || '');
      setAttachmentSize(editData.attachmentSize || '');
    } else {
      setCurrentId(null);
      otherCaseService.getNextSr()
        .then(res => {
          if (res?.nextSr) setSrNumber(String(res.nextSr));
        })
        .catch(err => console.warn('Could not auto-fetch next Other Case SR #:', err));
      setCitation('');
      setCaseNo('');
      setCaseYear(String(new Date().getFullYear()));
      setParties('');
      setOrderDate(getTodayDateString());
      setHeadNotes('');
      setBench('');
      setApexCourt('');
      setApexStatus('');
      setDownloadLink('');
      setAttachment('');
      setAttachmentName('');
      setAttachmentSize('');
    }
    setErrors({});
    setServerError('');
  }, [editData]);

  const loadOtherCaseBySr = async (targetSr) => {
    const clean = String(targetSr ?? srNumber ?? '').trim();
    if (!clean) return;

    setLoadingRecord(true);
    setLoadFeedback(null);
    try {
      const data = await otherCaseService.getOtherCaseById(clean);
      if (data) {
        setCurrentId(data.id || data.mongoId || data._id);
        setSrNumber(data.srNumber ? String(data.srNumber) : clean);
        setCitation(data.citation && data.citation !== 'Nil' ? data.citation : '');
        setCaseNo(data.caseNo || '');
        setCaseYear(data.caseYear ? String(data.caseYear) : '');
        setParties(data.parties || data.caseTitle || '');
        setOrderDate(data.orderDate || data.judgmentDate || getTodayDateString());
        setHeadNotes(data.headNotes || data.notes || '');
        setBench(data.bench || data.authorJudge || '');
        setApexCourt(data.apexCourt || '');
        setApexStatus(data.apexStatus || '');
        setDownloadLink(data.downloadLink && data.downloadLink !== 'Nil' ? data.downloadLink : '');
        setAttachment(data.attachment || '');
        setAttachmentName(data.attachmentName || '');
        setAttachmentSize(data.attachmentSize || '');
        setLoadFeedback({
          type: 'success',
          message: `S.No #${clean} loaded: ${data.caseNo || 'Case Record'}`
        });
      }
    } catch (err) {
      setCurrentId(null);
      setSrNumber(clean);
      setLoadFeedback({
        type: 'notFound',
        message: `S.No #${clean} not found. Ready to create new entry.`
      });
    } finally {
      setLoadingRecord(false);
      setTimeout(() => setLoadFeedback(null), 6000);
    }
  };

  const handleStepSr = (delta) => {
    const currentNum = parseInt(srNumber || '1', 10);
    const nextNum = Math.max(1, (isNaN(currentNum) ? 1 : currentNum) + delta);
    setSrNumber(String(nextNum));
    loadOtherCaseBySr(nextNum);
  };

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
    if (!parties.trim()) newErrors.parties = 'Parties name is required';
    if (!orderDate) newErrors.orderDate = 'Order Date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const targetSr = srNumber ? Number(srNumber) : (editData?.srNumber ? Number(editData.srNumber) : undefined);
      let targetId = currentId || (editData && (editData.mongoId || editData.id || editData.otherCaseId));
      if (!targetId && targetSr) {
        try {
          const existing = await otherCaseService.getOtherCaseById(targetSr);
          if (existing?.id || existing?.mongoId || existing?.otherCaseId || existing?._id) {
            targetId = existing.mongoId || existing.id || existing._id || existing.otherCaseId;
            setCurrentId(targetId);
          }
        } catch {
          // not found as existing record
        }
      }

      const payload = {
        srNumber: targetSr,
        citation: citation.trim(),
        caseNo: caseNo.trim(),
        caseYear: caseYear ? Number(caseYear) : undefined,
        parties: parties.trim(),
        caseTitle: parties.trim(),
        orderDate: orderDate.trim(),
        judgmentDate: orderDate.trim(),
        headNotes: headNotes.trim(),
        notes: headNotes.trim(),
        bench: bench.trim(),
        authorJudge: bench.trim(),
        apexCourt: apexCourt.trim(),
        apexStatus: apexStatus.trim(),
        downloadLink: downloadLink.trim(),
        attachment,
        attachmentName,
        attachmentSize
      };

      let result;
      if (targetId) {
        result = await otherCaseService.updateOtherCase(targetId, payload);
        if (targetSr) {
          setSrNumber(String(targetSr));
        }
      } else {
        result = await otherCaseService.createOtherCase(payload);
      }

      if (onSuccess) {
        onSuccess(result, isEdit ? 'Case law record updated successfully.' : 'Case law record added successfully.');
      }
      if (onClose) onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to save case record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden animate-fade-in relative ${className}`}>
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-theme-border bg-gray-50/70 dark:bg-theme-surface-alt/40">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 text-xs font-semibold text-theme-muted hover:text-theme-main bg-white dark:bg-theme-surface border border-theme-border rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs mr-1"
              title="Back to list"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <Scale className="w-4 h-4 text-brand-orange" />
          <h2 className="text-sm font-semibold text-theme-main">
            {isEdit ? 'Edit Other Case Law Record' : 'Add Other Case Law Entry'}
          </h2>
          {srNumber && (
            <span className="text-xs font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
              S.No. #{srNumber}
            </span>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-theme-main dark:hover:text-white transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
          >
            <span>Close</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Form Body - Blocks matched 1:1 with Table Columns */}
      <form id="other-case-form" onSubmit={handleSubmit} className="p-4 space-y-4">
        {serverError && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* BLOCK 1: Table Columns A, B, C, D — S.No. | Citation | Case No. | Case Year */}
        <div className="border border-theme-border/70 rounded-xl p-3.5 bg-theme-surface-alt/20 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1.5 border-b border-theme-border/50 pb-1.5">
            <span className="w-1.5 h-3 bg-brand-orange rounded-full inline-block"></span>
            <span>Case Identification & Filing (Columns A – D)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            {/* Column A: S.No. */}
            <div className="sm:col-span-4">
              <FormField label="S.No." required>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Input
                      inputSize="sm"
                      value={srNumber}
                      onChange={(e) => setSrNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          loadOtherCaseBySr(e.currentTarget.value);
                        }
                      }}
                      placeholder="e.g. 1"
                    />
                    {loadingRecord && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Previous Record"
                      onClick={() => handleStepSr(-1)}
                      disabled={loadingRecord}
                      className="p-1.5 h-[34px] w-[34px] flex items-center justify-center rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Next Record"
                      onClick={() => handleStepSr(1)}
                      disabled={loadingRecord}
                      className="p-1.5 h-[34px] w-[34px] flex items-center justify-center rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => loadOtherCaseBySr()}
                      disabled={loadingRecord}
                      className="h-[34px] text-xs px-2.5 border border-brand-orange/40 text-brand-orange hover:bg-brand-orange/10 rounded-lg font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {loadingRecord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Load'}
                    </button>
                  </div>
                </div>
                {loadFeedback && (
                  <div className={`mt-1.5 text-[11px] font-medium flex items-center gap-1 transition-all ${
                    loadFeedback.type === 'success' ? 'text-green-600 dark:text-green-400' :
                    loadFeedback.type === 'notFound' ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-500'
                  }`}>
                    {loadFeedback.type === 'success' && <Check className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{loadFeedback.message}</span>
                  </div>
                )}
              </FormField>
            </div>

            {/* Column B: Citation */}
            <div className="sm:col-span-3">
              <FormField label="Citation">
                <Input
                  inputSize="sm"
                  value={citation}
                  onChange={(e) => setCitation(e.target.value)}
                  placeholder="e.g. 2026 SCMR 123"
                />
              </FormField>
            </div>

            {/* Column C: Case No. */}
            <div className="sm:col-span-3">
              <FormField label="Case No." required>
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
            </div>

            {/* Column D: Case Year */}
            <div className="sm:col-span-2">
              <FormField label="Case Year">
                <Input
                  inputSize="sm"
                  type="number"
                  value={caseYear}
                  onChange={(e) => setCaseYear(e.target.value)}
                  placeholder="e.g. 2026"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* BLOCK 2: Table Columns E, F, H — Parties | Order_Date | Bench */}
        <div className="border border-theme-border/70 rounded-xl p-3.5 bg-theme-surface-alt/20 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1.5 border-b border-theme-border/50 pb-1.5">
            <span className="w-1.5 h-3 bg-brand-orange rounded-full inline-block"></span>
            <span>Parties, Date & Bench (Columns E, F, H)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            {/* Column E: Parties */}
            <div className="sm:col-span-6">
              <FormField label="Parties" required>
                <Input
                  inputSize="sm"
                  value={parties}
                  onChange={(e) => {
                    setParties(e.target.value);
                    if (errors.parties) setErrors(prev => ({ ...prev, parties: null }));
                  }}
                  placeholder="e.g. Nadar Khan v. The State through Advocate General..."
                  error={Boolean(errors.parties)}
                />
                {errors.parties && <span className="text-[11px] text-red-500">{errors.parties}</span>}
              </FormField>
            </div>

            {/* Column F: Order_Date */}
            <div className="sm:col-span-3">
              <FormField label="Order_Date" required>
                <DatePicker
                  selectedDate={orderDate}
                  onChange={(val) => {
                    setOrderDate(val);
                    if (errors.orderDate) setErrors(prev => ({ ...prev, orderDate: null }));
                  }}
                  placeholder="Order Date"
                  className="w-full"
                />
                {errors.orderDate && <span className="text-[11px] text-red-500">{errors.orderDate}</span>}
              </FormField>
            </div>

            {/* Column H: Bench */}
            <div className="sm:col-span-3">
              <FormField label="Bench">
                <Input
                  inputSize="sm"
                  value={bench}
                  onChange={(e) => setBench(e.target.value)}
                  placeholder="e.g. Mr. Justice Aqeel Ahmed Abbasi"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* BLOCK 3: Table Columns I, J — Apex Court | Apex Status */}
        <div className="border border-theme-border/70 rounded-xl p-3.5 bg-theme-surface-alt/20 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1.5 border-b border-theme-border/50 pb-1.5">
            <span className="w-1.5 h-3 bg-brand-orange rounded-full inline-block"></span>
            <span>Superior Court Forum & Status (Columns I, J)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            {/* Column I: Apex Court */}
            <FormField label="Apex Court">
              <div className="relative">
                <Input
                  inputSize="sm"
                  list="apex-court-list"
                  value={apexCourt}
                  onChange={(e) => setApexCourt(e.target.value)}
                  placeholder="Select or enter court (e.g. Supreme Court of Pakistan)"
                />
                <datalist id="apex-court-list">
                  {APEX_COURT_OPTIONS.map(opt => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </div>
            </FormField>

            {/* Column J: Apex Status */}
            <FormField label="Apex Status">
              <div className="relative">
                <Input
                  inputSize="sm"
                  list="apex-status-list"
                  value={apexStatus}
                  onChange={(e) => setApexStatus(e.target.value)}
                  placeholder="Select or enter status (e.g. Disposed of, Allowed)"
                />
                <datalist id="apex-status-list">
                  {APEX_STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </div>
            </FormField>
          </div>
        </div>

        {/* BLOCK 4: Table Column G — Head Notes/ Tag Line */}
        <div className="border border-theme-border/70 rounded-xl p-3.5 bg-theme-surface-alt/20 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1.5 border-b border-theme-border/50 pb-1.5">
            <span className="w-1.5 h-3 bg-brand-orange rounded-full inline-block"></span>
            <span>Head Notes/ Tag Line (Column G)</span>
          </div>

          <FormField label="Head Notes/ Tag Line">
            <div className="border border-theme-border rounded-lg overflow-hidden shadow-sm bg-white dark:bg-theme-surface">
              <RichTextEditor
                value={headNotes}
                onChange={(val) => setHeadNotes(val)}
                placeholder="Enter head notes, summary, legal points, or tag line..."
                minHeight={150}
              />
            </div>
          </FormField>
        </div>

        {/* BLOCK 5: Table Column K — Downloads (Download Link & PDF Attachment) */}
        <div className="border border-theme-border/70 rounded-xl p-3.5 bg-theme-surface-alt/20 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1.5 border-b border-theme-border/50 pb-1.5">
            <span className="w-1.5 h-3 bg-brand-orange rounded-full inline-block"></span>
            <span>Downloads (Column K)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <FormField label="Download Link (External URL)">
              <div className="relative">
                <Input
                  inputSize="sm"
                  value={downloadLink}
                  onChange={(e) => setDownloadLink(e.target.value)}
                  placeholder="https://... or certified order URL"
                />
                {downloadLink && (
                  <a
                    href={downloadLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-muted hover:text-brand-orange"
                    title="Open link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <span className="text-[10px] text-theme-muted block mt-1">Direct link will appear in the table Downloads column</span>
            </FormField>

            <FormField label="Attachment File (PDF, DOCX)">
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
                  className="px-3 h-[34px] bg-[#00bcd4] hover:bg-[#00acc1] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Choose File
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
                    className="text-gray-400 hover:text-red-500 p-0.5 cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="text-[10px] text-theme-muted block mt-1">Supported: PDF, DOC, DOCX up to 10MB</span>
              {errors.attachment && <span className="text-[11px] text-red-500">{errors.attachment}</span>}
            </FormField>
          </div>
        </div>

      </form>

      {/* Floating and Static Form Footer */}
      <FormFooter
        formId="other-case-form"
        onCancel={onClose}
        isSubmitting={isSubmitting}
        submitText={isEdit ? "Update Case Record" : "Add Record"}
      />

    </div>
  );
};

export default AddOtherCaseForm;
