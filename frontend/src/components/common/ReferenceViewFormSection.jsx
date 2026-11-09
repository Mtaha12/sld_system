import React, { useState, useRef } from 'react';
import { 
  Link2, Paperclip, FileText, Upload, X, ExternalLink, 
  Check, AlertCircle, Plus, Trash2, FileCheck, BookOpen 
} from 'lucide-react';
import { settingService } from '../../services/settingService';

/**
 * Reusable form section for configuring View Data, Multiple File Attachments, and Citations.
 * Used across Topics, Words & Phrases, Legal Terms, Legal Maxims, and Articles.
 */
const ReferenceViewFormSection = ({ value = {}, onChange, expanded = true, minRows = 8 }) => {
  const { 
    viewType = '', 
    viewData = '', 
    viewTitle = '', 
    attachments = [], 
    citations = [] 
  } = value;

  // Resolve current attachments list (ensuring backward compatibility)
  const safeAttachments = Array.isArray(attachments) && attachments.length > 0
    ? attachments
    : (viewData && viewData.startsWith('/uploads/')
        ? [{ name: viewTitle || viewData.split('/').pop(), url: viewData, size: 0 }]
        : []);

  const [activeTab, setActiveTab] = useState(() => {
    if (viewType) return viewType;
    if (safeAttachments.length > 0 || viewData?.startsWith('/uploads/')) return 'file';
    if (viewData?.startsWith('http://') || viewData?.startsWith('https://')) return 'link';
    if (viewData) return 'text';
    return '';
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Switch tabs
  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    setUploadError('');
    if (!tab) {
      onChange({ 
        ...value, 
        viewType: '', 
        viewData: '', 
        viewTitle: '', 
        attachments: [] 
      });
    } else if (tab === 'file') {
      onChange({ 
        ...value, 
        viewType: 'file',
        viewData: safeAttachments[0]?.url || '',
        viewTitle: safeAttachments[0]?.name || '',
        attachments: safeAttachments
      });
    } else {
      onChange({
        ...value,
        viewType: tab,
        viewData: activeTab === tab ? viewData : '',
        viewTitle: activeTab === tab ? viewTitle : '',
      });
    }
  };

  // Upload multiple files and append to existing attachments
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files || files.length === 0) return;

    setUploadError('');
    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        try {
          const res = await settingService.uploadReferenceView(file);
          if (res && res.url) {
            return {
              name: res.originalName || file.name,
              url: res.url,
              size: file.size || 0,
            };
          }
        } catch (err) {
          console.error(`Upload error for ${file.name}:`, err);
        }
        return null;
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(Boolean);

      if (successfulUploads.length === 0) {
        setUploadError('Failed to upload selected file(s). Please check file size and format.');
      } else {
        // Append newly uploaded files to previous ones (never vanish existing attachments)
        const updatedAttachments = [...safeAttachments, ...successfulUploads];
        onChange({
          ...value,
          viewType: 'file',
          viewData: updatedAttachments[0]?.url || '',
          viewTitle: updatedAttachments[0]?.name || '',
          attachments: updatedAttachments,
        });
      }
    } catch (err) {
      setUploadError(err?.response?.data?.message || 'Failed to upload attachments.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove a single attachment
  const handleRemoveAttachment = (indexToRemove) => {
    const updated = safeAttachments.filter((_, idx) => idx !== indexToRemove);
    onChange({
      ...value,
      viewType: updated.length > 0 ? 'file' : '',
      viewData: updated[0]?.url || '',
      viewTitle: updated[0]?.name || '',
      attachments: updated,
    });
  };

  const handleClearView = () => {
    setActiveTab('');
    setUploadError('');
    onChange({ 
      ...value, 
      viewType: '', 
      viewData: '', 
      viewTitle: '', 
      attachments: [] 
    });
  };

  // Citations Handlers
  const safeCitations = Array.isArray(citations) ? citations : [];

  const handleCitationChange = (index, field, val) => {
    const updated = [...safeCitations];
    if (!updated[index]) {
      updated[index] = { yearVol: '', mag: '', page: '' };
    }
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...value, citations: updated });
  };

  const handleAddCitationRow = () => {
    const updated = [...safeCitations, { yearVol: '', mag: '', page: '' }];
    onChange({ ...value, citations: updated });
  };

  const handleRemoveCitationRow = (indexToRemove) => {
    const updated = safeCitations.filter((_, idx) => idx !== indexToRemove);
    onChange({ ...value, citations: updated });
  };

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          1. CITATIONS / PARALLEL REFERENCES SECTION
      ───────────────────────────────────────────────────────────── */}
      <div className="border border-gray-200 dark:border-stone-700 rounded-xl p-3.5 bg-gray-50/70 dark:bg-stone-900/50 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-brand-orange" />
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Citation / Parallel Reference <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
          </div>
          <button
            type="button"
            onClick={handleAddCitationRow}
            className="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Add More
          </button>
        </div>

        {safeCitations.length === 0 ? (
          <div className="text-center py-2.5 px-3 border border-dashed border-gray-300 dark:border-stone-700 rounded-lg bg-white/60 dark:bg-stone-800/40">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No citations added yet. Click <strong>+ Add More</strong> to record citations (Year/Vol, Magazine, Page).
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-gray-500 uppercase px-1">
              <span className="col-span-4">Year / Vol</span>
              <span className="col-span-4">Mag (Journal)</span>
              <span className="col-span-3">Page</span>
              <span className="col-span-1 text-center">Del</span>
            </div>
            {safeCitations.map((cit, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  placeholder="e.g. 2026 or 2026/1"
                  value={cit.yearVol || ''}
                  onChange={(e) => handleCitationChange(idx, 'yearVol', e.target.value)}
                  className="col-span-4 px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
                />
                <input
                  type="text"
                  placeholder="e.g. SLD, TAX, PTD"
                  value={cit.mag || ''}
                  onChange={(e) => handleCitationChange(idx, 'mag', e.target.value)}
                  className="col-span-4 px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
                />
                <input
                  type="text"
                  placeholder="e.g. 105"
                  value={cit.page || ''}
                  onChange={(e) => handleCitationChange(idx, 'page', e.target.value)}
                  className="col-span-3 px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
                />
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveCitationRow(idx)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                    title="Delete Citation Row"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. VIEW CONTENT / ATTACHMENT SECTION
      ───────────────────────────────────────────────────────────── */}
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

        {/* ── 1. ATTACHMENT MULTI-FILE UPLOAD ────────────────────────── */}
        {activeTab === 'file' && (
          <div className="space-y-3 pt-1 animate-fade-in">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />

            {/* List of current attachments */}
            {safeAttachments.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                    Attached Files ({safeAttachments.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add More Files
                  </button>
                </div>
                {safeAttachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                          {att.name || att.url?.split('/').pop() || `Attachment #${idx + 1}`}
                        </p>
                        {att.size ? (
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                            {(att.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {att.url && (
                        <a
                          href={att.url.startsWith('http') ? att.url : `${window.location.origin}${att.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1"
                        >
                          Preview <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100/60 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Drag/Click Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-stone-700 hover:border-emerald-500 rounded-xl p-5 text-center cursor-pointer transition-all bg-white dark:bg-stone-900 group flex flex-col items-center justify-center"
            >
              {uploading ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-1.5" />
                  <span className="text-xs font-semibold text-emerald-600">Uploading file(s)...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-1">
                  <Upload className="w-7 h-7 text-gray-400 group-hover:text-emerald-600 mb-1.5 transition-colors" />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-emerald-600">
                    Click to browse and upload file(s) (Multiple supported)
                  </span>
                  <span className="text-[11px] text-gray-400 mt-0.5">
                    Supports PDF, Word (DOC/DOCX), Images, or Text (Max 25MB each)
                  </span>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="p-2 rounded bg-red-50 text-red-700 text-xs flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}

        {/* ── 2. HYPERLINK INPUT ────────────────────────────────────── */}
        {activeTab === 'link' && (
          <div className="space-y-2 pt-1 animate-fade-in">
            <div className="relative">
              <input
                type="url"
                placeholder="Paste web hyperlink (e.g. https://court.gov.pk/judgment/123)"
                value={viewData}
                onChange={(e) =>
                  onChange({
                    ...value,
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

        {/* ── 3. TEXT NOTE INPUT ─────────────────────────────────────── */}
        {activeTab === 'text' && (
          <div className="space-y-2 pt-1 animate-fade-in">
            <textarea
              rows={minRows}
              placeholder="Paste or write detailed reference text, judgment excerpts, commentary, or full notes here..."
              value={viewData}
              onChange={(e) =>
                onChange({
                  ...value,
                  viewType: 'text',
                  viewData: e.target.value,
                  viewTitle: viewTitle || '',
                })
              }
              className="w-full p-3.5 text-xs rounded-xl border border-gray-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 leading-relaxed font-sans min-h-[180px]"
            />
            <p className="text-[11px] text-gray-500">
              When users click <strong>View</strong>, this text will open in a beautifully styled reader window in a new tab.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferenceViewFormSection;
