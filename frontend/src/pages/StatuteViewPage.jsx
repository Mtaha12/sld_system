import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { statuteService } from '../features/statutes/services/statuteService';
import Spinner from '../components/ui/Spinner';
import { 
  ArrowLeft, Printer, Scale, Copy, Check, 
  FileText, Calendar, BookOpen, ExternalLink, ShieldCheck, Download, Eye
} from 'lucide-react';
import { formatWordDocumentDisplay } from '../utils/wordFormatter';
import { copyCleanDocument } from '../utils/documentCopyUtil';
import { verifyAndPrint, useSecurePrintShortcut } from '../utils/securePrint';
import { downloadOrViewAttachment, getAttachmentDisplayName } from '../utils/attachmentDownloader';

const fontSizes = [
  { label: 'Standard', fontSize: '15px', lineHeight: '1.75' },
  { label: 'Comfortable', fontSize: '17px', lineHeight: '1.85' },
  { label: 'Large', fontSize: '19px', lineHeight: '1.9' },
  { label: 'Enlarged', fontSize: '21px', lineHeight: '2.0' }
];

const resolveFileUrl = (f) => {
  if (!f) return '';
  if (typeof f === 'string') {
    if (f.startsWith('http://') || f.startsWith('https://') || f.startsWith('data:') || f.startsWith('blob:')) return f;
    return f.startsWith('/') ? f : `/uploads/${f}`;
  }
  if (f.url) return f.url;
  if (f.path) return f.path.startsWith('/') ? f.path : `/${f.path}`;
  if (f.name) return `/uploads/${f.name}`;
  return '';
};

const formatDisplayDate = (dVal) => {
  if (!dVal) return '';
  const d = new Date(dVal);
  if (isNaN(d.getTime())) return String(dVal);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const StatuteViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetBlockId = searchParams.get('blockId');
  const targetBlockIndex = searchParams.get('blockIndex');
  const [statute, setStatute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllBlocks, setShowAllBlocks] = useState(false);
  useSecurePrintShortcut();

  // UI States matching Case Law View
  const [copied, setCopied] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const [pageSize, setPageSize] = useState('a4'); // 'a4' | 'legal' | 'letter'

  useEffect(() => {
    const fetchStatute = async () => {
      try {
        setLoading(true);
        const data = await statuteService.getStatuteById(id);
        if (!data) {
          setError('No statute record found matching this identifier in the SLD database.');
        } else {
          setStatute(data);
        }
      } catch (err) {
        console.error('Failed to load statute:', err);
        setError('Failed to load statute record. Please verify the identifier or connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchStatute();
  }, [id]);

  const rawBlocks = Array.isArray(statute?.blocks) && statute.blocks.length > 0 ? statute.blocks : null;

  // Resolve matched block index for smooth auto-scroll and visual badge
  const matchedBlockIndex = useMemo(() => {
    if (!rawBlocks || rawBlocks.length === 0) return -1;
    if (targetBlockId) {
      const idx = rawBlocks.findIndex(b => String(b._id || b.id || '') === String(targetBlockId));
      if (idx >= 0) return idx;
    }
    if (targetBlockIndex !== null && targetBlockIndex !== undefined && targetBlockIndex !== '') {
      const parsed = parseInt(targetBlockIndex, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < rawBlocks.length) return parsed;
    }
    return -1;
  }, [rawBlocks, targetBlockId, targetBlockIndex]);

  // View page ALWAYS displays COMPLETE document with all blocks
  const displayBlocks = rawBlocks;

  // Auto-scroll to matched search block on load
  useEffect(() => {
    if (matchedBlockIndex >= 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`statute-block-${matchedBlockIndex}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [matchedBlockIndex]);

  const allAttachments = useMemo(() => {
    if (!statute) return [];
    const list = [];
    const blocksToScan = displayBlocks && displayBlocks.length > 0 ? displayBlocks : rawBlocks;
    if (blocksToScan && blocksToScan.length > 0) {
      blocksToScan.forEach(b => {
        if (Array.isArray(b?.attachments)) {
          list.push(...b.attachments);
        } else if (b?.attachment) {
          list.push(b.attachment);
        }
      });
    }
    if (list.length === 0) {
      if (Array.isArray(statute.attachments)) {
        list.push(...statute.attachments);
      } else if (statute.attachment) {
        list.push(statute.attachment);
      }
    }
    return list.filter(Boolean);
  }, [statute, displayBlocks, rawBlocks]);

  const singleContent = statute?.content || statute?.description || statute?.detail || statute?.text || '';

  const handleCopy = async () => {
    try {
      await copyCleanDocument({
        title: statute?.law || statute?.lawStatute || 'Statute / Legislation',
        chapter: statute?.chapter || '',
        section: statute?.section ? `Section ${statute.section}` : '',
        heading: statute?.heading || '',
        blocks: displayBlocks || rawBlocks || [],
        singleContent: singleContent || '',
        referenceNumber: (statute?.srNumber || statute?.id) ? `#STAT-${String(statute.srNumber || statute.id).padStart(6, '0')}` : ''
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handlePrint = () => {
    verifyAndPrint();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
        <Spinner size="lg" />
        <p className="mt-4 text-sm font-semibold text-stone-600 dark:text-stone-400 animate-pulse">
          Retrieving official statute record from SLD repository...
        </p>
      </div>
    );
  }

  if (error || !statute) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center shadow-xl">
          <Scale className="w-12 h-12 text-[#f15a24] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Statute Record Not Found</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">{error || 'Record could not be retrieved.'}</p>
          <button
            onClick={() => window.close()}
            className="px-5 py-2.5 bg-[#f15a24] text-white rounded-xl text-sm font-bold hover:bg-[#d94817] transition-all cursor-pointer"
          >
            Close Tab
          </button>
        </div>
      </div>
    );
  }

  const lawTitle = statute.law || statute.lawStatute || 'Statute / Legislation';
  const sectionTitle = statute.section ? `Section ${statute.section}` : '';
  const mainHeading = statute.heading || statute.title || '';
  const blocks = displayBlocks;

  return (
    <div className="min-h-screen w-full bg-[#F4F1EA] dark:bg-[#0c0e14] text-[#1c1d22] dark:text-[#E2E8F0] overflow-y-auto print:bg-white print:text-black print:overflow-visible transition-colors font-sans antialiased selection:bg-[#f15a24]/20 selection:text-[#f15a24]">
      
      {/* Dynamic Print CSS for Selected Paper Size (Letter, Legal, A4) */}
      <style>{`
        @media print {
          @page {
            size: ${pageSize};
            margin: 12mm 15mm 12mm 15mm;
          }
          .print-document,
          .print-document * {
            font-size: var(--print-font-size, 14px) !important;
            line-height: var(--print-line-height, 1.55) !important;
          }
          .print-document {
            overflow: visible !important;
            height: auto !important;
          }
          .statute-block-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-document h1 {
            font-size: 1.3rem !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print-hidden, 
          [data-print-hide="true"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* 1. TOP NON-PRINTABLE STATUTORY / CASE LAW TOOLBAR */}
      <header className="print:hidden sticky top-0 z-40 bg-white/95 dark:bg-[#12151D]/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-xs transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Close & Law Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.close()}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
              title="Close View"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-md bg-[#f15a24] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                SLD
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
                  Official Statute Viewer
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-stone-100 truncate block max-w-xs sm:max-w-md">
                  {lawTitle}
                </span>
              </div>
            </div>
          </div>

          {/* Right Toolbar: Font Size, Page Size, Copy, Print */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* Font Size Adjuster (A- / A+) */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-300 dark:border-stone-700 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setFontSizeIndex(prev => Math.max(0, prev - 1))}
                disabled={fontSizeIndex === 0}
                className="px-2.5 py-1 text-xs font-black text-stone-700 dark:text-stone-300 disabled:opacity-30 hover:bg-white dark:hover:bg-stone-700 rounded transition-colors cursor-pointer"
                title="Decrease Font Size (A-)"
              >
                A-
              </button>
              <span className="px-2 text-[11px] font-bold text-stone-600 dark:text-stone-300 min-w-[75px] text-center select-none">
                {fontSizes[fontSizeIndex].label}
              </span>
              <button
                type="button"
                onClick={() => setFontSizeIndex(prev => Math.min(fontSizes.length - 1, prev + 1))}
                disabled={fontSizeIndex === fontSizes.length - 1}
                className="px-2.5 py-1 text-xs font-black text-stone-700 dark:text-stone-300 disabled:opacity-30 hover:bg-white dark:hover:bg-stone-700 rounded transition-colors cursor-pointer"
                title="Increase Font Size (A+)"
              >
                A+
              </button>
            </div>

            {/* Print Page Size Selector: Letter / Legal / A4 */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-300 dark:border-stone-700 px-2 py-1 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 mr-1.5">
                Page:
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="bg-transparent text-xs font-bold text-stone-900 dark:text-stone-100 outline-none cursor-pointer"
                title="Select page size for print format"
              >
                <option value="legal">Legal (8.5×14")</option>
                <option value="letter">Letter (8.5×11")</option>
                <option value="a4">A4 (210×297mm)</option>
              </select>
            </div>

            {/* Copy Statute Text Button */}
            <button 
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-xs transition-colors cursor-pointer"
              title="Copy certified statute text to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Print Official Statute Document Button */}
            <button 
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#f15a24] hover:bg-[#d94817] text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Print certified statute document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {/* Attachment Button if attachments exist */}
            {allAttachments.length > 0 && (
              <button
                type="button"
                onClick={() => downloadOrViewAttachment(allAttachments[0])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                title={`Open/download ${getAttachmentDisplayName(allAttachments[0])}`}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="truncate max-w-[180px]">{getAttachmentDisplayName(allAttachments[0])}</span>
              </button>
            )}

          </div>

        </div>
      </header>

      {/* 2. THE STATUTE PROVISION CANVAS */}
      <main className="max-w-4xl mx-auto my-4 sm:my-8 px-3 sm:px-6 pb-24 print:m-0 print:p-0 print:max-w-none">
        
        {/* Document Folio Paper Container */}
        <article className="print-document bg-[#FCFBF8] dark:bg-[#151821] border border-stone-300/90 dark:border-stone-800/90 rounded-2xl shadow-lg print:border-none print:shadow-none print:bg-white p-6 sm:p-12 print:p-0 print:m-0 relative overflow-hidden print:overflow-visible transition-colors">
          
          {/* Subtle Judicial Watermark Emblem */}
          <div className="absolute top-12 right-12 opacity-[0.035] dark:opacity-[0.05] pointer-events-none select-none print:hidden">
            <Scale className="w-80 h-80 text-stone-900 dark:text-white" />
          </div>

          {/* DOCUMENT HEADER BANNER */}
          <header className="relative border-b-2 border-stone-800 dark:border-stone-300 pb-6 mb-8 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#f15a24] mb-2 border border-orange-200 dark:border-orange-900/50 print:hidden">
              <Scale className="w-6 h-6" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-wider text-stone-950 dark:text-stone-50 leading-tight">
              {lawTitle}
            </h1>

            {/* Badges Bar: SR#, Section, Chapter */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-semibold">
              {(statute.srNumber || statute.id) && (
                <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-mono">
                  Ref: #STAT-{String(statute.srNumber || statute.id).padStart(6, '0')}
                </span>
              )}
              {statute.chapter && (
                <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold">
                  {statute.chapter}
                </span>
              )}
              {sectionTitle && (
                <span className="px-3 py-1 rounded-full bg-[#f15a24]/10 dark:bg-[#f15a24]/20 border border-[#f15a24]/30 text-[#f15a24] font-bold">
                  {sectionTitle}
                </span>
              )}
            </div>
          </header>

          {/* Main Statute Heading Banner (if set) */}
          {mainHeading && (
            <div className="p-4 bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 rounded-xl mb-8">
              <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Statute Heading / Subject
              </span>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug">
                {mainHeading}
              </h2>
            </div>
          )}

          {/* STATUTE BLOCKS / PROVISIONS */}
          {blocks ? (
            <div className="space-y-8">
              {blocks.map((block, bIdx) => {
                const bAtts = Array.isArray(block.attachments) && block.attachments.length > 0 
                  ? block.attachments 
                  : (block.attachment ? [block.attachment] : []);

                const isTargetMatched = bIdx === matchedBlockIndex;

                return (
                  <section 
                    key={block._id || block.id || bIdx} 
                    id={`statute-block-${bIdx}`}
                    className={`statute-block-card p-5 sm:p-6 bg-white dark:bg-stone-900/80 rounded-xl border shadow-2xs space-y-4 transition-all ${
                      isTargetMatched 
                        ? 'border-[#f15a24] ring-2 ring-[#f15a24]/20 shadow-md' 
                        : 'border-stone-200 dark:border-stone-700/80'
                    }`}
                  >
                    {/* Block Title and Date Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
                      <div>
                        {isTargetMatched ? (
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#f15a24]/10 text-[#f15a24] border border-[#f15a24]/30 shadow-2xs">
                              ★ Relevant Search Block ({bIdx + 1} of {rawBlocks?.length || 1})
                            </span>
                          </div>
                        ) : (
                          rawBlocks && rawBlocks.length > 1 && (
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                                Block {bIdx + 1} of {rawBlocks.length}
                              </span>
                            </div>
                          )
                        )}
                        {block.sectionHeading && (
                          <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                            {block.sectionHeading}
                          </h3>
                        )}
                      </div>

                      {(block.fromDate || block.toDate) && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800 px-3 py-1 rounded-md border border-stone-200 dark:border-stone-700">
                          <Calendar className="w-3.5 h-3.5 text-[#f15a24]" />
                          <span>
                            {block.fromDate ? formatDisplayDate(block.fromDate) : 'Start'}
                            {block.toDate ? ` to ${formatDisplayDate(block.toDate)}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Block Detail Content */}
                    {block.detail ? (
                      <div 
                        className="word-document-content text-stone-800 dark:text-stone-200 font-serif leading-relaxed"
                        style={{
                          fontSize: fontSizes[fontSizeIndex].fontSize,
                          lineHeight: fontSizes[fontSizeIndex].lineHeight
                        }}
                        dangerouslySetInnerHTML={{ __html: formatWordDocumentDisplay(block.detail) }}
                      />
                    ) : (
                      <p className="italic text-stone-400 text-sm">No detail text recorded for this block provision.</p>
                    )}

                    {/* Block Attachments (Rendered in screen and print) */}
                    {bAtts.length > 0 && (
                      <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-[#f15a24]" /> Attachments ({bAtts.length}):
                        </span>
                        {bAtts.map((att, aIdx) => {
                          const attName = getAttachmentDisplayName(att);
                          return (
                            <React.Fragment key={aIdx}>
                              <button
                                type="button"
                                onClick={() => downloadOrViewAttachment(att)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-md border border-amber-500/30 transition-colors cursor-pointer print:hidden"
                                title={`Download/view ${attName}`}
                              >
                                <Download className="w-3 h-3 shrink-0" />
                                <span>{attName}</span>
                              </button>
                              <span className="hidden print:inline-flex text-xs font-mono text-stone-800 bg-stone-100 border border-stone-300 px-2 py-0.5 rounded">
                                📄 {attName}
                              </span>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : singleContent ? (
            <article 
              className="prose dark:prose-invert max-w-none text-stone-800 dark:text-stone-200 font-serif leading-relaxed"
              style={{
                fontSize: fontSizes[fontSizeIndex].fontSize,
                lineHeight: fontSizes[fontSizeIndex].lineHeight
              }}
            >
              <div 
                className="word-document-content text-stone-800 dark:text-stone-200 font-serif leading-relaxed"
                style={{
                  fontSize: fontSizes[fontSizeIndex].fontSize,
                  lineHeight: fontSizes[fontSizeIndex].lineHeight
                }}
                dangerouslySetInnerHTML={{ __html: formatWordDocumentDisplay(singleContent) }}
              />
            </article>
          ) : (
            <div className="py-8 text-center text-stone-500 italic">
              Full statutory provision text is maintained under the primary Act catalog.
            </div>
          )}

          {/* Complete Attachments & Annexures Roster (Screen & Print) */}
          {allAttachments.length > 0 && (
            <div className="mt-8 pt-6 border-t-2 border-dashed border-stone-300 dark:border-stone-700 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#f15a24]" />
                  <span>All Attached Documents & Annexures ({allAttachments.length} Total Files)</span>
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {allAttachments.map((att, idx) => {
                  const name = getAttachmentDisplayName(att);
                  return (
                    <div 
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-stone-400 shrink-0">#{idx + 1}</span>
                        <span className="truncate font-medium text-stone-800 dark:text-stone-200" title={name}>
                          {name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadOrViewAttachment(att)}
                        className="shrink-0 p-1 text-[#f15a24] hover:text-[#d44e35] hover:bg-orange-50 rounded cursor-pointer print:hidden"
                        title="Download / View"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Official Verification Seal Footer */}
          <footer className="mt-12 pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Certified Official Legal Provision • SLD System Repository</span>
            </div>
            <div className="text-[11px] font-mono">
              SLD System (SMC-PVT) Limited
            </div>
          </footer>

        </article>
      </main>
    </div>
  );
};

export default StatuteViewPage;
