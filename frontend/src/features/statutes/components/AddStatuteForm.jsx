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
import { statuteSchema } from '../validation/statuteSchema';
import { statuteService } from '../services/statuteService';
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

const AddStatuteForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.statuteData;
  const isEdit = Boolean(location.state?.isEdit || editData);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lawOptions, setLawOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState(ALL_SECTIONS || []);
  const defaultValues = {
    srNumber: editData?.srNumber?.toString() || editData?.id?.toString() || '',
    department: editData?.department?.toLowerCase() || 'tax',
    chapter: editData?.chapter || '',
    display: editData?.display?.toLowerCase() === 'no' ? 'no' : 'yes',
    status: editData?.display === 'No' ? 'inactive' : 'active',
    law: editData?.law || '',
    section: editData?.section || '',
    heading: editData?.heading || '',
    blocks: (() => {
      const empty1 = { id: 'new-block-1', sectionHeading: '', fromDate: null, toDate: null, detail: '', attachments: [] };
      const empty2 = { id: 'new-block-2', sectionHeading: '', fromDate: null, toDate: null, detail: '', attachments: [] };
      if (!isEdit) return [empty1, empty2];
      
      const existingFilled = (editData?.blocks || []).filter(b => {
        const hasDetail = b.detail && b.detail.replace(/<[^>]*>?/gm, '').trim() !== '';
        const hasSectionHeading = b.sectionHeading && b.sectionHeading.trim() !== '';
        const hasFromDate = b.fromDate !== null && b.fromDate !== '';
        const hasToDate = b.toDate !== null && b.toDate !== '';
        const hasAttachments = b.attachments && b.attachments.length > 0;
        return hasDetail || hasSectionHeading || hasFromDate || hasToDate || hasAttachments;
      }).map((b, i) => ({
        id: b._id || `existing-${i}`,
        sectionHeading: b.sectionHeading || '',
        fromDate: b.fromDate ? new Date(b.fromDate) : null,
        toDate: b.toDate ? new Date(b.toDate) : null,
        detail: b.detail || '',
        attachments: b.attachments || []
      }));
      
      const res = [empty1, ...existingFilled];
      if (res.length < 2) res.push(empty2);
      return res;
    })()
  };

  const [currentRecordId, setCurrentRecordId] = useState(editData?.id || editData?._id || null);
  const [autoNewSr, setAutoNewSr] = useState('');
  const [loadingStatute, setLoadingStatute] = useState(false);
  const [loadFeedback, setLoadFeedback] = useState(null);
  const isSaveAndNextRef = useRef(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(statuteSchema),
    defaultValues,
  });

  const loadStatuteBySr = React.useCallback(async (targetSr) => {
    const cleanSr = String(targetSr ?? getValues('srNumber') ?? '').trim();
    if (!cleanSr) return;

    setLoadingStatute(true);
    setLoadFeedback(null);

    try {
      const data = await statuteService.getStatuteById(cleanSr);
      if (data) {
        setCurrentRecordId(data._id || data.id);
        setValue('srNumber', String(data.srNumber || cleanSr));
        setValue('department', data.department?.toLowerCase() || 'tax');
        setValue('chapter', data.chapter || '');
        setValue('display', data.display?.toLowerCase() === 'no' ? 'no' : 'yes');
        setValue('status', data.display === 'No' ? 'inactive' : 'active');
        setValue('law', data.law || 'Income Tax Rules, 2002');
        setValue('section', data.section || '');
        setValue('heading', data.heading || '');
        if (Array.isArray(data.blocks) && data.blocks.length > 0) {
          setValue('blocks', data.blocks.map((b, i) => ({
            id: b._id || `existing-${i}`,
            sectionHeading: b.sectionHeading || '',
            fromDate: b.fromDate ? new Date(b.fromDate) : null,
            toDate: b.toDate ? new Date(b.toDate) : null,
            detail: b.detail || '',
            attachments: b.attachments || []
          })));
        }
        setLoadFeedback({
          type: 'success',
          message: `SR #${cleanSr} loaded: ${data.heading ? (data.heading.slice(0, 32) + '...') : (data.law || 'Statute Record')}`
        });
      }
    } catch (err) {
      console.warn(`[Statute Load] SR #${cleanSr} lookup notice:`, err?.response?.data?.message || err.message);
      // Not found in database — keep SR and allow creating new record
      setCurrentRecordId(null);
      setValue('srNumber', cleanSr);
      setLoadFeedback({
        type: 'notFound',
        message: `SR #${cleanSr} not found in database. Ready to create new statute.`
      });
    } finally {
      setLoadingStatute(false);
      setTimeout(() => setLoadFeedback(null), 6000);
    }
  }, [getValues, setValue]);

  const handleStepSr = (delta) => {
    const rawVal = getValues('srNumber');
    const currentNum = parseInt(rawVal || '1', 10);
    const nextNum = Math.max(1, (isNaN(currentNum) ? 1 : currentNum) + delta);
    setValue('srNumber', String(nextNum));
    loadStatuteBySr(nextNum);
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
        console.warn('Could not load dynamic laws for AddStatuteForm:', err);
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
        console.warn('Could not load dynamic sections for AddStatuteForm:', err);
      });

    // Automatically assign next sequential SR # for new statutes and set autoNewSr
    statuteService.getNextSr()
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
        console.warn('Could not auto-fetch next Statute SR #:', err);
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
      const hasSectionHeading = b.sectionHeading && b.sectionHeading.trim() !== '';
      const hasFromDate = b.fromDate !== null && b.fromDate !== '';
      const hasToDate = b.toDate !== null && b.toDate !== '';
      const hasAttachments = b.attachments && b.attachments.length > 0;
      return hasDetail || hasSectionHeading || hasFromDate || hasToDate || hasAttachments;
    });

    try {
      const targetSr = String(data.srNumber || editData?.srNumber || '').trim();
      let targetId = currentRecordId || (isEdit && (editData?.id || editData?._id));
      if (!targetId && targetSr) {
        try {
          const existing = await statuteService.getStatuteById(targetSr);
          if (existing?.id || existing?._id) {
            targetId = existing.id || existing._id;
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
        await statuteService.updateStatute(targetId, payload);
        if (targetSr) {
          setValue('srNumber', targetSr, { shouldDirty: false });
        }
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 3500);
      } else {
        await statuteService.createStatute(data);
        setShowSuccess(true);
        // Advance to new SR# for next entry (remain on page)
        try {
          const res = await statuteService.getNextSr();
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
        setValue('section', '');
        setValue('heading', '');
        setValue('blocks', [
          { id: `new-block-${Date.now()}-1`, sectionHeading: '', fromDate: null, toDate: null, detail: '', attachments: [] },
          { id: `new-block-${Date.now()}-2`, sectionHeading: '', fromDate: null, toDate: null, detail: '', attachments: [] }
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
              onClick={() => navigate('/manage-statutes')}
              className="px-2.5 py-1.5 -ml-1 text-theme-muted hover:text-theme-main hover:bg-theme-surface border border-theme-border rounded-lg transition-colors flex items-center gap-1.5 font-semibold text-xs cursor-pointer shadow-xs mr-1"
              title="Back to Statutes list"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="font-bold text-theme-main text-sm">{isEdit ? 'Edit Statute Form' : 'Add New Statute Form'}</span>
            {editData?.srNumber && <span className="text-brand-orange font-semibold">SR #{editData.srNumber}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              form="statute-form"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-brand-orange to-[#d44e35] hover:from-[#d44e35] hover:to-[#b33e28] rounded-lg shadow-md cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Saving...' : (isEdit ? 'Update Record' : 'Save Record')}</span>
            </button>
          </div>
        </div>

        <form 
          id="statute-form" 
          onSubmit={handleSubmit(onSubmit)} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
              e.preventDefault();
              if (e.target.name === 'srNumber') {
                loadStatuteBySr(e.target.value);
              }
            }
          }}
          className="space-y-3"
        >

          {/* Record Information */}
          <FormSection compact>

            {/* Top row: Auto New SR # · Load SR # · Chapter — Department removed per requirement */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end mb-3">
              
              {/* Auto New SR # (Non-editable) Generate Block */}
              <div className="sm:col-span-3 col-span-1">
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
              <div className="sm:col-span-5 col-span-1">
                <FormField label="Load SR #" required>
                  <div className="flex items-center gap-1">
                    <div className="relative flex-1">
                      <Input
                        variant="light"
                        inputSize="sm"
                        placeholder="e.g. 9339"
                        error={errors.srNumber}
                        {...register('srNumber')}
                      />
                      {loadingStatute && (
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
                        disabled={loadingStatute}
                        className="p-1 h-[34px] w-[30px] flex items-center justify-center rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Next SR"
                        onClick={() => handleStepSr(1)}
                        disabled={loadingStatute}
                        className="p-1 h-[34px] w-[30px] flex items-center justify-center rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => loadStatuteBySr()}
                        disabled={loadingStatute}
                        className="h-[34px] text-xs px-2 border border-brand-orange/40 text-brand-orange hover:bg-brand-orange/10 rounded-lg font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {loadingStatute ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Load'}
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

              {/* Chapter */}
              <div className="sm:col-span-4 col-span-1">
                <FormField label="Chapter">
                  <Input
                    variant="light"
                    inputSize="sm"
                    placeholder="e.g. CHAPTER-XIX"
                    error={errors.chapter}
                    {...register('chapter')}
                  />
                </FormField>
              </div>
            </div>

            {/* Middle row: Law/Statute · Section */}
            <div className="grid grid-cols-2 gap-3 items-end mb-3">
              <FormField label="Law/Statute">
                <Input
                  variant="light"
                  inputSize="sm"
                  placeholder="Select or enter Law/Statute..."
                  list="statute-laws-list"
                  error={errors.law}
                  {...register('law')}
                />
                <datalist id="statute-laws-list">
                  {memoizedLawOptions}
                </datalist>
              </FormField>
              <FormField label="Section">
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

            {/* Bottom row: Heading — full width */}
            <div>
              <FormField label="Heading">
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-theme-border rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange shadow-sm resize-y text-theme-main bg-theme-surface"
                  placeholder="Enter heading..."
                  {...register('heading')}
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

                  {/* Section Heading — full width above the split */}
                  <div className="mb-2 pt-6 sm:pt-4">
                    <FormField label="Section Heading">
                      <Input
                        variant="light"
                        inputSize="sm"
                        placeholder="Enter section heading..."
                        error={errors.blocks?.[index]?.sectionHeading}
                        {...register(`blocks.${index}.sectionHeading`)}
                      />
                    </FormField>
                  </div>

                  <div className="flex gap-3 items-start">

                    {/* Left column — fixed narrow width matching date pickers */}
                    <div className="flex flex-col gap-2 shrink-0" style={{ width: '158px' }}>
                      <FormField label="From Date">
                        <Controller
                          control={control}
                          name={`blocks.${index}.fromDate`}
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

                      <FormField label="To Date">
                        <Controller
                          control={control}
                          name={`blocks.${index}.toDate`}
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
                onClick={() => append({ id: `block-${Date.now()}-${Math.random()}`, sectionHeading: '', fromDate: null, toDate: null, detail: '', attachments: [] })}
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
        formId="statute-form"
        onCancel={() => navigate('/manage-statutes')}
        isSubmitting={isSubmitting}
        showSaveAndNext={true}
        onSaveAndNext={() => { isSaveAndNextRef.current = true; }}
        saveAndNextText={isEdit ? "Update + Next" : "Save + Next"}
        submitText={isEdit ? "Update Record" : "Save Record"}
      />

    </div>
  );
};

export default AddStatuteForm;

