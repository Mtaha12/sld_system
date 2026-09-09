import React, { useState, useEffect, useRef } from 'react';
import { X, Video, AlertCircle, Image as ImageIcon } from 'lucide-react';
import Input from '../../../components/ui/Input';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import { youtubeService } from '../services/youtubeService';

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const AddYoutubeForm = ({
  editData = null,
  onClose,
  onSuccess,
  className = ""
}) => {
  const isEdit = Boolean(editData && (editData.id || editData.mongoId));
  const fileInputRef = useRef(null);

  const [caption, setCaption] = useState('');
  const [dated, setDated] = useState(getTodayDateString());
  const [url, setUrl] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoName, setPhotoName] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (editData) {
      setCaption(editData.caption || editData.heading || '');
      setDated(editData.dated || editData.date || getTodayDateString());
      setUrl(editData.url || '');
      setPhoto(editData.photo || '');
      setPhotoName(editData.photoName || '');
    } else {
      setCaption('');
      setDated(getTodayDateString());
      setUrl('');
      setPhoto('');
      setPhotoName('');
    }
    setErrors({});
    setServerError('');
  }, [editData]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 250 * 1024) { // allow up to 250KB for flex
      setErrors(prev => ({ ...prev, photo: 'File size exceeds allowed limit (100KB recommended).' }));
    } else {
      setErrors(prev => ({ ...prev, photo: null }));
    }

    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors = {};
    if (!caption.trim()) newErrors.caption = 'Caption is required';
    if (!dated) newErrors.dated = 'Dated is required';
    if (!url.trim()) newErrors.url = 'URL is required';
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
        caption: caption.trim(),
        dated: dated.trim(),
        url: url.trim(),
        photo,
        photoName
      };

      let result;
      if (isEdit) {
        const targetId = editData.mongoId || editData.id || editData.youtubeId;
        result = await youtubeService.updateYoutubeUpdate(targetId, payload);
      } else {
        result = await youtubeService.createYoutubeUpdate(payload);
      }

      if (onSuccess) {
        onSuccess(result, isEdit ? 'Youtube update saved.' : 'Youtube update added.');
      }
      if (onClose) onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to save record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden animate-fade-in ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-theme-border bg-gray-50/70 dark:bg-theme-surface-alt/40">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-red-600" />
          <h2 className="text-sm font-semibold text-theme-main">
            {isEdit ? 'Edit Youtube Update' : 'Add Youtube Update'}
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-theme-main dark:hover:text-white transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
          >
            <span>Closed</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Form Body: Compact single-screen layout */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {serverError && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Caption * */}
        <FormField label="Caption" required>
          <Input
            inputSize="sm"
            value={caption}
            onChange={(e) => {
              setCaption(e.target.value);
              if (errors.caption) setErrors(prev => ({ ...prev, caption: null }));
            }}
            placeholder="e.g. Lahore Tax Bar Annual Dinner 2026..."
            error={Boolean(errors.caption)}
            autoFocus
          />
          {errors.caption && <span className="text-[11px] text-red-500">{errors.caption}</span>}
        </FormField>

        {/* Row 2: Dated * and URL * */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <FormField label="Dated" required>
              <Input
                type="date"
                inputSize="sm"
                value={dated}
                onChange={(e) => {
                  setDated(e.target.value);
                  if (errors.dated) setErrors(prev => ({ ...prev, dated: null }));
                }}
                error={Boolean(errors.dated)}
              />
              {errors.dated && <span className="text-[11px] text-red-500">{errors.dated}</span>}
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField label="URL" required>
              <Input
                inputSize="sm"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errors.url) setErrors(prev => ({ ...prev, url: null }));
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                error={Boolean(errors.url)}
              />
              {errors.url && <span className="text-[11px] text-red-500">{errors.url}</span>}
            </FormField>
          </div>
        </div>

        {/* Photo * (Choose File with preview, max 100KB, 600x340px) */}
        <FormField label="Photo" required>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 h-[34px] bg-[#00bcd4] hover:bg-[#00acc1] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Choose File
            </button>
            <span className="text-xs text-theme-muted truncate max-w-[200px]">
              {photoName || (photo ? 'Photo attached' : 'No file chosen')}
            </span>
            {photo && (
              <div className="flex items-center gap-1">
                <img src={photo} alt="Thumbnail preview" className="w-12 h-7 object-cover rounded border border-theme-border" />
                <button
                  type="button"
                  onClick={() => {
                    setPhoto('');
                    setPhotoName('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-gray-400 hover:text-red-500 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <span className="text-[10px] text-red-500 block mt-0.5">
            Max allowed size is 100KB SIZE (600px X 340px)
          </span>
          {errors.photo && <span className="text-[11px] text-red-500">{errors.photo}</span>}
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
              Closed
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="bg-[#00bcd4] hover:bg-[#00acc1] text-white h-[34px] px-5 text-xs font-medium"
          >
            {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Record')}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default AddYoutubeForm;
