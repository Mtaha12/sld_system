import React, { useState, useEffect, useRef } from 'react';
import { X, Layers, AlertCircle, Paperclip, Plus, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import { customTariffService } from '../services/customTariffService';

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const createEmptyTariffItem = () => ({
  pctCode: '',
  description: '',
  uom: '',
  cd: '',
  ad: '',
  rd: '',
  exSth: '',
  con: '',
  st: '',
  wht: '',
  other: '',
  subDetail: ''
});

const AddCustomTariffForm = ({
  editData = null,
  onClose,
  onSuccess,
  className = ""
}) => {
  const isEdit = Boolean(editData && (editData.id || editData.mongoId));
  const fileInputRef = useRef(null);

  const [sldNumber, setSldNumber] = useState('');
  const [dated, setDated] = useState(getTodayDateString());
  const [fromYear, setFromYear] = useState(new Date().getFullYear().toString());
  const [toYear, setToYear] = useState((new Date().getFullYear() + 1).toString());
  const [status, setStatus] = useState('Active');
  const [heading, setHeading] = useState('');
  const [attachment, setAttachment] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [detail, setDetail] = useState('');
  
  // Existing items
  const [items, setItems] = useState([createEmptyTariffItem()]);

  // Bottom new item draft (row with + button)
  const [newItemDraft, setNewItemDraft] = useState(createEmptyTariffItem());

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (editData) {
      setSldNumber(editData.sldNumber || '');
      setDated(editData.dated || getTodayDateString());
      setFromYear(editData.fromYear ? editData.fromYear.toString() : '');
      setToYear(editData.toYear ? editData.toYear.toString() : '');
      setStatus(editData.status || 'Active');
      setHeading(editData.heading || '');
      setAttachment(editData.attachment || '');
      setAttachmentName(editData.attachmentName || '');
      setDetail(editData.detail || '');
      setItems(Array.isArray(editData.items) && editData.items.length > 0 ? editData.items : [createEmptyTariffItem()]);
    } else {
      const curYear = new Date().getFullYear();
      setSldNumber('');
      setDated(getTodayDateString());
      setFromYear(curYear.toString());
      setToYear((curYear + 1).toString());
      setStatus('Active');
      setHeading('');
      setAttachment('');
      setAttachmentName('');
      setDetail('');
      setItems([createEmptyTariffItem()]);
    }
    setNewItemDraft(createEmptyTariffItem());
    setErrors({});
    setServerError('');
  }, [editData]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, attachment: 'File size exceeds 5MB limit.' }));
      return;
    }

    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment(reader.result);
      setErrors(prev => ({ ...prev, attachment: null }));
    };
    reader.readAsDataURL(file);
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) {
      setItems([createEmptyTariffItem()]);
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddDraftItem = () => {
    const hasContent = Object.values(newItemDraft).some(v => Boolean(v && v.trim()));
    if (!hasContent) {
      setItems(prev => [...prev, createEmptyTariffItem()]);
      return;
    }
    setItems(prev => [...prev, { ...newItemDraft }]);
    setNewItemDraft(createEmptyTariffItem());
  };

  const validate = () => {
    const newErrors = {};
    if (!sldNumber.trim()) newErrors.sldNumber = 'SLD # is required';
    if (!dated) newErrors.dated = 'Dated is required';
    if (!fromYear) newErrors.fromYear = 'From Year is required';
    if (!toYear) newErrors.toYear = 'To Year is required';
    if (!status) newErrors.status = 'Status is required';
    if (!heading.trim()) newErrors.heading = 'Heading is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const finalItems = [...items];
      const hasDraftContent = Object.values(newItemDraft).some(v => Boolean(v && v.trim()));
      if (hasDraftContent) {
        finalItems.push(newItemDraft);
      }

      const payload = {
        sldNumber: sldNumber.trim(),
        dated: dated.trim(),
        fromYear: fromYear.toString().trim(),
        toYear: toYear.toString().trim(),
        status,
        heading: heading.trim(),
        attachment,
        attachmentName,
        detail: detail || '',
        items: finalItems
      };

      let result;
      if (isEdit) {
        const targetId = editData.mongoId || editData.id || editData.customTariffId;
        result = await customTariffService.updateCustomTariff(targetId, payload);
      } else {
        result = await customTariffService.createCustomTariff(payload);
      }

      if (onSuccess) {
        onSuccess(result, isEdit ? 'Custom Tariff updated successfully.' : 'Custom Tariff record created successfully.');
      }
      if (onClose) onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to save custom tariff record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden animate-fade-in ${className}`}>
      
      {/* Header bar matching theme of other pages */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-border bg-gray-50/70 dark:bg-theme-surface-alt/40">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-orange" />
          <h2 className="text-sm font-semibold text-theme-main">
            {isEdit ? 'Edit Custom Tariffs Detail' : 'Add Custom Tariffs Detail'}
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-theme-muted hover:text-theme-main transition-colors text-xs font-medium cursor-pointer flex items-center gap-1"
          >
            <span>close</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
        {serverError && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Row 1: SLD # *, Dated *, From Year *, To Year *, Status * */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-theme-main block mb-1">
              SLD # <span className="text-brand-orange">*</span>
            </label>
            <input
              type="text"
              value={sldNumber}
              onChange={(e) => {
                setSldNumber(e.target.value);
                if (errors.sldNumber) setErrors(prev => ({ ...prev, sldNumber: null }));
              }}
              placeholder="e.g. SLD-001"
              className={`w-full px-3 py-1.5 bg-theme-surface border ${errors.sldNumber ? 'border-red-500' : 'border-theme-border'} rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange transition-colors`}
            />
            {errors.sldNumber && <span className="text-[10px] text-red-500 block mt-0.5">{errors.sldNumber}</span>}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-theme-main block mb-1">
              Dated <span className="text-brand-orange">*</span>
            </label>
            <input
              type="date"
              value={dated}
              onChange={(e) => {
                setDated(e.target.value);
                if (errors.dated) setErrors(prev => ({ ...prev, dated: null }));
              }}
              className={`w-full px-3 py-1.5 bg-theme-surface border ${errors.dated ? 'border-red-500' : 'border-theme-border'} rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange transition-colors`}
            />
            {errors.dated && <span className="text-[10px] text-red-500 block mt-0.5">{errors.dated}</span>}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-theme-main block mb-1">
              From Year <span className="text-brand-orange">*</span>
            </label>
            <input
              type="text"
              value={fromYear}
              onChange={(e) => {
                setFromYear(e.target.value);
                if (errors.fromYear) setErrors(prev => ({ ...prev, fromYear: null }));
              }}
              placeholder="e.g. 2026"
              className={`w-full px-3 py-1.5 bg-theme-surface border ${errors.fromYear ? 'border-red-500' : 'border-theme-border'} rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange transition-colors`}
            />
            {errors.fromYear && <span className="text-[10px] text-red-500 block mt-0.5">{errors.fromYear}</span>}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-theme-main block mb-1">
              To Year <span className="text-brand-orange">*</span>
            </label>
            <input
              type="text"
              value={toYear}
              onChange={(e) => {
                setToYear(e.target.value);
                if (errors.toYear) setErrors(prev => ({ ...prev, toYear: null }));
              }}
              placeholder="e.g. 2027"
              className={`w-full px-3 py-1.5 bg-theme-surface border ${errors.toYear ? 'border-red-500' : 'border-theme-border'} rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange transition-colors`}
            />
            {errors.toYear && <span className="text-[10px] text-red-500 block mt-0.5">{errors.toYear}</span>}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-theme-main block mb-1">
              Status <span className="text-brand-orange">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-1.5 bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange transition-colors"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Row 2: Heading * */}
        <div>
          <label className="text-[11px] font-semibold text-theme-main block mb-1">
            Heading <span className="text-brand-orange">*</span>
          </label>
          <input
            type="text"
            value={heading}
            onChange={(e) => {
              setHeading(e.target.value);
              if (errors.heading) setErrors(prev => ({ ...prev, heading: null }));
            }}
            placeholder="Enter custom tariff heading..."
            className={`w-full px-3 py-1.5 bg-theme-surface border ${errors.heading ? 'border-red-500' : 'border-theme-border'} rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange transition-colors`}
          />
          {errors.heading && <span className="text-[10px] text-red-500 block mt-0.5">{errors.heading}</span>}
        </div>

        {/* Row 3: Attachment */}
        <div>
          <label className="text-[11px] font-semibold text-theme-main block mb-1">
            Attachment
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-[#00bcd4] hover:bg-[#00acc1] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
            >
              <Paperclip className="w-3.5 h-3.5" />
              Choose File
            </button>
            <span className="text-xs text-theme-muted truncate max-w-[280px]">
              {attachmentName || 'No file chosen'}
            </span>
            {attachmentName && (
              <button
                type="button"
                onClick={() => {
                  setAttachment('');
                  setAttachmentName('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-theme-muted hover:text-red-500 p-0.5 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-[10px] text-red-500 block mt-1">Max allowed size is 5MB</span>
          {errors.attachment && <span className="text-[10px] text-red-500 block mt-0.5">{errors.attachment}</span>}
        </div>

        {/* Row 4: Detail (General) */}
        <div>
          <label className="text-[11px] font-semibold text-theme-main block mb-1">
            Detail
          </label>
          <RichTextEditor
            name="custom_tariff_general_detail"
            value={detail}
            onChange={(val) => setDetail(val)}
            placeholder="Enter general custom tariff detail..."
            minHeight={150}
          />
        </div>

        {/* Dynamic Items List */}
        {items.map((item, idx) => (
          <div key={idx} className="space-y-3 pt-1">
            
            {/* Orange Header Table Bar for Item */}
            <div className="overflow-x-auto border border-amber-300 dark:border-amber-600/40 rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f59e0b] dark:bg-[#d97706] text-white font-bold text-[11px]">
                    <th className="p-2 border-r border-amber-400/40 w-24">PCT Code</th>
                    <th className="p-2 border-r border-amber-400/40">Description</th>
                    <th className="p-2 border-r border-amber-400/40 w-20">UOM</th>
                    <th className="p-2 border-r border-amber-400/40 w-20">CD (%)</th>
                    <th className="p-2 border-r border-amber-400/40 w-20">AD (%)</th>
                    <th className="p-2 border-r border-amber-400/40 w-20">RD (%)</th>
                    <th className="p-2 border-r border-amber-400/40 w-20">Ex./Sth (%)</th>
                    <th className="p-2 border-r border-amber-400/40 w-20">CON (%)</th>
                    <th className="p-2 border-r border-amber-400/40 w-20">ST (%)</th>
                    <th className="p-2 border-r border-amber-400/40 w-20">WHT (%)</th>
                    <th className="p-2 w-20">Other</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white dark:bg-theme-surface">
                    <td className="p-1 border-r border-theme-border">
                      <input
                        type="text"
                        value={item.pctCode}
                        onChange={(e) => handleItemChange(idx, 'pctCode', e.target.value)}
                        placeholder="PCT Code"
                        className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                      />
                    </td>
                    <td className="p-1 border-r border-theme-border">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                      />
                    </td>
                    <td className="p-1 border-r border-theme-border">
                      <input
                        type="text"
                        value={item.uom}
                        onChange={(e) => handleItemChange(idx, 'uom', e.target.value)}
                        placeholder="UOM"
                        className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                      />
                    </td>
                    <td className="p-1 border-r border-theme-border">
                      <input
                        type="text"
                        value={item.cd}
                        onChange={(e) => handleItemChange(idx, 'cd', e.target.value)}
                        placeholder="CD (%)"
                        className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                      />
                    </td>
                    <td className="p-1 border-r border-theme-border">
                      <input
                        type="text"
                        value={item.ad}
                        onChange={(e) => handleItemChange(idx, 'ad', e.target.value)}
                        placeholder="AD (%)"
                        className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                      />
                    </td>
                    <td className="p-1 border-r border-theme-border">
                      <input
                        type="text"
                        value={item.rd}
                        onChange={(e) => handleItemChange(idx, 'rd', e.target.value)}
                        placeholder="RD (%)"
                        className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                      />
                    </td>
                    <td className="p-1 border-r border-theme-border">
                      <input
                        type="text"
                        value={item.exSth}
                        onChange={(e) => handleItemChange(idx, 'exSth', e.target.value)}
                        placeholder="Ex./Sth"
                        className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                      />
                    </td>
                    <td className="p-1 border-r border-theme-border">
                      <input
                        type="text"
                        value={item.con}
                        onChange={(e) => handleItemChange(idx, 'con', e.target.value)}
                        placeholder="CON (%)"
                        className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                      />
                    </td>
                    <td className="p-1 border-r border-theme-border">
                      <input
                        type="text"
                        value={item.st}
                        onChange={(e) => handleItemChange(idx, 'st', e.target.value)}
                        placeholder="ST (%)"
                        className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                      />
                    </td>
                    <td className="p-1 border-r border-theme-border">
                      <input
                        type="text"
                        value={item.wht}
                        onChange={(e) => handleItemChange(idx, 'wht', e.target.value)}
                        placeholder="WHT (%)"
                        className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                      />
                    </td>
                    <td className="p-1">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={item.other}
                          onChange={(e) => handleItemChange(idx, 'other', e.target.value)}
                          placeholder="Other"
                          className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                        />
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="p-1 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Sub Detail for Item (e.g. Detail 1, Detail 2) */}
            <div>
              <label className="text-[11px] font-semibold text-theme-main block mb-1">
                Detail {idx + 1}
              </label>
              <RichTextEditor
                name={`custom_tariff_detail_${idx + 1}`}
                value={item.subDetail}
                onChange={(val) => handleItemChange(idx, 'subDetail', val)}
                placeholder={`Enter detail for Item #${idx + 1}...`}
                minHeight={130}
              />
            </div>

          </div>
        ))}

        {/* Row 7: Second Orange Table with '+' Button */}
        <div className="pt-2">
          <div className="overflow-x-auto border border-amber-300 dark:border-amber-600/40 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="bg-[#f59e0b] dark:bg-[#d97706] text-white font-bold text-[11px]">
                  <th className="p-2 border-r border-amber-400/40 w-10 text-center"></th>
                  <th className="p-2 border-r border-amber-400/40 w-24">PCT Code</th>
                  <th className="p-2 border-r border-amber-400/40">Description</th>
                  <th className="p-2 border-r border-amber-400/40 w-20">UOM</th>
                  <th className="p-2 border-r border-amber-400/40 w-20">CD (%)</th>
                  <th className="p-2 border-r border-amber-400/40 w-20">AD (%)</th>
                  <th className="p-2 border-r border-amber-400/40 w-20">RD (%)</th>
                  <th className="p-2 border-r border-amber-400/40 w-20">Ex./Sth (%)</th>
                  <th className="p-2 border-r border-amber-400/40 w-20">CON (%)</th>
                  <th className="p-2 border-r border-amber-400/40 w-20">ST (%)</th>
                  <th className="p-2 border-r border-amber-400/40 w-20">WHT (%)</th>
                  <th className="p-2 w-20">Other</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-theme-surface">
                  <td className="p-1 border-r border-theme-border text-center">
                    <button
                      type="button"
                      onClick={handleAddDraftItem}
                      className="w-6 h-6 inline-flex items-center justify-center font-bold text-base text-theme-main hover:bg-gray-100 dark:hover:bg-theme-surface-hover rounded cursor-pointer transition-colors"
                      title="Add another item row"
                    >
                      +
                    </button>
                  </td>
                  <td className="p-1 border-r border-theme-border">
                    <input
                      type="text"
                      value={newItemDraft.pctCode}
                      onChange={(e) => setNewItemDraft(prev => ({ ...prev, pctCode: e.target.value }))}
                      placeholder="PCT Code"
                      className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                    />
                  </td>
                  <td className="p-1 border-r border-theme-border">
                    <input
                      type="text"
                      value={newItemDraft.description}
                      onChange={(e) => setNewItemDraft(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description"
                      className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                    />
                  </td>
                  <td className="p-1 border-r border-theme-border">
                    <input
                      type="text"
                      value={newItemDraft.uom}
                      onChange={(e) => setNewItemDraft(prev => ({ ...prev, uom: e.target.value }))}
                      placeholder="UOM"
                      className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                    />
                  </td>
                  <td className="p-1 border-r border-theme-border">
                    <input
                      type="text"
                      value={newItemDraft.cd}
                      onChange={(e) => setNewItemDraft(prev => ({ ...prev, cd: e.target.value }))}
                      placeholder="CD (%)"
                      className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                    />
                  </td>
                  <td className="p-1 border-r border-theme-border">
                    <input
                      type="text"
                      value={newItemDraft.ad}
                      onChange={(e) => setNewItemDraft(prev => ({ ...prev, ad: e.target.value }))}
                      placeholder="AD (%)"
                      className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                    />
                  </td>
                  <td className="p-1 border-r border-theme-border">
                    <input
                      type="text"
                      value={newItemDraft.rd}
                      onChange={(e) => setNewItemDraft(prev => ({ ...prev, rd: e.target.value }))}
                      placeholder="RD (%)"
                      className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                    />
                  </td>
                  <td className="p-1 border-r border-theme-border">
                    <input
                      type="text"
                      value={newItemDraft.exSth}
                      onChange={(e) => setNewItemDraft(prev => ({ ...prev, exSth: e.target.value }))}
                      placeholder="Ex./Sth"
                      className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                    />
                  </td>
                  <td className="p-1 border-r border-theme-border">
                    <input
                      type="text"
                      value={newItemDraft.con}
                      onChange={(e) => setNewItemDraft(prev => ({ ...prev, con: e.target.value }))}
                      placeholder="CON (%)"
                      className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                    />
                  </td>
                  <td className="p-1 border-r border-theme-border">
                    <input
                      type="text"
                      value={newItemDraft.st}
                      onChange={(e) => setNewItemDraft(prev => ({ ...prev, st: e.target.value }))}
                      placeholder="ST (%)"
                      className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                    />
                  </td>
                  <td className="p-1 border-r border-theme-border">
                    <input
                      type="text"
                      value={newItemDraft.wht}
                      onChange={(e) => setNewItemDraft(prev => ({ ...prev, wht: e.target.value }))}
                      placeholder="WHT (%)"
                      className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="text"
                      value={newItemDraft.other}
                      onChange={(e) => setNewItemDraft(prev => ({ ...prev, other: e.target.value }))}
                      placeholder="Other"
                      className="w-full px-2 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-theme-border">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-[34px] px-4 text-xs"
            >
              Cancel
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="bg-[#00bcd4] hover:bg-[#00acc1] text-white h-[34px] px-5 text-xs font-medium cursor-pointer shadow-sm"
          >
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Record' : 'Add Record')}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default AddCustomTariffForm;
