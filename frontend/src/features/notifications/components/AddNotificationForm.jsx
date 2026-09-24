import React, { useState, useEffect, useRef } from 'react';
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
import { notificationSchema } from '../validation/notificationSchema';
import { notificationService } from '../services/notificationService';
import { settingService } from '../../../services/settingService';

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

const AddNotificationForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.notificationData;
  const isEdit = Boolean(location.state?.isEdit || editData);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lawOptions, setLawOptions] = useState([]);

  useEffect(() => {
    let isMounted = true;
    settingService.getLaws({ status: 'active', limit: 5000 })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data)) {
          setLawOptions(res.data.map(l => l.name));
        }
      })
      .catch(err => {
        console.warn('Could not load dynamic laws for AddNotificationForm:', err);
      });
    return () => { isMounted = false; };
  }, []);

  const defaultValues = {
    srNumber: editData?.srNumber?.toString() || '',
    department: editData?.department?.toLowerCase() || 'notification',
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
        const hasDate = b.date !== null && b.date !== '';
        const hasAttachments = b.attachments && b.attachments.length > 0;
        return hasDetail || hasDate || hasAttachments;
      }).map((b, i) => ({
        id: b._id || `existing-${i}`,
        date: b.date ? new Date(b.date) : null,
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
    resolver: zodResolver(notificationSchema),
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
      const hasDate = b.date !== null && b.date !== '';
      const hasAttachments = b.attachments && b.attachments.length > 0;
      return hasDetail || hasDate || hasAttachments;
    });

    try {
      if (isEdit && editData?.id) {
        await notificationService.updateNotification(editData.id, data);
      } else {
        await notificationService.createNotification(data);
      }
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/manage-notifications');
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

        <form id="notification-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">

          {/* Record Information */}
          <FormSection compact>

            {/* Top row: SR # · Department · Sub Department · Year · Number — all on one line */}
            <div className="grid grid-cols-5 gap-3 items-end mb-3">
              <FormField label="SR #" required>
                <Input
                  variant="light"
                  inputSize="sm"
                  placeholder="11675"
                  error={errors.srNumber}
                  {...register('srNumber')}
                />
              </FormField>
              <FormField label="Department" required>
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
              <FormField label="Year" required>
                <Input
                  variant="light"
                  inputSize="sm"
                  placeholder="2026"
                  error={errors.year}
                  {...register('year')}
                />
              </FormField>
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
                  {lawOptions.map((lawName, idx) => (
                    <option key={idx} value={lawName} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Section 1">
                <Input
                  variant="light"
                  inputSize="sm"
                  placeholder="Enter Section..."
                  error={errors.section}
                  {...register('section')}
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

                  <div className="flex gap-3 pt-1 items-start">

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
          </FormSection>

        </form>
      </div>

      <FormFooter 
        formId="notification-form"
        onCancel={() => navigate('/manage-notifications')}
        isSubmitting={isSubmitting}
        submitText={isEdit ? "Update Record" : "Add Record"}
      />

    </div>
  );
};

export default AddNotificationForm;



