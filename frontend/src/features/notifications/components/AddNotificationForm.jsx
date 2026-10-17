import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, CheckCircle2, Layers, Paperclip, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Check, Plus, Trash2, Eye } from 'lucide-react';

import Input from '../../../components/ui/Input';
import DatePicker from '../../../components/ui/DatePicker';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import FormSection from '../../../components/ui/FormSection';
import FormField from '../../../components/ui/FormField';
import FormFooter from '../../../components/ui/FormFooter';
import { notificationSchema } from '../validation/notificationSchema';
import { notificationService } from '../services/notificationService';
import { settingService } from '../../../services/settingService';
import { ALL_SECTIONS } from '../../../data/sections';

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
    <div className="flex flex-col gap-1">
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
                <span className="truncate text-theme-muted max-w-[95px]" title={fileName}>{fileName}</span>
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
                    onClick={() => onChange(files.filter((_, j) => j !== i))}
                    className="text-theme-disabled hover:text-red-500 p-0.5"
                    title="Remove file"
                  >
                    <X className="w-2.5 h-2.5" />
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

export const formatNotificationParagraphs = (content) => {
  if (!content || typeof content !== 'string') return '';
  return content;
};

const AddNotificationForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.notificationData;
  const isEdit = Boolean(location.state?.isEdit || editData);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lawOptions, setLawOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState(ALL_SECTIONS || []);
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
    blocks: (() => {
      const empty1 = { id: 'new-block-1', date: null, detail: '', attachments: [] };
      const empty2 = { id: 'new-block-2', date: null, detail: '', attachments: [] };
      if (!isEdit) return [empty1, empty2];
      
      const existingFilled = (editData?.blocks || []).filter(b => {
        const hasDetail = b.detail && b.detail.replace(/<[^>]*>?/gm, '').trim() !== '';
        const hasDate = b.date !== null && b.date !== '' && b.date !== undefined;
        const hasAttachments = Array.isArray(b.attachments) && b.attachments.length > 0;
        return hasDetail || hasDate || hasAttachments;
      }).map((b, i) => ({
        id: b._id || `existing-${i}`,
        date: b.date ? new Date(b.date) : null,
        detail: formatNotificationParagraphs(b.detail || ''),
        attachments: b.attachments || []
      }));
      
      if (existingFilled.length === 0) {
        return [empty1, empty2];
      }
      return [...existingFilled, empty1];
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
        if (Array.isArray(data.blocks) && data.blocks.length > 0) {
          setValue('blocks', data.blocks.map((b, i) => ({
            id: b._id || `existing-${i}`,
            date: b.date ? new Date(b.date) : null,
            detail: formatNotificationParagraphs(b.detail || ''),
            attachments: b.attachments || []
          })));
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

    // Automatically assign next sequential SR # for new notifications and set autoNewSr block
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

  const { fields: blockFields, append, insert, remove } = useFieldArray({
    control,
    name: 'blocks'
  });

  const onSubmit = async (data) => {
    // Strip empty blocks before saving
    data.blocks = data.blocks.filter(b => {
      const hasDetail = b.detail && b.detail.replace(/<[^>]*>?/gm, '').trim() !== '';
      const hasDate = b.date !== null && b.date !== '';
      const hasAttachments = b.attachments && b.attachments.length > 0;
      return hasDetail || hasDate || hasAttachments;
    });

    try {
      const targetSr = String(data.srNumber || editData?.srNumber || '').trim();
      let targetId = currentRecordId || (isEdit && (editData?.id || editData?._id || editData?.mongoId));
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

      if (targetId) {
        await notificationService.updateNotification(targetId, payload);
        if (targetSr) {
          setValue('srNumber', targetSr, { shouldDirty: false });
        }
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 3500);
      } else {
        await notificationService.createNotification(data);
        setShowSuccess(true);
        // Advance to new SR# for new entry (do not go to list)
        try {
          const res = await notificationService.getNextSr();
          const currentSrNum = parseInt(data.srNumber || '1', 10);
          const nextSr = res?.nextSr ? String(res.nextSr) : String(isNaN(currentSrNum) ? 1 : currentSrNum + 1);
          setAutoNewSr(nextSr);
          setValue('srNumber', nextSr);
        } catch {
          const currentSrNum = parseInt(data.srNumber || '1', 10);
          const nextSr = String(isNaN(currentSrNum) ? 1 : currentSrNum + 1);
          setAutoNewSr(nextSr);
          setValue('srNumber', nextSr);
        }
        setValue('number', '');
        setValue('sroNumber', '');
        setValue('subject', '');
        setValue('department', 'notification');
        setValue('blocks', [
          { id: `new-block-${Date.now()}-1`, date: null, detail: '', attachments: [] },
          { id: `new-block-${Date.now()}-2`, date: null, detail: '', attachments: [] }
        ]);
        setCurrentRecordId(null);
        setTimeout(() => {
          setShowSuccess(false);
        }, 4000);
      }
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

        {/* Top Action Bar: Clean header with Back and Save/Update Record only */}
        <div className="sticky top-0 z-30 mb-4 flex items-center justify-between bg-theme-surface/95 border border-theme-border px-4 py-3 rounded-xl shadow-md backdrop-blur-md">
          <div className="text-xs text-theme-muted font-medium flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/manage-notifications')}
              className="px-2.5 py-1.5 -ml-1 text-theme-muted hover:text-theme-main hover:bg-theme-surface border border-theme-border rounded-lg transition-colors flex items-center gap-1.5 font-semibold text-xs cursor-pointer shadow-xs mr-1"
              title="Back to Notifications list"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="font-bold text-theme-main text-sm">{isEdit ? 'Edit Notification' : 'Add New Notification'}</span>
            {editData?.srNumber && <span className="text-brand-orange font-semibold">SR #{editData.srNumber}</span>}
          </div>
          <div className="flex items-center gap-2">
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

            {/* Top row: Auto New SR # · Load SR # · Department · Sub Department · Year · Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end mb-3">
              
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
              <div className="lg:col-span-3 sm:col-span-2 col-span-1">
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
                        className="p-1 h-[34px] w-[30px] flex items-center justify-center rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Next SR"
                        onClick={() => handleStepSr(1)}
                        disabled={loadingNotification}
                        className="p-1 h-[34px] w-[30px] flex items-center justify-center rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => loadNotificationBySr()}
                        disabled={loadingNotification}
                        className="h-[34px] text-xs px-2 border border-brand-orange/40 text-brand-orange hover:bg-brand-orange/10 rounded-lg font-semibold cursor-pointer disabled:opacity-50"
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
              <div className="lg:col-span-2">
                <FormField label="Department" required>
                  <Input
                    variant="light"
                    inputSize="sm"
                    type="select"
                    error={errors.department}
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
                    {...register('department')}
                  />
                </FormField>
              </div>
              <div className="lg:col-span-2">
                <FormField label="Sub Department" required>
                  <Input
                    variant="light"
                    inputSize="sm"
                    type="select"
                    error={errors.subDepartment}
                    options={[
                      { label: 'Federal', value: 'federal' },
                      { label: 'Provincial', value: 'provincial' }
                    ]}
                    {...register('subDepartment')}
                  />
                </FormField>
              </div>
              <div className="lg:col-span-2">
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
              <div className="lg:col-span-2">
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

            {/* Middle row: SRO # · Subject */}
            <div className="grid grid-cols-12 gap-3 mb-3 items-end">
              <FormField label="SRO #" required className="col-span-3">
                <Input
                  variant="light"
                  inputSize="sm"
                  placeholder="Enter SRO #..."
                  error={errors.sroNumber}
                  {...register('sroNumber')}
                />
              </FormField>
              <FormField label="Subject" className="col-span-9">
                <Input
                  variant="light"
                  inputSize="sm"
                  placeholder="Enter Subject..."
                  error={errors.subject}
                  {...register('subject')}
                />
              </FormField>
            </div>

            {/* Bottom row: Law/Statute · Section */}
            <div className="grid grid-cols-2 gap-3 items-end">
              <FormField label="Law/Statute 1">
                <Input
                  variant="light"
                  inputSize="sm"
                  placeholder="Select or enter Law/Statute..."
                  list="notification-laws-list"
                  error={errors.lawStatute}
                  {...register('lawStatute')}
                />
                <datalist id="notification-laws-list">
                  {memoizedLawOptions}
                </datalist>
              </FormField>
              <FormField label="Section 1">
                <Input
                  type="select"
                  variant="light"
                  inputSize="sm"
                  options={sectionSelectOptions}
                  error={errors.section}
                  {...register('section')}
                />
              </FormField>
            </div>

          </FormSection>

          {/* Repeatable Content Blocks */}
          <FormSection compact>
            <div className="flex items-center justify-between mb-2">
              <div className="text-brand-orange font-semibold text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" /> Content Details ({blockFields.length} {blockFields.length === 1 ? 'Block' : 'Blocks'})
              </div>
            </div>

            <div className="space-y-3">
              {blockFields.map((block, index) => (
                <div key={block.id} className="bg-theme-surface border border-theme-border rounded-xl p-3 relative">

                  {/* Block header badge & actions */}
                  <div className="flex items-center gap-1.5 absolute top-2 right-2 z-10">
                    {blockFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
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

                  <div className="flex gap-3 pt-6 sm:pt-4 items-start">

                    {/* Left column — fixed narrow width matching date picker */}
                    <div className="flex flex-col gap-2 shrink-0" style={{ width: '158px' }}>
                      <FormField label="Law Date">
                        <Controller
                          control={control}
                          name={`blocks.${index}.date`}
                          render={({ field }) => (
                            <DatePicker
                              selectedDate={field.value}
                              onChange={field.onChange}
                              placeholder="mm/dd/yyyy"
                              className="w-full h-[38px]"
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

                    {/* Right column — editor fills remaining space */}
                    <div className="flex-1 flex flex-col min-h-[240px]">
                      <FormField label="Detail" className="flex-1 flex flex-col">
                        <div className="flex-1 relative z-0">
                          <Controller
                            control={control}
                            name={`blocks.${index}.detail`}
                            render={({ field }) => (
                              <RichTextEditor
                                value={field.value}
                                onChange={field.onChange}
                                minHeight={220}
                              />
                            )}
                          />
                        </div>
                      </FormField>
                    </div>

                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Add Detail Block button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => append({ id: `block-${Date.now()}-${Math.random()}`, date: null, detail: '', attachments: [] })}
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



