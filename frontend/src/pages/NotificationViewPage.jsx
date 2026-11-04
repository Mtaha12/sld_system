import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { notificationService } from '../features/notifications/services/notificationService';
import Spinner from '../components/ui/Spinner';
import { 
  ArrowLeft, Printer, Bell, Copy, Check, 
  Calendar, FileText, Download, Building, ShieldCheck, ExternalLink, Award
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

const NotificationViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useSecurePrintShortcut();

  const [copied, setCopied] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const [pageSize, setPageSize] = useState('a4');

  useEffect(() => {
    const fetchNotification = async () => {
      try {
        setLoading(true);
        const data = await notificationService.getNotificationById(id);
        if (!data) {
          setError('No notification record found matching this identifier in the SLD database.');
        } else {
          setNotification(data);
        }
      } catch (err) {
        console.error('Failed to load notification:', err);
        setError('Failed to load official notification record. Please verify identifier or connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchNotification();
  }, [id]);

  // Gather all unique attachments from notification blocks and root
  const allAttachments = useMemo(() => {
    if (!notification) return [];
    const list = [];
    const add = (att) => {
      if (!att) return;
      if (Array.isArray(att)) {
        att.forEach(add);
        return;
      }
      const url = typeof att === 'string' ? att : (att.url || att.path);
      const name = typeof att === 'string' ? getAttachmentDisplayName(att) : (att.name || att.originalName || getAttachmentDisplayName(url));
      if (url && !list.some(x => x.url === url)) {
        list.push({ url, name, size: att.size || '', type: att.type || 'pdf', raw: att });
      }
    };
    if (Array.isArray(notification.blocks)) {
      notification.blocks.forEach(b => {
        add(b.attachments);
        add(b.attachment);
      });
    }
    add(notification.attachments);
    add(notification.attachment);
    return list;
  }, [notification]);

  const handleCopy = async () => {
    try {
      await copyCleanDocument({
        title: notification?.subject || notification?.title || 'Official Notification',
        referenceNumber: notification?.sroNumber || notification?.number || '',
        department: notification?.department || '',
        dateStr: notification?.lawDate || (notification?.blocks && notification.blocks.find(b => b.date)?.date) || '',
        blocks: Array.isArray(notification?.blocks) ? notification.blocks : [],
        singleContent: notification?.content || notification?.text || notification?.description || ''
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
          Retrieving official notification record from SLD repository...
        </p>
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center shadow-xl">
          <Bell className="w-12 h-12 text-[#f15a24] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Notification Not Found</h2>
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

  const subject = notification.subject || notification.title || `Notification No. ${notification.number || ''}`;
  const notifNumber = notification.sroNumber || notification.number || '';
  const notifDate = notification.lawDate || (notification.blocks && notification.blocks.find(b => b.date)?.date);
  
  const formattedDateStr = notifDate ? (() => {
    try {
      const d = new Date(notifDate);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const suffix = (day % 10 === 1 && day !== 11) ? 'st' : (day % 10 === 2 && day !== 12) ? 'nd' : (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
        const month = d.toLocaleString('en-US', { month: 'long' });
        const year = d.getFullYear();
        return `Islamabad, the ${day}${suffix} ${month}, ${year}`;
      }
    } catch (e) {}
    return String(notifDate);
  })() : '';

  const sroHeaderLine = (() => {
    let base = notifNumber ? (
      notifNumber.toUpperCase().startsWith('SRO') || notifNumber.toUpperCase().startsWith('S.R.O')
        ? notifNumber
        : `S.R.O. ${notifNumber}`
    ) : (notification.year ? `Notification ${notification.year}` : '');

    if (base && formattedDateStr && !base.toLowerCase().includes('islamabad')) {
      return `SROS: ${base}, ${formattedDateStr}`;
    }
    return base ? `SROS: ${base}` : 'SROS: Official Notification';
  })();

  const contentBody = notification.content || notification.text || notification.description || '';

  return (
    <div className="min-h-screen bg-[#F4F1EA] dark:bg-[#0c0e14] text-stone-900 dark:text-stone-100 font-sans antialiased selection:bg-[#f15a24]/20 selection:text-[#f15a24] print:bg-white print:text-black">
      
      {/* Dynamic Print CSS for Selected Paper Size (A4, Legal, Letter) */}
      <style>{`
        @media print {
          @page {
            size: ${pageSize};
            margin: 12mm 15mm 12mm 15mm;
          }
          header, .print-hidden, [data-print-hide="true"] { 
            display: none !important; 
          }
          body, main, .print-container {
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            font-family: "Times New Roman", Times, Georgia, serif !important;
          }
          .print-border-line {
            border-top: 1.5px solid #000 !important;
            margin-top: 1rem !important;
            margin-bottom: 1.5rem !important;
          }
        }
      `}</style>

      {/* Top Floating Control Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#12151D]/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-xs print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  window.close();
                }
              }}
              className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="Close View"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#f15a24] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                SLD
              </span>
              <div>
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400 tracking-wider uppercase block">
                  Official Gazette / Notification Viewer
                </span>
                <span className="text-sm font-extrabold text-stone-900 dark:text-white truncate block max-w-xs sm:max-w-md">
                  {notification.department || 'Federal Board of Revenue / Regulatory Authority'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Paper Size Selector (SS3) */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="text-xs font-bold bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg px-2 py-1.5 text-stone-700 dark:text-stone-300 outline-none cursor-pointer shadow-2xs"
              title="Select Print Paper Size"
            >
              <option value="a4">A4 Paper</option>
              <option value="legal">Legal Paper</option>
              <option value="letter">Letter Paper</option>
            </select>

            {/* Font Size Adjuster A- / A+ (SS3) */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-300 dark:border-stone-700 p-0.5">
              <button
                type="button"
                onClick={() => setFontSizeIndex(prev => Math.max(0, prev - 1))}
                disabled={fontSizeIndex === 0}
                className="px-2 py-1 text-xs font-black text-stone-700 dark:text-stone-300 disabled:opacity-30 hover:bg-white dark:hover:bg-stone-700 rounded transition-colors cursor-pointer"
                title="Decrease Font Size (A-)"
              >
                A-
              </button>
              <span className="px-2 text-[11px] font-bold text-stone-600 dark:text-stone-300 min-w-[70px] text-center select-none">
                {fontSizes[fontSizeIndex].label}
              </span>
              <button
                type="button"
                onClick={() => setFontSizeIndex(prev => Math.min(fontSizes.length - 1, prev + 1))}
                disabled={fontSizeIndex === fontSizes.length - 1}
                className="px-2 py-1 text-xs font-black text-stone-700 dark:text-stone-300 disabled:opacity-30 hover:bg-white dark:hover:bg-stone-700 rounded transition-colors cursor-pointer"
                title="Increase Font Size (A+)"
              >
                A+
              </button>
            </div>

            {/* View Attachment Button in Toolbar */}
            {allAttachments.length > 0 && (
              <button
                type="button"
                onClick={() => downloadOrViewAttachment(allAttachments[0].raw || allAttachments[0].url)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-orange bg-brand-orange/10 hover:bg-brand-orange text-brand-orange hover:text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                title={`Open ${allAttachments[0].name} in new tab`}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View Attachment {allAttachments.length > 1 ? `(${allAttachments.length})` : ''}</span>
              </button>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-[#f15a24] text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-[#f15a24] transition-all cursor-pointer bg-white dark:bg-stone-800 shadow-2xs"
              title="Copy Notification"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f15a24] hover:bg-[#d94817] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Print Notification"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Content Area */}
      <main className="print-document max-w-4xl mx-auto my-4 sm:my-8 px-4 sm:px-8 pb-24 print:m-0 print:p-0 print:max-w-none">
        
        <article className="print-container bg-[#FCFBF8] dark:bg-[#151821] border border-stone-300/90 dark:border-stone-800/90 rounded-2xl shadow-lg print:border-none print:shadow-none print:bg-white p-6 sm:p-12 print:p-0 print:m-0 relative overflow-hidden print:overflow-visible transition-colors">
          
          {/* Subtle Judicial Watermark Emblem */}
          <div className="absolute top-12 right-12 opacity-[0.035] dark:opacity-[0.05] pointer-events-none select-none print:hidden">
            <Bell className="w-80 h-80 text-stone-900 dark:text-white" />
          </div>

          {/* ── 1. SRO # BLOCK ONLY (Number, Date, Law, Section removed as requested in SS3) ── */}
          <div className="text-center font-serif font-black text-base sm:text-xl text-stone-900 dark:text-stone-100 mb-2 leading-snug">
            {sroHeaderLine}
          </div>

          {/* ── 2. SUBJECT / HEADING ── */}
          <div className="text-center font-serif font-bold text-sm sm:text-base text-stone-800 dark:text-stone-200 mb-4 leading-relaxed max-w-3xl mx-auto">
            {subject}
          </div>

          {/* Clean dividing line */}
          <hr className="border-t border-stone-800 dark:border-stone-300 my-4 print-border-line" />

          {/* ── 3. NOTIFICATION DETAIL PARAGRAPHS ── */}
          <section 
            className="prose dark:prose-invert max-w-none text-stone-900 dark:text-stone-100 font-serif leading-relaxed pt-2"
            style={{
              fontSize: fontSizes[fontSizeIndex].fontSize,
              lineHeight: fontSizes[fontSizeIndex].lineHeight
            }}
          >
            {(() => {
              // Extract details from blocks or fallback to contentBody
              const blockDetails = Array.isArray(notification.blocks) 
                ? notification.blocks
                    .map(b => b.detail || b.content || '')
                    .filter(d => d && d.replace(/<[^>]*>?/gm, '').trim() !== '')
                : [];

              if (blockDetails.length > 0) {
                return (
                  <div className="space-y-4">
                    {blockDetails.map((detailText, bIdx) => (
                      <div 
                        key={bIdx}
                        className="word-document-content text-stone-800 dark:text-stone-200 font-serif leading-relaxed"
                        style={{
                          fontSize: fontSizes[fontSizeIndex].fontSize,
                          lineHeight: fontSizes[fontSizeIndex].lineHeight
                        }}
                        dangerouslySetInnerHTML={{ __html: formatWordDocumentDisplay(detailText) }}
                      />
                    ))}
                  </div>
                );
              }

              if (contentBody) {
                return (
                  <div 
                    className="word-document-content text-stone-800 dark:text-stone-200 font-serif leading-relaxed"
                    style={{
                      fontSize: fontSizes[fontSizeIndex].fontSize,
                      lineHeight: fontSizes[fontSizeIndex].lineHeight
                    }}
                    dangerouslySetInnerHTML={{ __html: formatWordDocumentDisplay(contentBody) }}
                  />
                );
              }

              return (
                <p className="italic text-stone-500 text-center py-6">Official gazette text record archived in SLD repository.</p>
              );
            })()}
          </section>

          {/* ── 4. OFFICIAL ATTACHED DOCUMENTS & ANNEXURES (Screen & Print, SS3) ── */}
          {allAttachments.length > 0 && (
            <section className="mt-10 pt-6 border-t-2 border-dashed border-stone-300 dark:border-stone-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-orange" />
                  <span>Official Attached Documents & Annexures ({allAttachments.length})</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {allAttachments.map((att, idx) => {
                  const attName = att.name || `Attachment_${idx + 1}.pdf`;
                  return (
                    <div 
                      key={idx}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/60 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-bold text-stone-400 shrink-0">#{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="font-serif font-bold text-stone-900 dark:text-stone-100 truncate" title={attName}>
                            {attName}
                          </p>
                          {att.size && <span className="text-[10px] text-stone-500 font-sans block">{att.size}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadOrViewAttachment(att.raw || att.url)}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-orange text-white text-[11px] font-bold hover:bg-brand-orange/90 transition-colors cursor-pointer print:hidden shadow-xs"
                        title="Open attachment in new tab"
                      >
                        <Download className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <span className="hidden print:inline-block font-mono text-[11px] text-stone-600">
                        [Annexure Ref #{idx + 1}]
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
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

export default NotificationViewPage;
