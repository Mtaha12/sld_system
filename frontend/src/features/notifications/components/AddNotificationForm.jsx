import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, CheckCircle2, Paperclip, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Check, Plus, Trash2, Eye } from 'lucide-react';

import Input from '../../../components/ui/Input';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import FormSection from '../../../components/ui/FormSection';
import FormField from '../../../components/ui/FormField';
import FormFooter from '../../../components/ui/FormFooter';
import SearchableSectionSelect from '../../../components/ui/SearchableSectionSelect';
import SearchableCombobox from '../../../components/ui/SearchableCombobox';
import { notificationSchema } from '../validation/notificationSchema';
import { notificationService } from '../services/notificationService';
import { settingService } from '../../../services/settingService';
import { ALL_SECTIONS } from '../../../data/sections';

/* ── Format date to YYYY-MM-DD for native input ────────────────── */
const formatDateForInput = (val) => {
  if (!val) return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d.getTime())) return typeof val === 'string' ? val : '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/* ── Compact inline file-chooser with View and Remove actions ─────── */
const CompactFileButton = ({ value, onChange }) => {
  const ref = useRef(null);
  const files = Array.isArray(value) ? value : (value ? [value] : []);

  const handleViewFile = (f) => {
    if (!f) return;
    let url = '';
    if (typeof f === 'string') {
      url = f.startsWith('http') || f.startsWith('data:') || f.startsWith('blob:') ? f : `/uploads/${f}`;
    } else if (f instanceof File) {
      url = URL.createObjectURL(f);
    } else if (f.url) {
      url = f.url;
    } else if (f.name) {
      url = `/uploads/${f.name}`;
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <input
        ref={ref}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv,.xlsx"
        className="hidden"
        onChange={async (e) => {
          const incomingFiles = Array.from(e.target.files || []);
          const readPromises = incomingFiles.map(file => {
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                resolve({
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  url: reader.result
                });
              };
              reader.onerror = () => {
                resolve({ name: file.name, size: file.size });
              };
              reader.readAsDataURL(file);
            });
          });
          const processed = await Promise.all(readPromises);
          const merged = [
            ...files,
            ...processed.filter(f => !files.some(x => (x.name || x) === f.name))
          ];
          onChange(merged);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex items-center gap-1.5 px-3 h-[38px] w-full rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-xs font-medium text-theme-main transition-colors"
      >
        <Paperclip className="w-3.5 h-3.5 text-brand-orange shrink-0" />
        <span className="truncate">{files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'Choose File'}</span>
      </button>
      {files.length > 0 && (
        <div className="space-y-0.5 max-h-20 overflow-y-auto">
          {files.map((f, i) => {
            const fileName = typeof f === 'string' ? f : (f.name || `File ${i + 1}`);
            return (
              <div key={i} className="flex items-center justify-between gap-1 px-2 py-0.5 rounded text-[10px] bg-theme-surface-alt border border-theme-border/60">
                <span className="truncate text-theme-muted max-w-[120px]" title={fileName}>{fileName}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewFile(f)}
                    className="text-brand-orange hover:text-orange-600 p-0.5"
                    title="View file in new window"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                    className="text-red-500 hover:text-red-700 p-0.5"
                    title="Remove file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── Helpers to format paragraphs and word layout ────────────────── */
const formatNotificationParagraphs = (html) => {
  if (!html) return '';
  return html
    .replace(/(<(?:p|div)[^>]*>)\s*(\(\d+\)|\d+\.)\s*/gi, '$1&nbsp;&nbsp;&nbsp;&nbsp;<b>$2</b> ')
    .replace(/(<br\s*\/?>)\s*(\(\d+\)|\d+\.)\s*/gi, '$1&nbsp;&nbsp;&nbsp;&nbsp;<b>$2</b> ')
    .replace(/\s+/g, ' ');
};

const AddNotificationForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isEdit = Boolean(location.state?.isEdit);
  const editData = location.state?.notificationData;

  const [showSuccess, setShowSuccess] = useState(false);
  const [lawOptions, setLawOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState(ALL_SECTIONS || []);

  const isSaveAndNextRef = useRef(false);

  const normalizeDepartment = (dept) => {
    const d = String(dept || '').trim().toLowerCase();
    if (d === 'notifications' || d === 'notification' || !d) return 'notification';
    return d;
  };

  const defaultValues = {
    srNumber: editData?.srNumber?.toString() || '',
    department: normalizeDepartment(editData?.department),
    subDepartment: editData?.subDepartment || 'federal',
    year: editData?.year?.toString() || '2026',
    number: editData?.number?.toString() || '14',
    sroNumber: editData?.sroNumber || '',
    subject: editData?.subject || '',
    status: editData?.status?.toLowerCase() || 'active',
    lawStatute: editData?.lawStatute || '',
    section: editData?.section || '',
    laws: Array.isArray(editData?.laws) && editData.laws.length > 0 
      ? editData.laws 
      : [{ lawStatute: editData?.lawStatute || '', section: editData?.section || '' }],
    blocks: (() => {
      const empty1 = { id: 'new-block-1', date: '', detail: '', attachments: [] };
      if (!isEdit) return [empty1];
      
      const existingFilled = (editData?.blocks || []).filter(b => {
        const hasDetail = b.detail && b.detail.replace(/<[^>]*>?/gm, '').trim() !== '';
        const hasDate = b.date !== null && b.date !== '' && b.date !== undefined;
        const hasAttachments = Array.isArray(b.attachments) && b.attachments.length > 0;
        return hasDetail || hasDate || hasAttachments;
      }).map((b, i) => ({
        id: b._id || `existing-${i}`,
        date: formatDateForInput(b.date),
        detail: formatNotificationParagraphs(b.detail || ''),
        attachments: b.attachments || []
      }));
      
      return existingFilled.length > 0 ? existingFilled : [empty1];
    })()
  };

  const [currentRecordId, setCurrentRecordId] = useState(editData?.id || editData?._id || null);
  const [autoNewSr, setAutoNewSr] = useState('');
  const [loadingNotification, setLoadingNotification] = useState(false);
  const [loadFeedback, setLoadFeedback] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues,
  });

  const loadNotificationBySr = React.useCallback(async (targetSr) => {
    const cleanSr = String(targetSr ?? getValues('srNumber') ?? '').trim();
    if (!cleanSr) return;

    setLoadingNotification(true);
    setLoadFeedback(null);

    try {
      const data = await notificationService.getNotificationById(cleanSr);
      if (data) {
        setCurrentRecordId(data._id || data.id);
        setValue('srNumber', String(data.srNumber || cleanSr));
        setValue('department', normalizeDepartment(data.department));
        setValue('subDepartment', data.subDepartment || 'federal');
        setValue('year', String(data.year || '2026'));
        setValue('number', String(data.number || '14'));
        setValue('sroNumber', data.sroNumber || '');
        setValue('subject', data.subject || '');
        setValue('status', data.status?.toLowerCase() || 'active');
        setValue('lawStatute', data.lawStatute || '');
        setValue('section', data.section || '');
        if (Array.isArray(data.laws) && data.laws.length > 0) {
          setValue('laws', data.laws);
        } else {
          setValue('laws', [{ lawStatute: data.lawStatute || '', section: data.section || '' }]);
        }
        if (Array.isArray(data.blocks) && data.blocks.length > 0) {
          setValue('blocks', data.blocks.map((b, i) => ({
            id: b._id || `existing-${i}`,
            date: formatDateForInput(b.date),
            detail: formatNotificationParagraphs(b.detail || ''),
            attachments: b.attachments || []
          })));
        } else {
          setValue('blocks', [{ id: 'new-block-1', date: '', detail: '', attachments: [] }]);
        }
        setLoadFeedback({
          type: 'success',
          message: `SR #${cleanSr} loaded: ${data.subject ? (data.subject.slice(0, 32) + '...') : 'Notification Record'}`
        });
      }
    } catch (err) {
      console.warn(`[Notification Load] SR #${cleanSr} lookup notice:`, err?.response?.data?.message || err.message);
      // Not found in database — keep SR and allow creating new record
      setCurrentRecordId(null);
      setValue('srNumber', cleanSr);
      // Reset blocks to fresh 1 block with no attachments from previous record
      setValue('blocks', [{ id: 'new-block-1', date: '', detail: '', attachments: [] }]);
      setLoadFeedback({
        type: 'notFound',
        message: `SR #${cleanSr} not found in database. Ready to create new notification.`
      });
    } finally {
      setLoadingNotification(false);
      setTimeout(() => setLoadFeedback(null), 6000);
    }
  }, [getValues, setValue]);

  const handleStepSr = (delta) => {
    const rawVal = getValues('srNumber');
    const currentNum = parseInt(rawVal || '1', 10);
    const nextNum = Math.max(1, (isNaN(currentNum) ? 1 : currentNum) + delta);
    setValue('srNumber', String(nextNum));
    loadNotificationBySr(nextNum);
  };

  useEffect(() => {
    let isMounted = true;
    settingService.getLaws({ status: 'active', limit: 5000 })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data)) {
          const sorted = res.data
            .map(l => l.name)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
          setLawOptions(sorted);
        }
      })
      .catch(err => {
        console.warn('Could not load dynamic laws for AddNotificationForm:', err);
      });

    settingService.getSections({ status: 'active', limit: 30000 })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const names = res.data.map(s => s.name).filter(Boolean);
          const combined = Array.from(new Set([...names, ...(ALL_SECTIONS || [])])).sort((a, b) =>
            String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
          );
          setSectionOptions(combined);
        }
      })
      .catch(err => {
        console.warn('Could not load dynamic sections for AddNotificationForm:', err);
      });

    notificationService.getNextSr()
      .then(res => {
        if (isMounted && res?.nextSr) {
          const fetchedNext = String(res.nextSr);
          setAutoNewSr(fetchedNext);
          if (!isEdit && !editData?.srNumber) {
            setValue('srNumber', fetchedNext, { shouldDirty: false });
          }
        }
      })
      .catch(err => {
        console.warn('Could not auto-fetch next Notification SR #:', err);
      });

    return () => { isMounted = false; };
  }, [isEdit, editData, setValue]);

  const memoizedLawOptions = useMemo(() => (
    lawOptions.slice(0, 1000).map((lawName, idx) => (
      <option key={idx} value={lawName} />
    ))
  ), [lawOptions]);

  const sectionSelectOptions = useMemo(() => [
    { value: '', label: 'Select Section' },
    ...sectionOptions.map(s => ({
      value: String(s),
      label: String(s).startsWith('Section') ? String(s) : `Section ${s}`
    }))
  ], [sectionOptions]);

  const { fields: blockFields, append: appendBlock, remove: removeBlock } = useFieldArray({
    control,
    name: 'blocks'
  });

  const { fields: lawFields, append: appendLaw, remove: removeLaw } = useFieldArray({
    control,
    name: 'laws'
  });

  const onSubmit = async (data) => {
    const isNext = isSaveAndNextRef.current;
    isSaveAndNextRef.current = false;

    // Filter out completely empty blocks before saving
    data.blocks = (data.blocks || []).filter(b => {
      const hasDetail = b.detail && b.detail.replace(/<[^>]*>?/gm, '').trim() !== '';
      const hasDate = b.date !== null && b.date !== '' && b.date !== undefined;
      const hasAttachments = Array.isArray(b.attachments) && b.attachments.length > 0;
      return hasDetail || hasDate || hasAttachments;
    });

    if (data.blocks.length === 0) {
      data.blocks = [{ date: '', detail: '', attachments: [] }];
    }

    // Sync primary lawStatute and section from first laws entry
    if (Array.isArray(data.laws) && data.laws.length > 0) {
      data.lawStatute = data.laws[0].lawStatute || '';
      data.section = data.laws[0].section || '';
    }

    try {
      const isNavEdit = Boolean(isEdit || editData || currentRecordId);
      const targetSr = editData?.srNumber
        ? String(editData.srNumber).trim()
        : String(data.srNumber || '').trim();
      let targetId = currentRecordId || editData?.id || editData?._id || editData?.mongoId;
      if (!targetId && targetSr) {
        try {
          const existing = await notificationService.getNotificationById(targetSr);
          if (existing?.id || existing?._id || existing?.mongoId) {
            targetId = existing.id || existing._id || existing.mongoId;
            setCurrentRecordId(targetId);
          }
        } catch {
          // not found as existing record
        }
      }

      const payload = {
        ...data,
        srNumber: targetSr || data.srNumber
      };

      if (targetId || isNavEdit) {
        await notificationService.updateNotification(targetId || targetSr, payload);
        setValue('srNumber', targetSr, { shouldDirty: false });
      } else {
        await notificationService.createNotification(payload);
      }

      setShowSuccess(true);

      if (isNext) {
        // Advance to next sequential SR#
        const currentSrNum = parseInt(targetSr || '1', 10);
        const nextSr = String(isNaN(currentSrNum) ? 1 : currentSrNum + 1);
        setAutoNewSr(nextSr);
        setValue('srNumber', nextSr);
        setCurrentRecordId(null);
        // Clear attachments and reset to 1 fresh block
        setValue('blocks', [{ id: `block-${Date.now()}`, date: '', detail: '', attachments: [] }]);
        setLoadFeedback({
          type: 'success',
          message: `Saved! Advanced to SR #${nextSr}. Ready for entry.`
        });
      } else {
        if (!targetId) {
          const currentSrNum = parseInt(targetSr || '1', 10);
          const nextSr = String(isNaN(currentSrNum) ? 1 : currentSrNum + 1);
          setAutoNewSr(nextSr);
          setValue('srNumber', nextSr);
          setCurrentRecordId(null);
          setValue('blocks', [{ id: `block-${Date.now()}`, date: '', detail: '', attachments: [] }]);
        }
      }

      setTimeout(() => {
        setShowSuccess(false);
      }, 3500);
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  return (
    <div className="flex flex-col bg-theme-surface relative">
      
      <div className="p-4">
        
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-between text-green-700 dark:text-green-400 animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">
                SUCCESS: {isEdit ? 'Record updated successfully.' : 'Record added successfully. Ready for new entry.'}
              </span>
            </div>
            <button type="button" onClick={() => setShowSuccess(false)}>
              <X className="w-4 h-4 hover:text-green-900 dark:hover:text-green-200" />
            </button>
          </div>
        )}

        {/* Top Sticky Action Bar: Back and Save/Update Record + Save + Next */}
        <div className="sticky top-0 z-30 mb-4 flex items-center justify-between bg-theme-surface/95 border border-theme-border px-4 py-3 rounded-xl shadow-md backdrop-blur-md">
          <div className="text-xs text-theme-muted font-medium flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/manage-notifications')}
              className="p-1.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="font-bold text-theme-main text-sm">{isEdit ? 'Edit Notification' : 'Add New Notification'}</span>
            {editData?.srNumber && <span className="text-brand-orange font-semibold">SR #{editData.srNumber}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                isSaveAndNextRef.current = true;
                const formElem = document.getElementById('notification-form');
                if (formElem) {
                  formElem.requestSubmit();
                }
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-brand-orange bg-theme-surface hover:bg-theme-surface-alt border border-brand-orange/40 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              title="Save and advance to next SR #"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEdit ? 'Update + Next' : 'Save + Next'}</span>
            </button>

            <button
              type="submit"
              form="notification-form"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-brand-orange to-[#d44e35] hover:from-[#d44e35] hover:to-[#b33e28] rounded-lg shadow-md cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Saving...' : (isEdit ? 'Update Record' : 'Save Record')}</span>
            </button>
          </div>
        </div>

        <form 
          id="notification-form" 
          onSubmit={handleSubmit(onSubmit)} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
              e.preventDefault();
              if (e.target.name === 'srNumber') {
                loadNotificationBySr(e.target.value);
              }
            }
          }}
          className="space-y-3"
        >

          {/* Record Information */}
          <FormSection compact>

            {/* Top row: Auto New SR # · Load SR # · Department · Sub Department · Year · Number (all fit in single row) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-3 items-end mb-3">
              
              {/* Auto New SR # (Non-editable) Generate Block */}
              <div className="lg:col-span-2 col-span-1">
                <FormField label="Auto New SR #">
                  <input
                    type="text"
                    readOnly
                    value={autoNewSr ? `SR #${autoNewSr}` : 'Generating...'}
                    className="w-full h-[38px] px-3 rounded-lg border border-theme-border/80 bg-theme-surface-alt/70 text-brand-orange font-mono font-bold text-xs select-all cursor-default focus:outline-none shadow-inner"
                    title="System Auto-Generated New Serial Number (Non-Editable)"
                  />
                </FormField>
              </div>

              {/* Reduced size Load SR # Block */}
              <div className="lg:col-span-2 col-span-1">
                <FormField label="Load SR #" required>
                  <div className="flex items-center gap-1">
                    <div className="relative flex-1">
                      <Input
                        variant="light"
                        inputSize="sm"
                        placeholder="e.g. 11675"
                        error={errors.srNumber}
                        {...register('srNumber')}
                      />
                      {loadingNotification && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-orange" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        title="Previous SR"
                        onClick={() => handleStepSr(-1)}
                        disabled={loadingNotification}
                        className="p-1 h-[34px] w-[26px] flex items-center justify-center rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Next SR"
                        onClick={() => handleStepSr(1)}
                        disabled={loadingNotification}
                        className="p-1 h-[34px] w-[26px] flex items-center justify-center rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => loadNotificationBySr()}
                        disabled={loadingNotification}
                        className="h-[34px] text-xs px-1.5 border border-brand-orange/40 text-brand-orange hover:bg-brand-orange/10 rounded-lg font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {loadingNotification ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Load'}
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

              {/* Department */}
              <div className="lg:col-span-2 col-span-1">
                <FormField label="Department" required>
                  <Controller
                    control={control}
                    name="department"
                    render={({ field }) => (
                      <SearchableCombobox
                        inputSize="sm"
                        error={errors.department}
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val)}
                        options={[
                          { label: 'Notification', value: 'notification' },
                          { label: 'Notifications', value: 'notifications' },
                          { label: 'Circular', value: 'circular' },
                          { label: 'Corporate', value: 'corporate' },
                          { label: 'General Order', value: 'general order' },
                          { label: 'Judge Order', value: 'judge order' },
                          { label: 'Letter', value: 'letter' },
                          { label: 'Other', value: 'other' }
                        ]}
                        placeholder="Select or write department..."
                        allowCustom={true}
                      />
                    )}
                  />
                </FormField>
              </div>

              {/* Sub Department */}
              <div className="lg:col-span-2 col-span-1">
                <FormField label="Sub Department" required>
                  <Controller
                    control={control}
                    name="subDepartment"
                    render={({ field }) => (
                      <SearchableCombobox
                        inputSize="sm"
                        error={errors.subDepartment}
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val)}
                        options={[
                          { label: 'Federal', value: 'federal' },
                          { label: 'Provincial', value: 'provincial' }
                        ]}
                        placeholder="Select or write sub-department..."
                        allowCustom={true}
                      />
                    )}
                  />
                </FormField>
              </div>

              {/* Year */}
              <div className="lg:col-span-2 col-span-1">
                <FormField label="Year" required>
                  <Input
                    variant="light"
                    inputSize="sm"
                    placeholder="2026"
                    error={errors.year}
                    {...register('year')}
                  />
                </FormField>
              </div>

              {/* Number */}
              <div className="lg:col-span-2 col-span-1">
                <FormField label="Number" required>
                  <Input
                    variant="light"
                    inputSize="sm"
                    placeholder="Enter number..."
                    error={errors.number}
                    {...register('number')}
                  />
                </FormField>
              </div>
            </div>

            {/* Middle row: SRO # (increased by 50%+) · Subject */}
            <div className="grid grid-cols-12 gap-3 mb-3 items-end">
              <FormField label="SRO #" required className="col-span-12 sm:col-span-5">
                <Input
                  variant="light"
                  inputSize="sm"
                  placeholder="Enter SRO #..."
                  error={errors.sroNumber}
                  {...register('sroNumber')}
                />
              </FormField>
              <FormField label="Subject" className="col-span-12 sm:col-span-7">
                <Input
                  variant="light"
                  inputSize="sm"
                  placeholder="Enter Subject..."
                  error={errors.subject}
                  {...register('subject')}
                />
              </FormField>
            </div>

            {/* Dynamic Multiple Law & Section rows with Add More */}
            <div className="space-y-3 pt-1 border-t border-theme-border/60">
              {lawFields.map((field, lIdx) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-end">
                  <div className={lIdx === 0 ? "col-span-12 sm:col-span-6" : "col-span-11 sm:col-span-6"}>
                    <FormField label={`Law/Statute ${lIdx + 1}`}>
                      <Controller
                        control={control}
                        name={`laws.${lIdx}.lawStatute`}
                        render={({ field }) => (
                          <SearchableCombobox
                            inputSize="sm"
                            value={field.value || ''}
                            onChange={(val) => field.onChange(val)}
                            options={lawOptions}
                            placeholder="Select or enter Law/Statute..."
                            allowCustom={true}
                          />
                        )}
                      />
                    </FormField>
                  </div>
                  <div className={lIdx === 0 ? "col-span-12 sm:col-span-6" : "col-span-11 sm:col-span-5"}>
                    <FormField label={`Section ${lIdx + 1}`}>
                      <Controller
                        control={control}
                        name={`laws.${lIdx}.section`}
                        render={({ field }) => (
                          <SearchableSectionSelect
                            value={field.value}
                            onChange={field.onChange}
                            options={sectionOptions}
                            placeholder="Type or select section #..."
                            inputSize="sm"
                          />
                        )}
                      />
                    </FormField>
                  </div>
                  {lIdx > 0 && (
                    <div className="col-span-1 pb-1">
                      <button
                        type="button"
                        onClick={() => removeLaw(lIdx)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900 cursor-pointer transition-colors"
                        title="Remove Law & Section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <datalist id="notification-laws-list">
                {memoizedLawOptions}
              </datalist>

              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => appendLaw({ lawStatute: '', section: '' })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-orange/40 text-brand-orange hover:bg-brand-orange/10 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add More Law & Section</span>
                </button>
              </div>
            </div>

          </FormSection>

          {/* Repeatable Content Blocks (Heading removed, 1 block by default, Date & Attachment on top of each block) */}
          <FormSection compact>
            <div className="space-y-4">
              {blockFields.map((block, index) => (
                <div key={block.id} className="bg-theme-surface border border-theme-border rounded-xl p-3 sm:p-4 relative space-y-3">

                  {/* Block header badge & actions */}
                  <div className="flex items-center gap-1.5 absolute top-2 right-2 z-10">
                    {blockFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBlock(index)}
                        className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900 cursor-pointer transition-colors"
                        title="Remove this block"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="bg-theme-surface-alt border border-theme-border text-theme-muted px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">
                      BLOCK {index + 1}
                    </span>
                  </div>

                  {/* Top row in block: Law Date + Attachment */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 sm:pt-2">
                    <FormField label="Law Date">
                      <Controller
                        control={control}
                        name={`blocks.${index}.date`}
                        render={({ field }) => (
                          <Input
                            type="date"
                            variant="light"
                            inputSize="sm"
                            value={formatDateForInput(field.value)}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-full"
                          />
                        )}
                      />
                    </FormField>

                    <FormField label="Attachment">
                      <Controller
                        control={control}
                        name={`blocks.${index}.attachments`}
                        render={({ field }) => (
                          <CompactFileButton value={field.value} onChange={field.onChange} />
                        )}
                      />
                    </FormField>
                  </div>

                  {/* Detail editor takes full 100% width */}
                  <FormField label="Detail" className="w-full">
                    <div className="relative z-0">
                      <Controller
                        control={control}
                        name={`blocks.${index}.detail`}
                        render={({ field }) => (
                          <RichTextEditor
                            name={`notification_block_${index}`}
                            value={field.value}
                            onChange={field.onChange}
                            minHeight={220}
                          />
                        )}
                      />
                    </div>
                  </FormField>

                </div>
              ))}
            </div>

            {/* Bottom Add Detail Block button */}
            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => appendBlock({ id: `block-${Date.now()}-${Math.random()}`, date: '', detail: '', attachments: [] })}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange border border-brand-orange/40 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add New Detail Block</span>
              </button>
            </div>
          </FormSection>

        </form>
      </div>

      <FormFooter 
        formId="notification-form"
        onCancel={() => navigate('/manage-notifications')}
        isSubmitting={isSubmitting}
        showSaveAndNext={true}
        onSaveAndNext={() => { isSaveAndNextRef.current = true; }}
        saveAndNextText={isEdit ? "Update + Next" : "Save + Next"}
        submitText={isEdit ? "Update Record" : "Save Record"}
      />

    </div>
  );
};

export default AddNotificationForm;
