import React from 'react';
import { Upload } from 'lucide-react';

const FileUpload = ({ 
  maxSizeText = "Max allowed size is 5MB", 
  onFileSelect,
  className = ""
}) => {
  return (
    <div className={`flex-1 flex flex-col ${className}`}>
      <div 
        className="border-2 border-dashed border-gray-300 rounded-xl bg-theme-surface p-8 flex-1 flex flex-col items-center justify-center text-center hover:border-brand-orange hover:bg-orange-50/30 transition-colors cursor-pointer group min-h-[250px]"
        onClick={() => {
          // Trigger file input click in a real implementation
          if(onFileSelect) onFileSelect();
        }}
      >
        <div className="p-3 bg-orange-50 text-brand-orange rounded-full mb-3 group-hover:scale-110 transition-transform">
          <Upload className="w-6 h-6" />
        </div>
        <span className="font-semibold text-theme-main">Choose File</span>
        <span className="text-sm text-theme-muted mt-1">No file chosen</span>
      </div>
      {maxSizeText && (
        <div className="mt-3 text-sm text-red-500 font-medium text-center">
          {maxSizeText}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
