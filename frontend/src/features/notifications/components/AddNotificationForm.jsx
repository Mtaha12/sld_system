import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, CheckCircle2, FileText, Bell, Layers } from 'lucide-react';

import Input from '../../../components/ui/Input';
import DatePicker from '../../../components/ui/DatePicker';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import FormSection from '../../../components/ui/FormSection';
import FormField from '../../../components/ui/FormField';
import FileUpload from '../../../components/ui/FileUpload';
import PageHeader from '../../../components/ui/PageHeader';
import FormFooter from '../../../components/ui/FormFooter';
import { notificationSchema } from '../validation/notificationSchema';
import { notificationService } from '../services/notificationService';

const AddNotificationForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.notificationData;
  const isEdit = Boolean(location.state?.isEdit || editData);
  const [showSuccess, setShowSuccess] = useState(false);

  const defaultValues = {
    srNumber: editData?.srNumber || '11675',
    department: editData?.department?.toLowerCase() || 'notifications',
    subDepartment: editData?.subDepartment || 'federal',
    year: editData?.year || '2026',
    number: editData?.number || '14',
    sroNumber: editData?.sroNumber || '',
    subject: editData?.subject || '',
    status: editData?.status?.toLowerCase() || 'active',
    lawStatute: editData?.lawStatute || '',
    section: editData?.section || '',
    blocks: [
      { 
        id: 1, 
        date: editData?.lawDate ? new Date(editData.lawDate) : null, 
        detail: isEdit ? `<p><strong>${editData?.subject || 'Notification'}</strong></p><p>Official statutory notification details and circular directives issued under the applicable legal framework.</p>` : '',
        attachments: []
      },
      { id: 2, date: null, detail: '', attachments: [] },
      { id: 3, date: null, detail: '', attachments: [] },
      { id: 4, date: null, detail: '', attachments: [] }
    ]
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
  };

  return (
    <div className="flex flex-col bg-theme-surface relative">
      
      <PageHeader 
        title={<>{isEdit ? 'Edit' : 'Add'} <span className="text-brand-orange">Notifications / Circulars / Letters / General Orders</span> Detail</>}
        subtitle={isEdit ? "Update the record information and content details" : "Enter the record information and content details"}
        icon={Bell}
        onClose={() => navigate('/manage-notifications')}
      />

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

        <form id="notification-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <FormSection title="Record Information" icon={FileText}>
            
            {/* Top row fields */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 items-end">
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
                  options={[{ label: 'Notifications', value: 'notifications' }]} 
                  {...register('department')}
                />
              </FormField>
              <FormField label="Sub Department" required>
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  error={errors.subDepartment}
                  options={[{ label: 'Federal', value: 'federal' }]} 
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

            {/* Middle row fields */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-end">
              <FormField label="SRO #" required className="col-span-1 md:col-span-3">
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  placeholder="Enter SRO #..." 
                  error={errors.sroNumber}
                  {...register('sroNumber')}
                />
              </FormField>
              <FormField label="Subject" className="col-span-1 md:col-span-6">
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  placeholder="Enter Subject..." 
                  error={errors.subject}
                  {...register('subject')}
                />
              </FormField>
              <FormField label="Status" required className="col-span-1 md:col-span-3">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  error={errors.status}
                  options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]} 
                  {...register('status')}
                />
              </FormField>
            </div>

            {/* Bottom row fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <FormField label="Law/Statute 1">
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  placeholder="Enter Law or Statute name..."
                  error={errors.lawStatute}
                  {...register('lawStatute')}
                />
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
          <FormSection title="Content Details" icon={Layers}>
            <div className="space-y-8">
              {blockFields.map((block, index) => (
                <div key={block.id} className="bg-theme-surface border border-theme-border rounded-xl p-6 relative">
                  
                  {/* Block Number Badge */}
                  <div className="absolute top-0 right-0 bg-theme-surface-hover border-b border-l border-theme-border text-theme-main px-3 py-1 rounded-bl-xl rounded-tr-xl text-xs font-bold tracking-wider">
                    BLOCK {index + 1}
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                    
                    {/* Left Column: Date & Attachment */}
                    <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
                      <FormField label="Law Date">
                        <Controller
                          control={control}
                          name={`blocks.${index}.date`}
                          render={({ field }) => (
                            <DatePicker 
                              selectedDate={field.value} 
                              onChange={field.onChange} 
                              placeholder="mm/dd/yyyy"
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
                            />
                          )}
                        />
                      </FormField>
                    </div>

                    {/* Right Column: Editor */}
                    <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-[350px]">
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

