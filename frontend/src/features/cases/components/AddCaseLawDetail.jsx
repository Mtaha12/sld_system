import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  X, CheckCircle2, FileText, BookOpen, Users, Scale, Plus, Upload
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import DatePicker from '../../../components/ui/DatePicker';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import FormSection from '../../../components/ui/FormSection';
import FormField from '../../../components/ui/FormField';
import Textarea from '../../../components/ui/Textarea';
import FileUpload from '../../../components/ui/FileUpload';
import PageHeader from '../../../components/ui/PageHeader';
import FormFooter from '../../../components/ui/FormFooter';
import { caseSchema } from '../validation/caseSchema';
import { caseService } from '../services/caseService';

const AddCaseLawDetail = ({ onClose }) => {
  const location = useLocation();
  const editData = location.state?.caseData;
  const isEdit = Boolean(location.state?.isEdit || editData);
  const [showSuccess, setShowSuccess] = useState(false);

  const defaultValues = {
    srNumber: editData?.sldNumber || '163629',
    dated: editData?.dated ? new Date(editData.dated) : null,
    department: editData?.department || 'tax',
    status: editData?.status?.toLowerCase() || 'active',
    court: editData?.court || 'Federal Constitutional Court of Pakistan',
    caseNumber: Array.isArray(editData?.caseNumber) ? editData.caseNumber.join(' ') : (editData?.caseNumber || ''),
    judges: Array.isArray(editData?.judges) ? editData.judges.join(' ') : (editData?.judges || ''),
    petitioners: Array.isArray(editData?.petitioners) ? editData.petitioners.join(' ') : (editData?.petitioners || ''),
    lawyers: Array.isArray(editData?.lawyers) ? editData.lawyers.join(' ') : (editData?.lawyers || ''),
    headNote: editData?.headNote || (isEdit ? 'Constitutional review on statutory mandate under Article 199 and relevant procedural codes.' : ''),
    references: editData?.references || (isEdit ? '2019 CLC 551, (2025) Tax 304 139' : ''),
    principleLaw: editData?.principleLaw || (isEdit ? 'Income Tax Rules, 2002 - Section 231CB' : ''),
    judgment: editData?.judgment || (isEdit ? '<p><strong>IN THE FEDERAL CONSTITUTIONAL COURT OF PAKISTAN</strong></p><p>Upon extensive deliberation and review of arguments presented by counsel for the petitioner and state respondents, the Court observed that the statutory provisions must be interpreted in alignment with natural justice and constitutional guarantees.</p>' : ''),
    publications: [
      { id: 1, year: isEdit ? '2025' : '2026', vol: isEdit ? 'Vol. 1' : '', mag: 'sld', page: isEdit ? '8335' : '3425', month: 'may' }
    ],
    laws: [
      { id: 1, lawStatute: 'income_tax_2002', section: isEdit ? 'Section 231CB' : '' }
    ],
    attachments: []
  };

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(caseSchema),
    defaultValues,
  });

  const {
    fields: publicationFields,
    append: appendPublication
  } = useFieldArray({
    control,
    name: 'publications'
  });

  const {
    fields: lawFields,
    append: appendLaw
  } = useFieldArray({
    control,
    name: 'laws'
  });

  const onSubmit = async (data) => {
    if (isEdit && editData?.id) {
      await caseService.updateCase(editData.id, data);
    } else {
      await caseService.createCase(data);
    }
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose?.();
    }, 2500);
  };

  return (
    <div className="flex flex-col bg-theme-surface relative">
      
      <PageHeader 
        title={<>{isEdit ? 'Edit' : 'Add'} <span className="text-brand-orange">Case Law</span> Detail</>}
        subtitle={isEdit ? "Update the case information and publication details" : "Enter the case information and publication details"}
        icon={FileText}
        onClose={onClose}
      />

      {/* Scrollable Content */}
      <div className="p-6">
        
        {/* Success Notification */}
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

        <form id="case-law-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Case Information */}
          <FormSection title="Case Information" icon={FileText}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
              <FormField label="SR #" required>
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  placeholder="163629" 
                  error={errors.srNumber}
                  {...register('srNumber')}
                />
              </FormField>
              <FormField label="Date">
                <Controller
                  control={control}
                  name="dated"
                  render={({ field }) => (
                    <DatePicker 
                      selectedDate={field.value} 
                      onChange={field.onChange} 
                      placeholder="2024-09-26" 
                      className="w-full" 
                    />
                  )}
                />
              </FormField>
              <FormField label="Department">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  error={errors.department}
                  options={[{ label: 'Tax', value: 'tax' }, { label: 'Civil', value: 'civil' }]} 
                  {...register('department')}
                />
              </FormField>
              <FormField label="Status">
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

            <FormField label="Court" className="mb-4">
              <Input 
                variant="light" 
                inputSize="sm"
                placeholder="Enter court name"
                error={errors.court}
                {...register('court')}
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Case No.">
                <Textarea 
                  placeholder="Enter case numbers..." 
                  {...register('caseNumber')}
                />
              </FormField>
              <FormField label="Judges">
                <Textarea 
                  placeholder="Enter judges..." 
                  {...register('judges')}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Publication Details */}
          <FormSection title="Publication Details" icon={BookOpen}>
            <div className="space-y-3">
              {publicationFields.map((pub, idx) => (
                <div key={pub.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <FormField label="Year" className="col-span-2">
                    <Input 
                      variant="light" 
                      inputSize="sm" 
                      placeholder="2026" 
                      {...register(`publications.${idx}.year`)}
                    />
                  </FormField>
                  <FormField label="Vol." className="col-span-2">
                    <Input 
                      variant="light" 
                      inputSize="sm" 
                      placeholder="Vol." 
                      {...register(`publications.${idx}.vol`)}
                    />
                  </FormField>
                  <FormField label="Mag" className="col-span-2">
                    <Input 
                      variant="light" 
                      inputSize="sm" 
                      type="select" 
                      options={[{ label: 'SLD', value: 'sld' }]} 
                      {...register(`publications.${idx}.mag`)}
                    />
                  </FormField>
                  <FormField label="Page" className="col-span-2">
                    <Input 
                      variant="light" 
                      inputSize="sm" 
                      placeholder={idx === 0 ? "3425" : "Page"} 
                      {...register(`publications.${idx}.page`)}
                    />
                  </FormField>
                  <FormField label="Month" className="col-span-2">
                    <Input 
                      variant="light" 
                      inputSize="sm" 
                      type="select" 
                      options={[{ label: 'May', value: 'may' }, { label: 'August', value: 'august' }]} 
                      {...register(`publications.${idx}.month`)}
                    />
                  </FormField>
                  <div className="col-span-2 h-[38px] flex items-center">
                    {idx === publicationFields.length - 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="w-full text-green-600 border-green-200 hover:bg-green-50 h-full" 
                        onClick={() => appendPublication({ year: '2026', vol: '', mag: 'sld', page: '', month: 'may' })}
                      >
                        <Plus className="w-4 h-4" /> Add More
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          {/* Parties & References */}
          <FormSection title="Parties & References" icon={Users}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FormField label="Petitioners">
                <Textarea 
                  placeholder="Enter petitioners..."
                  {...register('petitioners')}
                />
              </FormField>
              <FormField label="Lawyers">
                <Textarea 
                  placeholder="Enter lawyers..."
                  {...register('lawyers')}
                />
              </FormField>
              <FormField label="Head Note">
                <Textarea 
                  placeholder="Enter head note..."
                  {...register('headNote')}
                />
              </FormField>
              <FormField label="References">
                <Textarea 
                  placeholder="Enter legal references..."
                  {...register('references')}
                />
              </FormField>
            </div>

            <div className="space-y-3">
              {lawFields.map((law, idx) => (
                <div key={law.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <FormField label="Law/Statutes" className="col-span-5">
                    <Input 
                      variant="light" 
                      inputSize="sm" 
                      type="select" 
                      options={[{ label: 'Income Tax Rules, 2002', value: 'income_tax_2002' }, { label: 'Select Law', value: '' }]} 
                      {...register(`laws.${idx}.lawStatute`)}
                    />
                  </FormField>
                  <FormField label="Sections" className="col-span-5">
                    <Input 
                      variant="light" 
                      inputSize="sm" 
                      placeholder="Section" 
                      {...register(`laws.${idx}.section`)}
                    />
                  </FormField>
                  <div className="col-span-2 h-[38px] flex items-center">
                    {idx === lawFields.length - 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-green-600 border-green-200 hover:bg-green-50 h-full" 
                        onClick={() => appendLaw({ lawStatute: '', section: '' })}
                      >
                        <Plus className="w-4 h-4" /> Add More
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          {/* Judgment & Attachment Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Judgment */}
            <div className="lg:col-span-2">
              <FormSection title="Judgment" icon={Scale}>
                <div className="flex-1 flex flex-col min-h-[250px] relative z-0">
                  <Controller
                    control={control}
                    name="judgment"
                    render={({ field }) => (
                      <RichTextEditor 
                        value={field.value} 
                        onChange={field.onChange} 
                        placeholder="Enter judgment details..."
                      />
                    )}
                  />
                </div>
              </FormSection>
            </div>

            {/* Attachment */}
            <div>
              <FormSection title="Attachment" icon={Upload}>
                <Controller
                  control={control}
                  name="attachments"
                  render={({ field }) => (
                    <FileUpload 
                      value={field.value} 
                      onChange={field.onChange} 
                    />
                  )}
                />
              </FormSection>
            </div>

          </div>

          {/* Principle Law */}
          <FormSection title="Principle Law" icon={Scale}>
            <Input 
              variant="light" 
              inputSize="sm" 
              placeholder="Enter principle law..." 
              error={errors.principleLaw}
              {...register('principleLaw')}
            />
          </FormSection>

        </form>
      </div>

      <FormFooter 
        formId="case-law-form"
        onCancel={onClose}
        isSubmitting={isSubmitting}
        submitText={isEdit ? "Update Record" : "Add Record"}
      />

    </div>
  );
};

export default AddCaseLawDetail;

