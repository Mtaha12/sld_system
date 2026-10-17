import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { newsletterService } from '../features/newsletters/services/newsletterService';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { 
  Mail, Calendar, Tag, Paperclip, Download, Copy, Check, 
  Printer, ArrowLeft, ShieldCheck, ExternalLink, FileText, Share2 
} from 'lucide-react';
import { formatWordDocumentDisplay } from '../utils/wordFormatter';

const NewsletterViewPage = () => {
  const { id } = useParams();
  const [newsletter, setNewsletter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true);
        // Try public endpoint first, fallback to standard
        let data = null;
        try {
          data = await newsletterService.getPublicNewsletter(id);
        } catch (e) {
          data = await newsletterService.getNewsletterById(id);
        }

        if (!data) {
          setError('No document found matching this link.');
        } else {
          setNewsletter(data);
        }
      } catch (err) {
        console.error('Failed to load newsletter document:', err);
        setError('Failed to load the document. The link may be expired or invalid.');
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  const handleCopyLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadAttachment = () => {
    if (!newsletter?.attachment) return;
    const a = document.createElement('a');
    a.href = newsletter.attachment;
    a.download = newsletter.attachmentName || `Document_${newsletter.srNumber || 'attachment'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <Spinner size="lg" />
        <span className="mt-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Loading Document...
        </span>
      </div>
    );
  }

  if (error || !newsletter) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 mb-4 shadow-sm">
          <Mail className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Document Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">{error || 'This document is unavailable or has been removed.'}</p>
        <Link to="/newsletters" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-orange text-white text-xs font-semibold rounded-lg hover:bg-brand-orange-hover transition-colors">
          <ArrowLeft className="w-4 h-4" /> Go to Digest Home
        </Link>
      </div>
    );
  }

  const isPdfAttachment = newsletter.attachment?.startsWith('data:application/pdf') || newsletter.attachmentName?.endsWith('.pdf');
  const isImageAttachment = newsletter.attachment?.startsWith('data:image/') || newsletter.attachmentName?.match(/\.(png|jpg|jpeg|webp)$/i);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-stone-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-brand-orange/20 selection:text-brand-orange font-sans">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-slate-200 dark:border-stone-800 shadow-xs print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-orange/10 flex items-center justify-center border border-brand-orange/30 text-brand-orange shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Supreme Law Digest (SLD)
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" /> Official Document
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Shared Gazette & Legal Digest Announcement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                copied 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                  : 'bg-white dark:bg-stone-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-stone-700 hover:bg-slate-50 dark:hover:bg-stone-700'
              }`}
              title="Copy shareable document link"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5 text-brand-orange" />}
              <span>{copied ? 'Link Copied!' : 'Share Link'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-stone-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-stone-700 hover:bg-slate-50 dark:hover:bg-stone-700 transition-all cursor-pointer shadow-2xs"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 my-4">
        <article className="bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none">
          
          {/* Document Header Banner */}
          <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-stone-800/80 bg-linear-to-b from-slate-50/70 to-white dark:from-stone-900/50 dark:to-stone-900">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
                <Tag className="w-3.5 h-3.5" /> {newsletter.category || 'Official Update'}
              </span>

              {newsletter.date && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5" /> {newsletter.date}
                </span>
              )}

              <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto font-mono">
                DOC #{newsletter.srNumber || newsletter.id}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
              {newsletter.subject}
            </h1>
          </div>

          {/* Document Text Body */}
          <div className="p-6 sm:p-8">
            {newsletter.message ? (
              <div 
                className="word-document-content max-w-none text-slate-700 dark:text-slate-200 leading-relaxed text-[15px] sm:text-[16px]"
                dangerouslySetInnerHTML={{ __html: formatWordDocumentDisplay(newsletter.message) }}
              />
            ) : (
              <div className="text-sm text-slate-400 italic">No document text description provided.</div>
            )}

            {/* Document Attachment Box */}
            {newsletter.attachment && (
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-stone-800">
                <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-stone-700/80 bg-slate-50 dark:bg-stone-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center border border-brand-orange/20 shrink-0 shadow-2xs">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {newsletter.attachmentName || 'Official Document Attachment'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Certified file attachment • Click to view or download
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center gap-2 whitespace-nowrap px-4 shrink-0 shadow-sm"
                    onClick={handleDownloadAttachment}
                  >
                    <Download className="w-4 h-4" /> Download File
                  </Button>
                </div>

                {/* Inline PDF Preview */}
                {isPdfAttachment && (
                  <div className="mt-4 rounded-xl border border-slate-200 dark:border-stone-700 overflow-hidden shadow-xs">
                    <div className="px-4 py-2 bg-slate-100 dark:bg-stone-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span>Document Preview</span>
                      <span className="text-[11px] text-slate-400">PDF Document</span>
                    </div>
                    <iframe
                      src={`${newsletter.attachment}#toolbar=0`}
                      title="Attached PDF Preview"
                      className="w-full h-[600px] bg-white"
                    />
                  </div>
                )}

                {/* Inline Image Preview */}
                {isImageAttachment && (
                  <div className="mt-4 rounded-xl border border-slate-200 dark:border-stone-700 overflow-hidden p-2 bg-slate-50 dark:bg-stone-800 flex justify-center">
                    <img 
                      src={newsletter.attachment} 
                      alt={newsletter.attachmentName || 'Attachment'} 
                      className="max-h-[500px] object-contain rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document Footer */}
          <div className="px-6 sm:px-8 py-4 bg-slate-50/70 dark:bg-stone-900/60 border-t border-slate-100 dark:border-stone-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
            <span>Supreme Law Digest System of Pakistan</span>
            <span>Public Access Link Document</span>
          </div>

        </article>
      </main>

      {/* Simple Public Footer */}
      <footer className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-stone-800/60 print:hidden">
        © {new Date().getFullYear()} Supreme Law Digest (SLD) System. All Rights Reserved.
      </footer>

    </div>
  );
};

export default NewsletterViewPage;
