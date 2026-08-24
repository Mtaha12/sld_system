import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [showSuccess, setShowSuccess] = useState(false);

  // States for repeatable blocks
  const [blocks, setBlocks] = useState([
    { id: 1, sectionHeading: '', fromDate: null, toDate: null, detail: '' },
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
    }, 3000);
  };

  return (
    <div className="flex flex-col bg-theme-surface relative">
      
      <PageHeader 
        title={<>Add <span className="text-brand-orange">Statute Form</span> Detail</>}
        subtitle="Enter the statute information and content details"
        icon={FileText}
        onClose={() => navigate('/manage-statutes')}
      />

      <div className="p-6">
        
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

        <form id="statute-form" onSubmit={handleSubmit} className="space-y-6">
          
          <FormSection title="Record Information" icon={FileText}>
            
            {/* Top row fields */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-end">
              <FormField label="SR #" required className="col-span-1 md:col-span-2">
                <Input variant="light" inputSize="sm" placeholder="e.g. 9339" required />
              </FormField>
              <FormField label="Department" className="col-span-1 md:col-span-3">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  options={[{ label: 'Tax', value: 'tax' }]} 
                />
              </FormField>
              <FormField label="Chapter" className="col-span-1 md:col-span-3">
                <Input variant="light" inputSize="sm" placeholder="e.g. CHAPTER-XIX" />
              </FormField>
              <FormField label="Display" required className="col-span-1 md:col-span-2">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]} 
                  required
                />
              </FormField>
              <FormField label="Status" required className="col-span-1 md:col-span-2">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
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
                  type="select" 
                  options={[{ label: 'Income Tax Rules, 2002', value: 'income_tax' }]} 
                />
              </FormField>
              <FormField label="Section">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  options={[{ label: '231CB', value: '231cb' }]} 
                />
              </FormField>
            </div>

            {/* Bottom row fields */}
            <div className="grid grid-cols-1 gap-4 items-end">
              <FormField label="Heading">
                <textarea 
                  rows={3}
                  className="w-full px-3 py-2 border border-theme-border rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange shadow-sm resize-y text-theme-main"
                  placeholder="Enter heading..."
                ></textarea>
              </FormField>
            </div>

          </FormSection>

          {/* Repeatable Content Blocks */}
          <FormSection title="Content Details" icon={Layers}>
            <div className="space-y-8">
              {blocks.map((block, index) => (
                <div key={block.id} className="bg-[#FAFAFA] border border-theme-border rounded-xl p-6 relative">
                  
                  {/* Block Number Badge */}
                  <div className="absolute top-0 right-0 bg-gray-200 text-theme-main px-3 py-1 rounded-bl-xl rounded-tr-xl text-xs font-bold tracking-wider">
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
        submitText="Add Record"
      />

    </div>
  );
};

export default AddStatuteForm;
