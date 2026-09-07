import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, CheckCircle2, Layers, Paperclip } from 'lucide-react';

import Input from '../../../components/ui/Input';
import DatePicker from '../../../components/ui/DatePicker';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import FormSection from '../../../components/ui/FormSection';
import FormField from '../../../components/ui/FormField';
import FormFooter from '../../../components/ui/FormFooter';
import { statuteSchema } from '../validation/statuteSchema';
import { statuteService } from '../services/statuteService';

/* ── Compact inline file-chooser, same height as the date picker ─────── */
const CompactFileButton = ({ value, onChange }) => {
  const ref = useRef(null);
  const files = Array.isArray(value) ? value : (value ? [value] : []);
  return (
    <div className="flex flex-col gap-1">
      <input
        ref={ref}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv,.xlsx"
        className="hidden"
        onChange={(e) => {
          const incoming = Array.from(e.target.files || []);
          const merged = [
            ...files,
            ...incoming.filter(f => !files.some(x => x.name === f.name && x.size === f.size))
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
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-1 px-2 py-0.5 rounded text-[10px] bg-theme-surface-alt border border-theme-border/60">
              <span className="truncate text-theme-muted max-w-[110px]">{f.name || `File ${i + 1}`}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="shrink-0 text-theme-disabled hover:text-red-500"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
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

  const defaultValues = {
    srNumber: editData?.srNumber?.toString() || editData?.id?.toString() || '',
    department: editData?.department?.toLowerCase() || 'tax',
    chapter: editData?.chapter || '',
    display: editData?.display?.toLowerCase() === 'no' ? 'no' : 'yes',
    status: editData?.display === 'No' ? 'inactive' : 'active',
    law: editData?.law || 'Income Tax Rules, 2002',
    section: editData?.section || '231CB',
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

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(statuteSchema),
    defaultValues,
  });

  const { fields: blockFields } = useFieldArray({
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
      if (isEdit && editData?.id) {
        await statuteService.updateStatute(editData.id, data);
      } else {
        await statuteService.createStatute(data);
      }
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/manage-statutes');
      }, 2500);
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
                SUCCESS: {isEdit ? 'Record updated successfully.' : 'Record added successfully.'}
              </span>
            </div>
            <button type="button" onClick={() => setShowSuccess(false)}>
              <X className="w-4 h-4 hover:text-green-900 dark:hover:text-green-200" />
            </button>
          </div>
        )}

        <form id="statute-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">

          {/* Record Information */}
          <FormSection compact>

            {/* Top row: SR # · Department · Chapter — all on one line */}
            <div className="grid grid-cols-3 gap-3 items-end mb-3">
              <FormField label="SR #" required>
                <Input
                  variant="light"
                  inputSize="sm"
                  placeholder="e.g. 9339"
                  error={errors.srNumber}
                  {...register('srNumber')}
                />
              </FormField>
              <FormField label="Department">
                <Input
                  variant="light"
                  inputSize="sm"
                  type="select"
                  error={errors.department}
                  options={[
                    { label: 'Circular', value: 'circular' },
                    { label: 'Corporate', value: 'corporate' },
                    { label: 'General Order', value: 'general order' },
                    { label: 'Judge Order', value: 'judge order' },
                    { label: 'Letter', value: 'letter' },
                    { label: 'Notification', value: 'notification' },
                    { label: 'Other', value: 'other' }
                  ]}
                  {...register('department')}
                />
              </FormField>
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

            {/* Middle row: Law/Statute · Section */}
            <div className="grid grid-cols-2 gap-3 items-end mb-3">
              <FormField label="Law/Statute">
                <Input
                  variant="light"
                  inputSize="sm"
                  placeholder="Enter Law or Statute name..."
                  error={errors.law}
                  {...register('law')}
                />
              </FormField>
              <FormField label="Section">
                <Input
                  variant="light"
                  inputSize="sm"
                  placeholder="Enter section (e.g. 231CB)..."
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
            <div className="text-brand-orange font-semibold text-sm mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Content Details
            </div>
            <div className="space-y-3">
              {blockFields.map((block, index) => (
                <div key={block.id} className="bg-theme-surface border border-theme-border rounded-xl p-3 relative">

                  {/* Block badge */}
                  <div className="absolute top-0 right-0 bg-theme-surface-alt border-b border-l border-theme-border text-theme-muted px-2.5 py-0.5 rounded-bl-xl rounded-tr-xl text-[10px] font-bold tracking-wider">
                    BLOCK {index + 1}
                  </div>

                  {/* Section Heading — full width above the split */}
                  <div className="mb-2 pt-1">
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
          </FormSection>

        </form>
      </div>

      <FormFooter 
        formId="statute-form"
        onCancel={() => navigate('/manage-statutes')}
        isSubmitting={isSubmitting}
        submitText={isEdit ? "Update Record" : "Add Record"}
      />

    </div>
  );
};

export default AddStatuteForm;

