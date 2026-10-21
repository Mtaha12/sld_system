import React, { useState, useRef } from 'react';
import { Link2, Paperclip, FileText, Upload, X, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { settingService } from '../../services/settingService';

/**
 * Reusable form section for configuring the "View" data
 * Supports: Hyperlinks, File Attachments (PDF/Word/Images), and Formatted Text.
 */
const ReferenceViewFormSection = ({ value = {}, onChange }) => {
  const { viewType = '', viewData = '', viewTitle = '' } = value;
  const [activeTab, setActiveTab] = useState(() => {
    if (viewType) return viewType;
    if (viewData?.startsWith('http://') || viewData?.startsWith('https://')) return 'link';
    if (viewData?.startsWith('/uploads/')) return 'file';
    if (viewData) return 'text';
    return '';
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    setUploadError('');
    if (!tab) {
      onChange({ viewType: '', viewData: '', viewTitle: '' });
    } else {
      onChange({
        viewType: tab,
        viewData: activeTab === tab ? viewData : '',
        viewTitle: activeTab === tab ? viewTitle : '',
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error
    setUploadError('');
    setUploading(true);

    try {
      const res = await settingService.uploadReferenceView(file);
      if (res && res.url) {
        onChange({
          viewType: 'file',
          viewData: res.url,
          viewTitle: res.originalName || file.name,
        });
      } else {
        setUploadError('Failed to get uploaded file URL.');
      }
    } catch (err) {
      setUploadError(err?.response?.data?.message || 'Failed to upload attachment file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearView = () => {
    setActiveTab('');
    setUploadError('');
    onChange({ viewType: '', viewData: '', viewTitle: '' });
  };

  return (
    <div className="border border-gray-200 dark:border-stone-700 rounded-xl p-3.5 bg-gray-50/60 dark:bg-stone-900/50 space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          View Content / Attachment <span className="text-gray-400 font-normal lowercase">(optional)</span>
        </label>
        {activeTab && (
          <button
            type="button"
            onClick={handleClearView}
            className="text-[11px] text-red-500 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3 h-3" /> Clear View
          </button>
        )}
      </div>

      {/* View Type Toggle Buttons */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-200/70 dark:bg-stone-800 rounded-lg text-xs">
        <button
          type="button"
          onClick={() => handleSelectTab('')}
          className={`py-1.5 px-2 rounded-md font-semibold transition-all cursor-pointer text-center ${
            !activeTab
              ? 'bg-white dark:bg-stone-700 text-gray-900 dark:text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          None (Empty)
        </button>
        <button
          type="button"
          onClick={() => handleSelectTab('link')}
          className={`py-1.5 px-2 rounded-md font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'link'
              ? 'bg-white dark:bg-stone-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Hyperlink</span>
        </button>
        <button
          type="button"
          onClick={() => handleSelectTab('file')}
          className={`py-1.5 px-2 rounded-md font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'file'
              ? 'bg-white dark:bg-stone-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span>Attachment</span>
        </button>
        <button
          type="button"
          onClick={() => handleSelectTab('text')}
          className={`py-1.5 px-2 rounded-md font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'text'
              ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Paste Text</span>
        </button>
      </div>

      {/* ── 1. HYPERLINK INPUT ────────────────────────────────────────── */}
      {activeTab === 'link' && (
        <div className="space-y-2 pt-1 animate-fade-in">
          <div className="relative">
            <input
              type="url"
              placeholder="Paste web hyperlink (e.g. https://court.gov.pk/judgment/123)"
              value={viewData}
              onChange={(e) =>
                onChange({
                  viewType: 'link',
                  viewData: e.target.value,
                  viewTitle: viewTitle || '',
                })
              }
              className="w-full pl-8 pr-20 py-2 text-xs rounded-lg border border-gray-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <Link2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {viewData && (
              <a
                href={viewData.startsWith('http') ? viewData : `https://${viewData}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1"
              >
                Test <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <p className="text-[11px] text-gray-500">
            When users click <strong>View</strong>, this link will open immediately in a new tab.
          </p>
        </div>
      )}

      {/* ── 2. ATTACHMENT UPLOAD ──────────────────────────────────────── */}
      {activeTab === 'file' && (
        <div className="space-y-2.5 pt-1 animate-fade-in">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg,.webp"
            className="hidden"
          />

          {viewData ? (
            <div className="p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                    {viewTitle || viewData.split('/').pop()}
                  </p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                    Attached successfully
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={viewData.startsWith('http') ? viewData : `${window.location.origin}${viewData}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1"
                >
                  Preview <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 text-[11px] font-semibold bg-white dark:bg-stone-800 border border-gray-300 dark:border-stone-700 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 cursor-pointer"
                >
                  Replace
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-stone-700 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition-all bg-white dark:bg-stone-900 group"
            >
              {uploading ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                  <span className="text-xs font-semibold text-emerald-600">Uploading attachment...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <Upload className="w-6 h-6 text-gray-400 group-hover:text-emerald-600 mb-1 transition-colors" />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-emerald-600">
                    Click to browse and upload file
                  </span>
                  <span className="text-[11px] text-gray-400 mt-0.5">
                    Supports PDF, Word (DOC/DOCX), Images, or Text (Max 25MB)
                  </span>
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <div className="p-2 rounded bg-red-50 text-red-700 text-xs flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* ── 3. TEXT NOTE INPUT ─────────────────────────────────────────── */}
      {activeTab === 'text' && (
        <div className="space-y-2 pt-1 animate-fade-in">
          <textarea
            rows={4}
            placeholder="Paste or write detailed reference text, judgment excerpts, commentary, or full notes here..."
            value={viewData}
            onChange={(e) =>
              onChange({
                viewType: 'text',
                viewData: e.target.value,
                viewTitle: viewTitle || '',
              })
            }
            className="w-full p-2.5 text-xs rounded-lg border border-gray-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed font-sans"
          />
          <p className="text-[11px] text-gray-500">
            When users click <strong>View</strong>, this text will open in a beautifully styled reader window in a new tab.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReferenceViewFormSection;
