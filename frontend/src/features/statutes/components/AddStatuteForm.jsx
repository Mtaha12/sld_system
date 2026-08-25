import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, CheckCircle2, FileText, Layers } from 'lucide-react';

import Input from '../../../components/ui/Input';
import DatePicker from '../../../components/ui/DatePicker';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import FormSection from '../../../components/ui/FormSection';
import FormField from '../../../components/ui/FormField';
import FileUpload from '../../../components/ui/FileUpload';
import PageHeader from '../../../components/ui/PageHeader';
import FormFooter from '../../../components/ui/FormFooter';

const AddStatuteForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.statuteData;
  const isEdit = Boolean(location.state?.isEdit || editData);

  const [showSuccess, setShowSuccess] = useState(false);
  const [srNumber, setSrNumber] = useState(() => editData?.id || '9339');
  const [department, setDepartment] = useState(() => editData?.department?.toLowerCase() || 'tax');
  const [chapter, setChapter] = useState(() => editData?.chapter || '');
  const [display, setDisplay] = useState(() => (editData?.display?.toLowerCase() === 'no' ? 'no' : 'yes'));
  const [status, setStatus] = useState(() => (editData?.display === 'No' ? 'inactive' : 'active'));
  const [law, setLaw] = useState(() => editData?.law || 'Income Tax Rules, 2002');
  const [section, setSection] = useState(() => editData?.section || '231CB');
  const [heading, setHeading] = useState(() => editData?.heading || '');

  // States for repeatable blocks
  const [blocks, setBlocks] = useState(() => [
    { 
      id: 1, 
      sectionHeading: editData?.sectionHeading || '', 
      fromDate: editData?.dated ? new Date(editData.dated) : null, 
      toDate: null, 
      detail: isEdit ? `<p><strong>${editData?.sectionHeading || 'Statute Section'}</strong></p><p>Detailed statutory provisions, regulatory clauses, and compliance directives under ${editData?.law || 'Statutory Code'}.</p>` : '' 
    },
    { id: 2, sectionHeading: '', fromDate: null, toDate: null, detail: '' },
    { id: 3, sectionHeading: '', fromDate: null, toDate: null, detail: '' },
    { id: 4, sectionHeading: '', fromDate: null, toDate: null, detail: '' }
  ]);

  const updateBlock = (id, field, value) => {
    setBlocks(blocks.map(block => block.id === id ? { ...block, [field]: value } : block));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      navigate('/manage-statutes');
    }, 2500);
  };

  return (
    <div className="flex flex-col bg-theme-surface relative">
      
      <PageHeader 
        title={<>{isEdit ? 'Edit' : 'Add'} <span className="text-brand-orange">Statute Form</span> Detail</>}
        subtitle={isEdit ? "Update the statute information and content details" : "Enter the statute information and content details"}
        icon={FileText}
        onClose={() => navigate('/manage-statutes')}
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

        <form id="statute-form" onSubmit={handleSubmit} className="space-y-6">
          
          <FormSection title="Record Information" icon={FileText}>
            
            {/* Top row fields */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-end">
              <FormField label="SR #" required className="col-span-1 md:col-span-2">
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  value={srNumber}
                  onChange={(e) => setSrNumber(e.target.value)}
                  placeholder="e.g. 9339" 
                  required 
                />
              </FormField>
              <FormField label="Department" className="col-span-1 md:col-span-3">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  options={[{ label: 'Tax', value: 'tax' }, { label: 'Civil', value: 'civil' }]} 
                />
              </FormField>
              <FormField label="Chapter" className="col-span-1 md:col-span-3">
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="e.g. CHAPTER-XIX" 
                />
              </FormField>
              <FormField label="Display" required className="col-span-1 md:col-span-2">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]} 
                  required
                />
              </FormField>
              <FormField label="Status" required className="col-span-1 md:col-span-2">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]} 
                  required
                />
              </FormField>
            </div>

            {/* Middle row fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 items-end">
              <FormField label="Law/Statute">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  value={law}
                  onChange={(e) => setLaw(e.target.value)}
                  placeholder="Enter Law or Statute name..."
                />
              </FormField>
              <FormField label="Section">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="Enter section (e.g. 231CB)..."
                />
              </FormField>
            </div>

            {/* Bottom row fields */}
            <div className="grid grid-cols-1 gap-4 items-end">
              <FormField label="Heading">
                <textarea 
                  rows={3}
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange shadow-sm resize-y text-theme-main bg-theme-surface"
                  placeholder="Enter heading..."
                ></textarea>
              </FormField>
            </div>

          </FormSection>

          {/* Repeatable Content Blocks */}
          <FormSection title="Content Details" icon={Layers}>
            <div className="space-y-8">
              {blocks.map((block, index) => (
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
                        value={block.sectionHeading}
                        onChange={(e) => updateBlock(block.id, 'sectionHeading', e.target.value)}
                      />
                    </FormField>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left Column: Dates & Attachment */}
                      <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
                        <FormField label="From Date">
                          <DatePicker 
                            selectedDate={block.fromDate} 
                            onChange={(d) => updateBlock(block.id, 'fromDate', d)} 
                            placeholder="mm/dd/yyyy"
                          />
                        </FormField>

                        <FormField label="To Date">
                          <DatePicker 
                            selectedDate={block.toDate} 
                            onChange={(d) => updateBlock(block.id, 'toDate', d)} 
                            placeholder="mm/dd/yyyy"
                          />
                        </FormField>
                        
                        <FormField label="Attachment" className="flex-1 flex flex-col">
                          <FileUpload />
                        </FormField>
                      </div>

                      {/* Right Column: Editor */}
                      <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-[350px]">
                        <FormField label="Detail" className="flex-1 flex flex-col">
                          <div className="flex-1 h-full relative z-0">
                            <RichTextEditor 
                              value={block.detail} 
                              onChange={(d) => updateBlock(block.id, 'detail', d)}
                              minHeight={320}
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
        submitText={isEdit ? "Update Record" : "Add Record"}
      />

    </div>
  );
};

export default AddStatuteForm;

