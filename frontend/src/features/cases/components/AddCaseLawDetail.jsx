import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  X, CheckCircle2, Scale, Plus, Upload, FileText,
  Search, Loader2, ChevronLeft, ChevronRight, Check
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
import { SECTION_OPTIONS } from '../../../data/sections';
import { settingService } from '../../../services/settingService';
import { courtService, magazineService } from '../../../services/adminSettingsServices';

/**
 * Maps raw case data from API or navigation state into clean form values.
 * Strictly avoids hardcoding dummy text.
 */
const getInitialValues = (data = null) => {
  if (!data) {
    return {
      srNumber: '',
      dated: null,
      department: 'tax',
      court: 'Appellate Tribunal Inland Revenue',
      caseNumber: '',
      judges: '',
      petitioners: '',
      lawyers: '',
      headNote: '',
      references: '',
      principleLaw: '',
      legalMaxim: '',
      judgment: '',
      publications: [
        { id: 1, year: '2026', vol: '', mag: 'sld', page: '' }
      ],
      laws: [
        { id: 1, lawStatute: '', section: '' }
      ],
      attachments: []
    };
  }

  const pubs = Array.isArray(data.publications) && data.publications.length > 0
    ? data.publications.map((p, idx) => ({
        id: idx + 1,
        year: String(p.year || ''),
        vol: String(p.vol || ''),
        mag: String(p.mag || 'sld'),
        page: String(p.page || '')
      }))
    : [{ id: 1, year: '', vol: '', mag: 'sld', page: '' }];

  const laws = Array.isArray(data.laws) && data.laws.length > 0
    ? data.laws.map((l, idx) => ({
        id: idx + 1,
        lawStatute: String(l.lawStatute || ''),
        section: String(l.section || '')
      }))
    : [{ id: 1, lawStatute: '', section: '' }];

  return {
    srNumber: String(data.sldNumber ?? ''),
    dated: data.dated ? new Date(data.dated) : null,
    department: data.department || 'tax',
    court: data.court || '',
    caseNumber: Array.isArray(data.caseNumber) ? data.caseNumber.join('\n') : String(data.caseNumber || ''),
    judges: Array.isArray(data.judges) ? data.judges.join('\n') : String(data.judges || ''),
    petitioners: Array.isArray(data.petitioners) ? data.petitioners.join('\n') : String(data.petitioners || ''),
    lawyers: Array.isArray(data.lawyers) ? data.lawyers.join('\n') : String(data.lawyers || ''),
    headNote: String(data.headNote || ''),
    references: String(data.references || ''),
    principleLaw: String(data.principleLaw || ''),
    legalMaxim: String(data.legalMaxim || ''),
    judgment: String(data.judgment || ''),
    publications: pubs,
    laws: laws,
    attachments: Array.isArray(data.attachments) ? data.attachments : []
  };
};

const AddCaseLawDetail = ({ onClose }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const editData = location.state?.caseData;

  const [currentCaseId, setCurrentCaseId] = useState(editData?.id || null);
  const [loadingCase, setLoadingCase] = useState(false);
  const [loadFeedback, setLoadFeedback] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [publicationVolumeOpen, setPublicationVolumeOpen] = useState({});

  // Dynamic dropdown options that adjust when cases with new courts/sections/laws load
  const [courtOptions, setCourtOptions] = useState(() => {
    const list = [{ label: 'Select Court', value: '' }];
    if (editData?.court) {
      list.push({ label: editData.court, value: editData.court });
    }
    return list;
  });

  const [magazineOptions, setMagazineOptions] = useState(() => {
    const list = [];
    if (Array.isArray(editData?.publications)) {
      editData.publications.forEach(p => {
        const val = String(p?.mag || '').trim().toLowerCase();
        if (val && !list.some(o => o.value === val)) {
          list.push({ label: val.toUpperCase(), value: val });
        }
      });
    }
    return list;
  });

  const [sectionOptions, setSectionOptions] = useState(() => {
    const existing = (editData?.laws || []).map(l => String(l?.section || '').trim()).filter(Boolean);
    return [
      { label: 'Select Section', value: '' },
      ...SECTION_OPTIONS,
      ...[...new Set(existing)]
        .filter(s => !SECTION_OPTIONS.some(o => o.value === s))
        .map(s => ({ label: s, value: s }))
    ];
  });

  const [dynamicLawOptions, setDynamicLawOptions] = useState(() => {
    const list = [{ label: 'Choose a law', value: '' }];
    if (Array.isArray(editData?.laws)) {
      editData.laws.forEach(l => {
        const val = String(l?.law || '').trim();
        if (val && !list.some(o => o.value === val)) {
          list.push({ label: val, value: val });
        }
      });
    }
    return list;
  });
  const [principleOptions, setPrincipleOptions] = useState([]);

  useEffect(() => {
    let isMounted = true;

    // Fetch dynamic Courts from backend
    courtService.getCourts({ status: 'active' })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const courts = res.data.map(c => ({ label: c.name, value: c.name }));
          setCourtOptions(prev => {
            const list = [{ label: 'Select Court', value: '' }, ...courts];
            const currentCourt = getValues('court') || editData?.court;
            if (currentCourt && !list.some(o => o.value === currentCourt)) {
              list.push({ label: currentCourt, value: currentCourt });
            }
            return list;
          });
        }
      })
      .catch(err => {
        console.warn('Could not load dynamic courts for AddCaseLawDetail:', err);
      });

    // Fetch dynamic Magazines from backend
    magazineService.getMagazines({ status: 'active' })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const mags = res.data.map(m => ({ label: m.name.toUpperCase(), value: m.name.toLowerCase() }));
          setMagazineOptions(prev => {
            const list = [...mags];
            const currentPubs = getValues('publications') || editData?.publications || [];
            currentPubs.forEach(p => {
              const val = String(p?.mag || '').trim().toLowerCase();
              if (val && !list.some(o => o.value === val)) {
                list.push({ label: val.toUpperCase(), value: val });
              }
            });
            return list;
          });
        }
      })
      .catch(err => {
        console.warn('Could not load dynamic magazines for AddCaseLawDetail:', err);
      });

    // Fetch dynamic Laws from backend
    settingService.getLaws({ status: 'active', limit: 5000 })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const fetched = res.data.map(l => ({ label: l.name, value: l.name }));
          const seen = new Set();
          const merged = [{ label: 'Choose a law', value: '' }];
          seen.add('');

          fetched.forEach(item => {
            const key = item.value.toLowerCase().trim();
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(item);
            }
          });

          // Retain any law currently on the case
          const currentLaws = getValues('laws') || editData?.laws || [];
          currentLaws.forEach(l => {
            const val = String(l?.law || '').trim();
            const key = val.toLowerCase();
            if (val && !seen.has(key)) {
              seen.add(key);
              merged.push({ label: val, value: val });
            }
          });

          setDynamicLawOptions(merged);
        }
      })
      .catch(err => {
        console.warn('Could not load dynamic laws for AddCaseLawDetail:', err);
      });

    settingService.getPrinciples({ status: 'active', limit: 1000 })
      .then(res => {
        if (isMounted && res?.data && Array.isArray(res.data)) {
          setPrincipleOptions(res.data.map(p => p.name));
        }
      })
      .catch(err => {
        console.warn('Could not load dynamic principles for AddCaseLawDetail:', err);
      });

    return () => { isMounted = false; };
  }, []);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(caseSchema),
    defaultValues: getInitialValues(editData),
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

  /**
   * Applies case data to form, volume toggles, and dropdown options
   */
  const applyCaseToForm = useCallback((caseData) => {
    if (!caseData) return;

    setCurrentCaseId(caseData.id || caseData._id || null);
    const formVals = getInitialValues(caseData);
    reset(formVals);

    // Track which publications have volume open
    const volMap = {};
    formVals.publications.forEach((p, idx) => {
      if (p.vol) volMap[idx] = true;
    });
    setPublicationVolumeOpen(volMap);

    // Ensure court is in options
    if (caseData.court) {
      setCourtOptions(prev => {
        if (!prev.some(o => o.value === caseData.court)) {
          return [...prev, { label: caseData.court, value: caseData.court }];
        }
        return prev;
      });
    }

    // Ensure sections are in options
    if (Array.isArray(caseData.laws) && caseData.laws.length > 0) {
      const newSecs = caseData.laws.map(l => String(l?.section || '').trim()).filter(Boolean);
      if (newSecs.length > 0) {
        setSectionOptions(prev => {
          const missing = newSecs.filter(s => !prev.some(o => o.value === s));
          if (missing.length > 0) {
            return [...prev, ...missing.map(s => ({ label: s, value: s }))];
          }
          return prev;
        });
      }
    }
  }, [reset]);

  /**
   * Loads case directly by SLD number from API without moving back
   */
  const loadCaseBySld = useCallback(async (targetSld) => {
    const cleanSld = String(targetSld ?? getValues('srNumber') ?? '').trim();
    if (!cleanSld) return;

    setLoadingCase(true);
    setLoadFeedback(null);

    try {
      const caseData = await caseService.getCaseBySld(cleanSld);
      if (caseData) {
        applyCaseToForm(caseData);
        setSearchParams({ sld: cleanSld }, { replace: true });
        setLoadFeedback({
          type: 'success',
          message: `SLD #${cleanSld} loaded: ${caseData.court || 'Case Record'}`
        });
      }
    } catch (err) {
      console.warn(`[Case Load] SLD #${cleanSld} lookup notice:`, err?.response?.data?.message || err.message);
      // Not found in database — keep the SLD # and clear other fields to allow creating new record
      setCurrentCaseId(null);
      reset({
        ...getInitialValues(null),
        srNumber: cleanSld
      });
      setSearchParams({ sld: cleanSld }, { replace: true });
      setLoadFeedback({
        type: 'notFound',
        message: `SLD #${cleanSld} not found in database. Ready to create a new case record.`
      });
    } finally {
      setLoadingCase(false);
      setTimeout(() => setLoadFeedback(null), 6000);
    }
  }, [getValues, applyCaseToForm, reset, setSearchParams]);

  /**
   * Step to previous or next SLD number
   */
  const handleStepSld = (delta) => {
    const rawVal = getValues('srNumber');
    const currentNum = parseInt(rawVal || '1', 10);
    const nextNum = Math.max(1, (isNaN(currentNum) ? 1 : currentNum) + delta);
    setValue('srNumber', String(nextNum));
    loadCaseBySld(nextNum);
  };

  // Initial load: from URL query param ?sld=... or navigation editData
  useEffect(() => {
    const sldQuery = searchParams.get('sld');
    if (sldQuery) {
      loadCaseBySld(sldQuery);
    } else if (editData?.sldNumber) {
      loadCaseBySld(editData.sldNumber);
    }
  }, [searchParams]);

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

  const onSubmit = async (data) => {
    try {
      if (currentCaseId) {
        await caseService.updateCase(currentCaseId, data);
        setSuccessMessage(`SLD #${data.srNumber || currentCaseId} updated successfully.`);
      } else {
        const created = await caseService.createCase(data);
        if (created?.data?.id) {
          setCurrentCaseId(created.data.id);
        }
        setSuccessMessage(`SLD #${data.srNumber} created successfully.`);
      }
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3500);
    } catch (error) {
      console.error('[Case Submit Error]', error);
      alert(error.response?.data?.message || 'Failed to save case law record.');
    }
  };

  const isEdit = Boolean(currentCaseId);

  return (
    <div className="flex flex-col bg-theme-surface relative">
      
      {/* Scrollable Content */}
      <div className="p-4">
        
        {/* Success Notification */}
        {showSuccess && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-between text-green-700 dark:text-green-400 animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="font-medium text-sm">
                SUCCESS: {successMessage || 'Case record saved successfully.'}
              </span>
            </div>
            <button type="button" onClick={() => setShowSuccess(false)}>
              <X className="w-4 h-4 hover:text-green-900 dark:hover:text-green-200" />
            </button>
          </div>
        )}

        <form id="case-law-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          
          {/* Case Information — SLD#, Date, Court with Quick-Change Controls */}
          <FormSection compact>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
              
              {/* SLD # with Fast Lookup & Stepper */}
              <div className="md:col-span-4">
                <FormField label="SLD #" required>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Input 
                        variant="light" 
                        inputSize="sm" 
                        placeholder="e.g. 1" 
                        error={errors.srNumber}
                        {...register('srNumber')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            loadCaseBySld(e.currentTarget.value);
                          }
                        }}
                      />
                      {loadingCase && (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                          <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
                        </div>
                      )}
                    </div>

                    {/* Step & Fetch Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title="Previous SLD"
                        onClick={() => handleStepSld(-1)}
                        disabled={loadingCase}
                        className="p-1.5 h-[34px] w-[34px] flex items-center justify-center rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main transition-colors disabled:opacity-50"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Next SLD"
                        onClick={() => handleStepSld(1)}
                        disabled={loadingCase}
                        className="p-1.5 h-[34px] w-[34px] flex items-center justify-center rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-muted hover:text-theme-main transition-colors disabled:opacity-50"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => loadCaseBySld()}
                        disabled={loadingCase}
                        className="h-[34px] text-xs px-2.5 border-brand-orange/40 text-brand-orange hover:bg-brand-orange/10 font-semibold"
                      >
                        {loadingCase ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Load'}
                      </Button>
                    </div>
                  </div>

                  {/* Dynamic Status Feedback */}
                  {loadFeedback && (
                    <div className={`mt-1.5 text-[11px] font-medium flex items-center gap-1.5 transition-all animate-fade-in ${
                      loadFeedback.type === 'success' ? 'text-green-600 dark:text-green-400' :
                      loadFeedback.type === 'notFound' ? 'text-amber-600 dark:text-amber-400' :
                      'text-red-500'
                    }`}>
                      {loadFeedback.type === 'success' && <Check className="w-3.5 h-3.5" />}
                      <span>{loadFeedback.message}</span>
                    </div>
                  )}
                </FormField>
              </div>

              {/* Date */}
              <div className="md:col-span-3">
                <FormField label="Date">
                  <Controller
                    control={control}
                    name="dated"
                    render={({ field }) => (
                      <DatePicker 
                        selectedDate={field.value} 
                        onChange={field.onChange} 
                        placeholder="YYYY-MM-DD" 
                        className="w-full" 
                      />
                    )}
                  />
                </FormField>
              </div>

              {/* Court */}
              <div className="md:col-span-5">
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
                      options={magazineOptions} 
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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

            {/* Row 3: Head Note (70%) + References (30%) */}
            <div className="grid grid-cols-1 md:grid-cols-10 gap-3 mb-3 items-start">
              <div className="md:col-span-7">
                <FormField label="Head Note">
                  <Textarea 
                    placeholder="Enter head note..."
                    minHeight="280px"
                    className="text-sm"
                    style={{ height: '280px', resize: 'vertical' }}
                    {...register('headNote')}
                  />
                </FormField>
              </div>
              <div className="md:col-span-3">
                <FormField label="References">
                  <Textarea 
                    placeholder="Enter references..."
                    minHeight="280px"
                    className="text-sm"
                    style={{ height: '280px', resize: 'vertical' }}
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
                      options={dynamicLawOptions}
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
              <FormSection title="Judgment Order" icon={Scale} compact className="h-full">
                <div className="flex-1 flex flex-col min-h-[260px] relative z-0">
                  <Controller
                    control={control}
                    name="judgment"
                    render={({ field }) => (
                      <RichTextEditor 
                        value={field.value} 
                        onChange={field.onChange} 
                        placeholder="Judgment text appears here..."
                      />
                    )}
                  />
                </div>
              </FormSection>
            </div>

            {/* Right column: Attachment & Details */}
            <div className="flex flex-col gap-3">

              {/* Attachment */}
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

              {/* Principle Law */}
              <div className="border border-theme-border/50 rounded-xl bg-theme-surface-alt/50 p-3">
                <div className="flex items-center gap-2 mb-2 text-brand-orange font-semibold text-sm">
                  <Scale className="w-4 h-4" />
                  Principle Law
                </div>
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  placeholder="Enter principle law..." 
                  list="principle-law-datalist"
                  error={errors.principleLaw}
                  {...register('principleLaw')}
                />
                <datalist id="principle-law-datalist">
                  {principleOptions.map((pName, pIdx) => (
                    <option key={pIdx} value={pName} />
                  ))}
                </datalist>
              </div>

              {/* Legal Maxim */}
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

            </div>
          </div>

        </form>
      </div>

      <FormFooter 
        formId="case-law-form"
        onCancel={onClose}
        isSubmitting={isSubmitting}
        submitText={isEdit ? "Update Case Record" : "Create Case Record"}
      />

    </div>
  );
};

export default AddCaseLawDetail;
