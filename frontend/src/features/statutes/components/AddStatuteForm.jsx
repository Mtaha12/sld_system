import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, CheckCircle2, FileText, Layers } from 'lucide-react';

import Input from '../../../components/ui/Input';
import DatePicker from '../../../components/ui/DatePicker';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import FormSection from '../../../components/ui/FormSection';
import FormField from '../../../components/ui/FormField';
import FileUpload from '../../../components/ui/FileUpload';
import FormFooter from '../../../components/ui/FormFooter';
import { statuteSchema } from '../validation/statuteSchema';
import { statuteService } from '../services/statuteService';

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
      
      <div className="p-6">
        
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

        <form id="statute-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <FormSection title="Record Information" icon={FileText}>
            
            {/* Top row fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
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

            {/* Middle row fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 items-end">
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

            {/* Bottom row fields */}
            <div className="grid grid-cols-1 gap-4 items-end">
              <FormField label="Heading">
                <textarea 
                  rows={3}
                  className="w-full px-3 py-2 border border-theme-border rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange shadow-sm resize-y text-theme-main bg-theme-surface"
                  placeholder="Enter heading..."
                  {...register('heading')}
                ></textarea>
              </FormField>
            </div>

          </FormSection>

          {/* Repeatable Content Blocks */}
          <FormSection title="Content Details" icon={Layers}>
            <div className="space-y-8">
              {blockFields.map((block, index) => (
                <div key={block.id} className="bg-theme-surface border border-theme-border rounded-xl p-6 relative">
                  
                  {/* Block Number Badge */}
                  <div className="absolute top-0 right-0 bg-theme-surface-hover border-b border-l border-theme-border text-theme-main px-3 py-1 rounded-bl-xl rounded-tr-xl text-xs font-bold tracking-wider">
                    BLOCK {index + 1}
                  </div>
                  
                  <div className="flex flex-col gap-6 pt-2">
                    
                    <FormField label="Section Heading">
                      <Input 
                        variant="light" 
                        inputSize="sm" 
                        placeholder="Enter section heading..." 
                        error={errors.blocks?.[index]?.sectionHeading}
                        {...register(`blocks.${index}.sectionHeading`)}
                      />
                    </FormField>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      
                      {/* Left Column: Dates & Attachment */}
                      <div className="lg:col-span-3 xl:col-span-2.5 flex flex-col gap-4">
                        <FormField label="From Date">
                          <Controller
                            control={control}
                            name={`blocks.${index}.fromDate`}
                            render={({ field }) => (
                              <DatePicker 
                                selectedDate={field.value} 
                                onChange={field.onChange} 
                                placeholder="mm/dd/yyyy"
                                className="w-full max-w-[170px] h-[42px]"
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
                                className="w-full max-w-[170px] h-[42px]"
                              />
                            )}
                          />
                        </FormField>
                        
                        <FormField label="Attachment" className="flex-1 flex flex-col">
                          <Controller
                            control={control}
                            name={`blocks.${index}.attachments`}
                            render={({ field }) => (
                              <FileUpload 
                                value={field.value}
                                onChange={field.onChange}
                                className="w-full h-[42px]"
                              />
                            )}
                          />
                        </FormField>
                      </div>

                      {/* Right Column: Editor */}
                      <div className="lg:col-span-9 xl:col-span-9.5 flex flex-col min-h-[350px]">
                        <FormField label="Detail" className="flex-1 flex flex-col">
                          <div className="flex-1 h-full relative z-0">
                            <Controller
                              control={control}
                              name={`blocks.${index}.detail`}
                              render={({ field }) => (
                                <RichTextEditor 
                                  value={field.value} 
                                  onChange={field.onChange}
                                  minHeight={320}
                                />
                              )}
                            />
                          </div>
                        </FormField>
                      </div>

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

