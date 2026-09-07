import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  X, CheckCircle2, Scale, Plus, Upload, FileText
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import DatePicker from '../../../components/ui/DatePicker';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import FormSection from '../../../components/ui/FormSection';
import FormField from '../../../components/ui/FormField';
import Textarea from '../../../components/ui/Textarea';
import FormFooter from '../../../components/ui/FormFooter';
import { caseSchema } from '../validation/caseSchema';
import { caseService } from '../services/caseService';
import { LAW_OPTIONS } from '../../../data/laws';
import { SECTION_OPTIONS } from '../../../data/sections';
import { COURT_OPTIONS } from '../../../data/courts';

const caseLawOptions = LAW_OPTIONS.some((option) => option.value === 'income_tax_2002')
  ? LAW_OPTIONS
  : [...LAW_OPTIONS, { label: 'Income Tax Rules, 2002', value: 'income_tax_2002' }];

const AddCaseLawDetail = ({ onClose }) => {
  const location = useLocation();
  const editData = location.state?.caseData;
  const isEdit = Boolean(location.state?.isEdit || editData);
  const existingSections = (editData?.laws || [])
    .map((law) => String(law?.section || '').trim())
    .filter(Boolean);
  const sectionOptions = [
    { label: 'Select Section', value: '' },
    ...SECTION_OPTIONS,
    ...[...new Set(existingSections)]
      .filter((section) => !SECTION_OPTIONS.some((option) => option.value === section))
      .map((section) => ({ label: section, value: section }))
  ];
  const courtOptions = [
    { label: 'Select Court', value: '' },
    ...COURT_OPTIONS,
    ...(editData?.court && !COURT_OPTIONS.some((option) => option.value === editData.court)
      ? [{ label: editData.court, value: editData.court }]
      : [])
  ];
  const [showSuccess, setShowSuccess] = useState(false);
  const [publicationVolumeOpen, setPublicationVolumeOpen] = useState(() => ({
    0: Boolean(editData?.publications?.[0]?.vol)
  }));

  const defaultValues = {
    srNumber: editData?.sldNumber || '',
    dated: editData?.dated ? new Date(editData.dated) : null,
    department: editData?.department || 'tax',
    court: editData?.court || 'Federal Constitutional Court of Pakistan',
    caseNumber: Array.isArray(editData?.caseNumber) ? editData.caseNumber.join(' ') : (editData?.caseNumber || ''),
    judges: Array.isArray(editData?.judges) ? editData.judges.join(' ') : (editData?.judges || ''),
    petitioners: Array.isArray(editData?.petitioners) ? editData.petitioners.join(' ') : (editData?.petitioners || ''),
    lawyers: Array.isArray(editData?.lawyers) ? editData.lawyers.join(' ') : (editData?.lawyers || ''),
    headNote: editData?.headNote || (isEdit ? 'Constitutional review on statutory mandate under Article 199 and relevant procedural codes.' : ''),
    references: editData?.references || (isEdit ? '2019 CLC 551, (2025) Tax 304 139' : ''),
    principleLaw: editData?.principleLaw || (isEdit ? 'Income Tax Rules, 2002 - Section 231CB' : ''),
    legalMaxim: editData?.legalMaxim || '',
    judgment: editData?.judgment || (isEdit ? '<p><strong>IN THE FEDERAL CONSTITUTIONAL COURT OF PAKISTAN</strong></p><p>Upon extensive deliberation and review of arguments presented by counsel for the petitioner and state respondents, the Court observed that the statutory provisions must be interpreted in alignment with natural justice and constitutional guarantees.</p>' : ''),
    publications: [
      { id: 1, year: isEdit ? '2025' : '2026', vol: '', mag: 'sld', page: isEdit ? '8335' : '' }
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
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(caseSchema),
    defaultValues,
  });

  const autofillPublicationPage = async (index) => {
    const publications = getValues('publications') || [];
    const currentPub = publications[index];
    if (!currentPub) return;

    const year = String(currentPub.year || '').trim();
    const mag  = String(currentPub.mag  || '').trim().toLowerCase();
    if (!year || !mag) return;

    try {
      const maxPage = await caseService.getMaxPage(year, mag);
      if (maxPage !== null) {
        setValue(`publications.${index}.page`, String(maxPage), {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    } catch (error) {
      console.warn('[Publication auto-fill skipped]', error);
    }
  };

  const handleAddVolume = (index) => {
    const currentPublication = getValues(`publications.${index}`) || {};
    setValue(`publications.${index}.vol`, currentPublication.vol || '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setPublicationVolumeOpen((prev) => ({
      ...prev,
      [index]: true,
    }));
  };

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
      
      {/* Scrollable Content */}
      <div className="p-4">
        
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

        <form id="case-law-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          
          {/* Case Information — SR#, Date, Court all on one compact row */}
          <FormSection compact>
            <div className="grid grid-cols-3 gap-3 items-end">
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
              <FormField label="Court">
                <Input
                  variant="light" 
                  inputSize="sm"
                  type="select"
                  options={courtOptions}
                  error={errors.court}
                  {...register('court')}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Publication Details */}
          <FormSection compact>
            <div className="space-y-2">
              {publicationFields.map((pub, idx) => (
                <div key={pub.id} className="grid grid-cols-12 gap-2 items-end">
                  <FormField label="Year" className="col-span-2">
                    <Input 
                      variant="light" 
                      inputSize="sm" 
                      placeholder="2026" 
                      {...register(`publications.${idx}.year`, {
                        onChange: () => autofillPublicationPage(idx),
                      })}
                    />
                  </FormField>
                  <FormField label="Mag" className="col-span-2">
                    <Input 
                      variant="light" 
                      inputSize="sm" 
                      type="select" 
                      options={[{ label: 'SLD', value: 'sld' }]} 
                      {...register(`publications.${idx}.mag`, {
                        onChange: () => autofillPublicationPage(idx),
                      })}
                    />
                  </FormField>
                  {publicationVolumeOpen[idx] && (
                    <FormField label="Vol." className="col-span-2">
                      <Input 
                        variant="light" 
                        inputSize="sm" 
                        placeholder="Vol." 
                        {...register(`publications.${idx}.vol`)}
                      />
                    </FormField>
                  )}
                  <FormField label="Page" className={publicationVolumeOpen[idx] ? 'col-span-3' : 'col-span-5'}>
                    <Input 
                      variant="light" 
                      inputSize="sm" 
                      placeholder="Page" 
                      {...register(`publications.${idx}.page`)}
                    />
                  </FormField>
                  <div className="col-span-3 flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="flex-1 text-amber-600 border-amber-200 hover:bg-amber-50 h-[34px] text-xs" 
                      onClick={() => handleAddVolume(idx)}
                    >
                      + Vol
                    </Button>
                    {idx === publicationFields.length - 1 ? (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="flex-1 text-green-600 border-green-200 hover:bg-green-50 h-[34px] text-xs" 
                        onClick={() => {
                          appendPublication({ year: '2026', vol: '', mag: 'sld', page: '' });
                          setPublicationVolumeOpen((prev) => ({
                            ...prev,
                            [publicationFields.length]: false,
                          }));
                        }}
                      >
                        + New
                      </Button>
                    ) : (
                      <div className="flex-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          {/* Parties & References */}
          <FormSection compact>

            {/* Row 1: Case No. + Judges */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <FormField label="Case No.">
                <Textarea 
                  placeholder="Enter case numbers..." 
                  minHeight="64px"
                  className="text-sm"
                  {...register('caseNumber')}
                />
              </FormField>
              <FormField label="Judges">
                <Textarea 
                  placeholder="Enter judges..." 
                  minHeight="64px"
                  className="text-sm"
                  {...register('judges')}
                />
              </FormField>
            </div>

            {/* Row 2: Petitioners + Lawyers */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <FormField label="Petitioners">
                <Textarea 
                  placeholder="Enter petitioners..."
                  minHeight="64px"
                  className="text-sm"
                  {...register('petitioners')}
                />
              </FormField>
              <FormField label="Lawyers">
                <Textarea 
                  placeholder="Enter lawyers..."
                  minHeight="64px"
                  className="text-sm"
                  {...register('lawyers')}
                />
              </FormField>
            </div>

            {/* Row 3: Head Note (70%) + References (30%) — equal height, Head Note is square */}
            <div className="grid grid-cols-10 gap-3 mb-3 items-start">
              <div className="col-span-7">
                <FormField label="Head Note">
                  <Textarea 
                    placeholder="Enter head note..."
                    minHeight="320px"
                    className="text-sm"
                    style={{ height: '320px', resize: 'vertical' }}
                    {...register('headNote')}
                  />
                </FormField>
              </div>
              <div className="col-span-3">
                <FormField label="References">
                  <Textarea 
                    placeholder="Enter references..."
                    minHeight="320px"
                    className="text-sm"
                    style={{ height: '320px', resize: 'vertical' }}
                    {...register('references')}
                  />
                </FormField>
              </div>
            </div>

            {/* Law / Statutes rows */}
            <div className="space-y-2">
              {lawFields.map((law, idx) => (
                <div key={law.id} className="grid grid-cols-12 gap-2 items-end">
                  <FormField label="Law/Statutes" className="col-span-5">
                    <Input 
                      variant="light" 
                      inputSize="sm" 
                      type="select" 
                      options={caseLawOptions}
                      {...register(`laws.${idx}.lawStatute`)}
                    />
                  </FormField>
                  <FormField label="Sections" className="col-span-5">
                    <Input
                      variant="light" 
                      inputSize="sm" 
                      type="select"
                      options={sectionOptions}
                      {...register(`laws.${idx}.section`)}
                    />
                  </FormField>
                  <div className="col-span-2 h-[34px] flex items-center">
                    {idx === lawFields.length - 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-green-600 border-green-200 hover:bg-green-50 h-full text-xs" 
                        onClick={() => appendLaw({ lawStatute: '', section: '' })}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          {/* Judgment + Attachment side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            
            {/* Judgment — takes 2/3 */}
            <div className="lg:col-span-2">
              <FormSection title="Judgment" icon={Scale} compact className="h-full">
                <div className="flex-1 flex flex-col min-h-[220px] relative z-0">
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

            {/* Right column: Attachment only */}
            <div className="flex flex-col gap-3">

              {/* Attachment — compact, tight around button */}
              <div className="border border-theme-border/50 rounded-xl bg-theme-surface-alt/50 p-3">
                <div className="flex items-center gap-2 mb-2 text-brand-orange font-semibold text-sm">
                  <Upload className="w-4 h-4" />
                  Attachment
                </div>
                <Controller
                  control={control}
                  name="attachments"
                  render={({ field }) => {
                    const files = Array.isArray(field.value) ? field.value : (field.value ? [field.value] : []);
                    return (
                      <div className="flex flex-col gap-1.5">
                        <label className="cursor-pointer w-fit">
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv,.xlsx"
                            className="hidden"
                            onChange={(e) => {
                              const newFiles = Array.from(e.target.files || []);
                              const combined = [...files, ...newFiles.filter(nf => !files.some(ef => ef.name === nf.name && ef.size === nf.size))];
                              field.onChange(combined);
                              e.target.value = '';
                            }}
                          />
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-orange/40 bg-brand-orange/5 hover:bg-brand-orange/10 text-xs font-semibold text-brand-orange transition-colors cursor-pointer select-none">
                            <Upload className="w-3.5 h-3.5" />
                            Choose File
                          </span>
                        </label>
                        {files.length > 0 && (
                          <div className="mt-1 space-y-1 max-h-28 overflow-y-auto pr-0.5">
                            {files.map((file, i) => (
                              <div key={i} className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg border border-theme-border bg-theme-surface text-xs text-theme-muted">
                                <span className="truncate max-w-[110px] font-medium text-theme-main">{file.name || `File ${i + 1}`}</span>
                                <button
                                  type="button"
                                  onClick={() => field.onChange(files.filter((_, j) => j !== i))}
                                  className="shrink-0 text-theme-disabled hover:text-red-500 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {files.length === 0 && (
                          <p className="text-[11px] text-theme-disabled mt-0.5">PDF, DOC, PNG, JPG — max 5 MB</p>
                        )}
                      </div>
                    );
                  }}
                />
              </div>

              {/* Case No. info card — only shown in edit mode */}
              {isEdit && editData?.caseNumber && (
                <div className="border border-theme-border/50 rounded-xl bg-theme-surface-alt/50 p-3">
                  <div className="flex items-center gap-2 mb-2 text-brand-orange font-semibold text-sm">
                    <FileText className="w-4 h-4" />
                    Case No.
                  </div>
                  <div className="text-xs text-theme-main leading-relaxed whitespace-pre-line break-words">
                    {Array.isArray(editData.caseNumber)
                      ? editData.caseNumber.join('\n')
                      : editData.caseNumber}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Principle Law — full width */}
          <div className="border border-theme-border/50 rounded-xl bg-theme-surface-alt/50 p-3">
            <div className="flex items-center gap-2 mb-2 text-brand-orange font-semibold text-sm">
              <Scale className="w-4 h-4" />
              Principle Law
            </div>
            <Input 
              variant="light" 
              inputSize="sm" 
              placeholder="Enter principle law..." 
              error={errors.principleLaw}
              {...register('principleLaw')}
            />
          </div>

          {/* Legal Maxim — full width */}
          <div className="border border-theme-border/50 rounded-xl bg-theme-surface-alt/50 p-3">
            <div className="flex items-center gap-2 mb-2 text-brand-orange font-semibold text-sm">
              <Scale className="w-4 h-4" />
              Legal Maxim
            </div>
            <Input 
              variant="light" 
              inputSize="sm" 
              placeholder="Enter legal maxim..." 
              error={errors.legalMaxim}
              {...register('legalMaxim')}
            />
          </div>

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

