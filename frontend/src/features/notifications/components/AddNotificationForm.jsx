import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, CheckCircle2, FileText, Bell, Layers } from 'lucide-react';

import Input from '../../../components/ui/Input';
import DatePicker from '../../../components/ui/DatePicker';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import FormSection from '../../../components/ui/FormSection';
import FormField from '../../../components/ui/FormField';
import FileUpload from '../../../components/ui/FileUpload';
import PageHeader from '../../../components/ui/PageHeader';
import FormFooter from '../../../components/ui/FormFooter';

const AddNotificationForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.notificationData;
  const isEdit = Boolean(location.state?.isEdit || editData);

  const [showSuccess, setShowSuccess] = useState(false);
  const [srNumber, setSrNumber] = useState(() => editData?.srNumber || '11675');
  const [department, setDepartment] = useState(() => editData?.department?.toLowerCase() || 'notifications');
  const [subDepartment, setSubDepartment] = useState(() => editData?.subDepartment || 'federal');
  const [year, setYear] = useState(() => editData?.year || '2026');
  const [number, setNumber] = useState(() => editData?.number || '14');
  const [sroNumber, setSroNumber] = useState(() => editData?.sroNumber || '');
  const [subject, setSubject] = useState(() => editData?.subject || '');
  const [status, setStatus] = useState(() => editData?.status?.toLowerCase() || 'active');
  const [lawStatute, setLawStatute] = useState(() => editData?.lawStatute || '');
  const [section, setSection] = useState(() => editData?.section || '');

  // States for repeatable blocks
  const [blocks, setBlocks] = useState(() => [
    { 
      id: 1, 
      date: editData?.lawDate ? new Date(editData.lawDate) : null, 
      detail: isEdit ? `<p><strong>${editData?.subject || 'Notification'}</strong></p><p>Official statutory notification details and circular directives issued under the applicable legal framework.</p>` : '' 
    },
    { id: 2, date: null, detail: '' },
    { id: 3, date: null, detail: '' },
    { id: 4, date: null, detail: '' }
  ]);

  const updateBlock = (id, field, value) => {
    setBlocks(blocks.map(block => block.id === id ? { ...block, [field]: value } : block));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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

        <form id="notification-form" onSubmit={handleSubmit} className="space-y-6">
          
          <FormSection title="Record Information" icon={FileText}>
            
            {/* Top row fields */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 items-end">
              <FormField label="SR #" required>
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  value={srNumber}
                  onChange={(e) => setSrNumber(e.target.value)}
                  placeholder="11675" 
                  required 
                />
              </FormField>
              <FormField label="Department" required>
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  options={[{ label: 'Notifications', value: 'notifications' }]} 
                />
              </FormField>
              <FormField label="Sub Department" required>
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  value={subDepartment}
                  onChange={(e) => setSubDepartment(e.target.value)}
                  options={[{ label: 'Federal', value: 'federal' }]} 
                />
              </FormField>
              <FormField label="Year" required>
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2026" 
                  required 
                />
              </FormField>
              <FormField label="Number" required>
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Enter number..." 
                  required 
                />
              </FormField>
            </div>

            {/* Middle row fields */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-end">
              <FormField label="SRO #" required className="col-span-1 md:col-span-3">
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  value={sroNumber}
                  onChange={(e) => setSroNumber(e.target.value)}
                  placeholder="Enter SRO #..." 
                  required 
                />
              </FormField>
              <FormField label="Subject" className="col-span-1 md:col-span-6">
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter Subject..." 
                />
              </FormField>
              <FormField label="Status" required className="col-span-1 md:col-span-3">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  type="select" 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]} 
                />
              </FormField>
            </div>

            {/* Bottom row fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <FormField label="Law/Statute 1">
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  value={lawStatute}
                  onChange={(e) => setLawStatute(e.target.value)}
                  placeholder="Enter Law or Statute name..."
                />
              </FormField>
              <FormField label="Section 1">
                <Input 
                  variant="light" 
                  inputSize="sm" 
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="Enter Section..." 
                />
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
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                    
                    {/* Left Column: Date & Attachment */}
                    <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
                      <FormField label="Law Date">
                        <DatePicker 
                          selectedDate={block.date} 
                          onChange={(d) => updateBlock(block.id, 'date', d)} 
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
              ))}
            </div>
          </FormSection>

        </form>
      </div>

      <FormFooter 
        formId="notification-form"
        onCancel={() => navigate('/manage-notifications')}
        submitText={isEdit ? "Update Record" : "Add Record"}
      />

    </div>
  );
};

export default AddNotificationForm;

