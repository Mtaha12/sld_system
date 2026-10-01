import React, { useState, useEffect } from 'react';
import { X, BookA, AlertCircle } from 'lucide-react';
import Input from '../../../components/ui/Input';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import { dictionaryService } from '../services/dictionaryService';

const AddDictionaryForm = ({
  editData = null,
  onClose,
  onSuccess,
  className = ""
}) => {
  const isEdit = Boolean(editData && (editData.id || editData.mongoId));

  const [words, setWords] = useState('');
  const [srNumber, setSrNumber] = useState('');
  const [meaning, setMeaning] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (editData) {
      setWords(editData.words || '');
      setSrNumber(editData.srNumber ? editData.srNumber.toString() : '');
      setMeaning(editData.meaning || '');
    } else {
      setWords('');
      setSrNumber('');
      setMeaning('');
    }
    setErrors({});
    setServerError('');
  }, [editData]);

  const validate = () => {
    const newErrors = {};
    if (!words.trim()) newErrors.words = 'Words is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        words: words.trim(),
        meaning: meaning || ''
      };
      if (srNumber && !isNaN(Number(srNumber))) {
        payload.srNumber = parseInt(srNumber, 10);
      }

      let result;
      if (isEdit) {
        const targetId = editData.mongoId || editData.id || editData.dictionaryId;
        result = await dictionaryService.updateDictionary(targetId, payload);
      } else {
        result = await dictionaryService.createDictionary(payload);
      }

      if (onSuccess) {
        onSuccess(result, isEdit ? 'Dictionary entry updated.' : 'Dictionary entry added.');
      }
      if (onClose) onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to save dictionary entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden animate-fade-in ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-theme-border bg-gray-50/70 dark:bg-theme-surface-alt/40">
        <div className="flex items-center gap-2">
          <BookA className="w-4 h-4 text-brand-orange" />
          <h2 className="text-sm font-semibold text-theme-main">
            {isEdit ? 'Edit Dictionary Detail' : 'Add Dictionary Detail'}
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-theme-main dark:hover:text-white transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
          >
            <span>close</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {serverError && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Row 1: Words * */}
        <FormField label="Words" required>
          <Input
            inputSize="sm"
            value={words}
            onChange={(e) => {
              setWords(e.target.value);
              if (errors.words) setErrors(prev => ({ ...prev, words: null }));
            }}
            placeholder="Enter word or legal term..."
            error={Boolean(errors.words)}
            autoFocus
          />
          {errors.words && <span className="text-[11px] text-red-500">{errors.words}</span>}
        </FormField>

        {/* Row 2: Sr # * (NO status box) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Sr #">
            <Input
              type="number"
              inputSize="sm"
              value={srNumber}
              onChange={(e) => setSrNumber(e.target.value)}
              placeholder="Auto-assigned if left blank"
            />
          </FormField>
        </div>

        {/* Meaning (Rich text editor) */}
        <FormField label="Meaning">
          <div className="border border-theme-border rounded-lg overflow-hidden shadow-sm">
            <RichTextEditor
              value={meaning}
              onChange={(val) => setMeaning(val)}
              placeholder="Enter dictionary meaning and legal definitions..."
              minHeight={180}
            />
          </div>
        </FormField>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-theme-border">
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
            className="bg-[#00bcd4] hover:bg-[#00acc1] text-white h-[34px] px-5 text-xs font-medium cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Record' : 'Add Record')}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default AddDictionaryForm;
