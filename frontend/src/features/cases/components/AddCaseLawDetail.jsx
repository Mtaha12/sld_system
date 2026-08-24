import React, { useState } from 'react';

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

const AddCaseLawDetail = ({ onClose }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [date, setDate] = useState(null);
  const [judgment, setJudgment] = useState('');

  // Dynamic lists for mock state
  const [publications, setPublications] = useState([{ id: 1 }]);
  const [laws, setLaws] = useState([{ id: 1 }]);

  const addPublication = () => {
    setPublications([...publications, { id: Date.now() }]);
  };

  const addLaw = () => {
    setLaws([...laws, { id: Date.now() }]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 3000);
  };

  return (
    <div className="flex flex-col bg-white relative">
      
      <PageHeader 
        title={<>Add <span className="text-brand-orange">Case Law</span> Detail</>}
        subtitle="Enter the case information and publication details"
        icon={FileText}
        onClose={onClose}
      />

      {/* Scrollable Content */}
      <div className="p-6">
        
        {/* Success Notification */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between text-green-700 animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">SUCCESS: Record added successfully.</span>
            </div>
            <button type="button" onClick={() => setShowSuccess(false)}>
              <X className="w-4 h-4 hover:text-green-900" />
            </button>
          </div>
        )}

        <form id="case-law-form" onSubmit={handleSubmit} className="space-y-6">
          
          {/* Case Information */}
          <FormSection title="Case Information" icon={FileText}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
              <FormField label="SR #" required>
                <Input variant="light" inputSize="sm" placeholder="163629" required />
              </FormField>
              <FormField label="Date">
                <DatePicker selectedDate={date} onChange={setDate} placeholder="2024-09-26" className="w-full" />
              </FormField>
              <FormField label="Department">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  options={[{ label: 'Tax', value: 'tax' }, { label: 'Civil', value: 'civil' }]} 
                />
              </FormField>
              <FormField label="Status">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]} 
                />
              </FormField>
            </div>

            <FormField label="Court" className="mb-4">
              <Input 
                variant="light" 
                inputSize="sm"
                type="select" 
                options={[{ label: 'Select Court', value: '' }, { label: 'Supreme Court', value: 'supreme' }]} 
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Case No.">
                <Textarea placeholder="Enter case numbers..." />
              </FormField>
              <FormField label="Judges">
                <Textarea placeholder="Enter judges..." />
              </FormField>
            </div>
          </FormSection>

          {/* Publication Details */}
          <FormSection title="Publication Details" icon={BookOpen}>
            <div className="space-y-3">
              {publications.map((pub, idx) => (
                <div key={pub.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <FormField label="Year" className="col-span-2">
                    <Input variant="light" inputSize="sm" placeholder="2026" />
                  </FormField>
                  <FormField label="Vol." className="col-span-2">
                    <Input variant="light" inputSize="sm" placeholder="Vol." />
                  </FormField>
                  <FormField label="Mag" className="col-span-2">
                    <Input variant="light" inputSize="sm" type="select" options={[{ label: 'SLD', value: 'sld' }]} />
                  </FormField>
                  <FormField label="Page" className="col-span-2">
                    <Input variant="light" inputSize="sm" placeholder={idx === 0 ? "3425" : "Page"} />
                  </FormField>
                  <FormField label="Month" className="col-span-2">
                    <Input variant="light" inputSize="sm" type="select" options={[{ label: 'August', value: 'august' }]} />
                  </FormField>
                  <div className="col-span-2 h-[38px] flex items-center">
                    {idx === publications.length - 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="w-full text-green-600 border-green-200 hover:bg-green-50 h-full" 
                        onClick={addPublication}
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
                <Textarea />
              </FormField>
              <FormField label="Lawyers">
                <Textarea />
              </FormField>
              <FormField label="Head Note">
                <Textarea />
              </FormField>
              <FormField label="References">
                <Textarea />
              </FormField>
            </div>

            <div className="space-y-3">
              {laws.map((law, idx) => (
                <div key={law.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <FormField label="Law/Statutes" className="col-span-5">
                    <Input variant="light" inputSize="sm" type="select" options={[{ label: 'Select', value: '' }]} />
                  </FormField>
                  <FormField label="Sections" className="col-span-5">
                    <Input variant="light" inputSize="sm" />
                  </FormField>
                  <div className="col-span-2 h-[38px] flex items-center">
                    {idx === laws.length - 1 && (
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm" 
                        className="w-full text-green-600 border-green-200 hover:bg-green-50 h-full" 
                        onClick={addLaw}
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
                  <RichTextEditor 
                    value={judgment} 
                    onChange={setJudgment} 
                    placeholder="Enter judgment details..."
                  />
                </div>
              </FormSection>
            </div>

            {/* Attachment */}
            <div>
              <FormSection title="Attachment" icon={Upload}>
                <FileUpload />
              </FormSection>
            </div>

          </div>

          {/* Principle Law */}
          <FormSection title="Principle Law" icon={Scale}>
            <Input variant="light" inputSize="sm" placeholder="Enter principle law..." />
          </FormSection>

        </form>
      </div>

      <FormFooter 
        formId="case-law-form"
        onCancel={onClose}
        submitText="Add Record"
      />

    </div>
  );
};

export default AddCaseLawDetail;
