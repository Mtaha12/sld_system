import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { notificationService } from '../features/notifications/services/notificationService';
import Spinner from '../components/ui/Spinner';
import { 
  ArrowLeft, Printer, Bell, Copy, Check, 
  Calendar, FileText, Download, Building, ShieldCheck, ExternalLink
} from 'lucide-react';
import { formatWordDocumentDisplay } from '../utils/wordFormatter';

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

  const [copied, setCopied] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1);

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

  const handleCopy = () => {
    const fullText = `${notification?.subject || ''}\n${notification?.number ? `Notification No: ${notification.number}` : ''}\n${notification?.department || ''}\n\n${notification?.content || ''}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
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
    <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#121316] text-stone-900 dark:text-stone-100 font-sans antialiased selection:bg-[#f15a24]/20 selection:text-[#f15a24]">
      {/* Top Floating Control Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-xs print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.close()}
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

          <div className="flex items-center gap-2">
            {/* Font Size Toggle */}
            <div className="hidden sm:flex items-center border border-stone-200 dark:border-stone-700 rounded-lg p-0.5 bg-stone-50 dark:bg-stone-800">
              {fontSizes.map((sz, idx) => (
                <button
                  key={sz.label}
                  onClick={() => setFontSizeIndex(idx)}
                  className={`px-2 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                    fontSizeIndex === idx
                      ? 'bg-white dark:bg-stone-900 text-[#f15a24] shadow-xs'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                  title={`Set text size to ${sz.label}`}
                >
                  {sz.label[0]}
                </button>
              ))}
            </div>

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
      <main className="print-document max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              margin: 0.5in;
              size: auto;
            }
            header, .print-hidden { display: none !important; }
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
        `}} />

        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-md p-6 sm:p-12 print-container">
          
          {/* ── 1. NOTIFICATION # ── */}
          <div className="text-center font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 mb-2 font-serif leading-snug">
            {sroHeaderLine}
          </div>

          {/* ── 2. SUBJECT ── */}
          <div className="text-center font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 mb-4 font-serif leading-snug max-w-3xl mx-auto">
            {subject}
          </div>

          {/* Clean dividing line as shown in reference */}
          <hr className="border-t border-stone-800 dark:border-stone-300 my-4 print-border-line" />

          {/* ── 3. DETAIL ── */}
          <article 
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
                    dangerouslySetInnerHTML={{ __html: formatWordDocumentDisplay(contentBody) }}
                  />
                );
              }

              return (
                <p className="italic text-stone-500 text-center py-6">Official gazette text record archived in SLD repository.</p>
              );
            })()}
          </article>

        </div>
      </main>
    </div>
  );
};

export default NotificationViewPage;
