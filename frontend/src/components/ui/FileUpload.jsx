import React, { useRef, useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  File, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon,
  Paperclip
} from 'lucide-react';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className="w-6 h-6 text-blue-500 shrink-0" />;
  }
  if (['pdf'].includes(ext)) {
    return <FileText className="w-6 h-6 text-red-500 shrink-0" />;
  }
  if (['doc', 'docx'].includes(ext)) {
    return <FileText className="w-6 h-6 text-blue-600 shrink-0" />;
  }
  return <File className="w-6 h-6 text-brand-orange shrink-0" />;
};

const FileUpload = ({ 
  maxSizeMB = 5,
  maxSizeText = "Max allowed size is 5MB per file", 
  onFileSelect,
  onChange,
  value,
  multiple = true,
  accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv,.xlsx",
  className = ""
}) => {
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync with value prop if provided
  useEffect(() => {
    if (value) {
      if (Array.isArray(value)) {
        setSelectedFiles(value);
      } else if (value instanceof File || typeof value === 'object') {
        setSelectedFiles([value]);
      }
    }
  }, [value]);

  const handleFiles = (incomingFiles) => {
    setErrorMessage('');
    const filesArray = Array.from(incomingFiles);
    if (filesArray.length === 0) return;

    const maxBytes = maxSizeMB * 1024 * 1024;
    const oversized = filesArray.filter(f => f.size > maxBytes);

    if (oversized.length > 0) {
      setErrorMessage(
        oversized.length === 1 
          ? `File "${oversized[0].name}" exceeds the ${maxSizeMB}MB limit (${formatFileSize(oversized[0].size)}).`
          : `${oversized.length} files exceed the ${maxSizeMB}MB limit.`
      );
    }

    const validFiles = filesArray.filter(f => f.size <= maxBytes);
    if (validFiles.length === 0) return;

    // Combine with existing selected files avoiding duplicates
    const combined = multiple 
      ? [...selectedFiles, ...validFiles.filter(vf => !selectedFiles.some(sf => sf.name === vf.name && sf.size === vf.size))] 
      : [validFiles[0]];

    setSelectedFiles(combined);

    if (onChange) onChange(multiple ? combined : combined[0]);
    if (onFileSelect) onFileSelect(multiple ? combined : combined[0]);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (indexToRemove, e) => {
    e?.stopPropagation();
    const updated = selectedFiles.filter((_, idx) => idx !== indexToRemove);
    setSelectedFiles(updated);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (onChange) onChange(multiple ? updated : (updated[0] || null));
    if (onFileSelect) onFileSelect(multiple ? updated : (updated[0] || null));
  };

  const handleClearAll = (e) => {
    e?.stopPropagation();
    setSelectedFiles([]);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (onChange) onChange(multiple ? [] : null);
    if (onFileSelect) onFileSelect(multiple ? [] : null);
  };

  const handleClickDropzone = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`flex-1 flex flex-col ${className}`}>
      {/* Hidden Native File Input */}
      <input 
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {selectedFiles.length === 0 ? (
        /* Empty Dropzone State */
        <div 
          onClick={handleClickDropzone}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl bg-theme-surface p-8 flex-1 flex flex-col items-center justify-center text-center transition-all cursor-pointer group min-h-[220px] ${
            isDragging 
              ? 'border-brand-orange bg-brand-orange/10 scale-[1.01]' 
              : 'border-theme-border hover:border-brand-orange hover:bg-orange-50/30 dark:hover:bg-brand-orange/5'
          }`}
        >
          <div className="p-3.5 bg-orange-50 dark:bg-brand-orange/10 text-brand-orange rounded-full mb-3 group-hover:scale-110 transition-transform shadow-sm">
            <Upload className="w-6 h-6" />
          </div>
          <span className="font-semibold text-theme-main text-sm sm:text-base">
            {isDragging ? 'Drop files here' : 'Choose Files'}
          </span>
          <span className="text-xs sm:text-sm text-theme-muted mt-1">
            Drag & drop or click to browse (Multiple files supported)
          </span>
        </div>
      ) : (
        /* Selected File(s) Preview State */
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border rounded-xl bg-theme-surface p-4 flex-1 flex flex-col justify-between gap-3 min-h-[220px] transition-all ${
            isDragging ? 'border-brand-orange ring-2 ring-brand-orange/30 bg-brand-orange/5' : 'border-theme-border'
          }`}
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-theme-border/50 pb-2">
              <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-brand-orange" />
                Attached ({selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'})
              </span>
              <div className="flex items-center gap-3">
                {selectedFiles.length > 1 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClickDropzone}
                  className="text-xs text-brand-orange hover:text-[#D44E35] font-semibold transition-colors flex items-center gap-1"
                >
                  + Add More
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedFiles.map((file, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-theme-border/80 bg-theme-surface-alt/40 hover:bg-theme-surface-alt/80 transition-colors group animate-fade-in"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="p-1.5 rounded-lg bg-theme-surface border border-theme-border/50 shadow-sm">
                      {getFileIcon(file.name)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-medium text-theme-main truncate max-w-[160px] sm:max-w-[220px]">
                        {file.name || `Attachment #${idx + 1}`}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-theme-muted">
                        <span>{formatFileSize(file.size)}</span>
                        <span className="w-1 h-1 rounded-full bg-theme-muted"></span>
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-0.5 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleRemoveFile(idx, e)}
                    className="p-1.5 text-theme-muted hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div 
            onClick={handleClickDropzone}
            className="p-2 rounded-lg border border-dashed border-theme-border hover:border-brand-orange bg-theme-surface-alt/20 hover:bg-brand-orange/5 text-center text-xs text-theme-muted hover:text-brand-orange transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> Click or drop more files to add
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-xs flex items-center gap-1.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Max Size Info */}
      {maxSizeText && !errorMessage && (
        <div className="mt-2 text-xs text-red-500 font-medium text-center">
          {maxSizeText}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
