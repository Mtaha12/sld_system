import React, { useEffect, useState } from 'react';
import { API_URL } from '../services/api';
import { FileText, Download, ExternalLink, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

/**
 * AttachmentViewerRedirector
 * Catches direct /uploads/* navigation in the SPA router.
 * Prevents Vercel production deployment from redirecting attachment URLs to /login.
 * Bridges the browser tab safely to the backend API or renders the document inline.
 */
const AttachmentViewerRedirector = () => {
  const [targetUrl, setTargetUrl] = useState('');
  const [fileName, setFileName] = useState('Document');
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    try {
      const pathname = window.location.pathname;
      const search = window.location.search;
      const rawBase = (API_URL || '').trim().replace(/\/+$/, '');
      
      const cleanName = decodeURIComponent(pathname.split('/').pop() || 'Document');
      setFileName(cleanName);

      // Determine absolute backend URL
      let resolvedUrl = pathname;
      if (rawBase && !rawBase.includes(window.location.host)) {
        resolvedUrl = `${rawBase}${pathname}${search}`;
      } else {
        // Fallback for local development or direct proxy
        resolvedUrl = pathname.startsWith('/uploads') ? pathname : `/uploads${pathname}`;
      }

      setTargetUrl(resolvedUrl);

      // Immediate redirect to server static file
      const timer = setTimeout(() => {
        window.location.replace(resolvedUrl);
      }, 100);

      return () => clearTimeout(timer);
    } catch (err) {
      console.error('AttachmentViewerRedirector error:', err);
      setIsRedirecting(false);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans p-6 text-center select-none">
      <div className="w-full max-w-md p-8 bg-slate-800/90 rounded-2xl border border-slate-700 shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-5 border border-orange-500/30">
          <FileText className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-white mb-2">Opening Attachment...</h1>
        <p className="text-xs text-slate-400 mb-6 font-mono break-all max-w-xs px-2 py-1 bg-slate-900/60 rounded border border-slate-700/60">
          {fileName}
        </p>

        {isRedirecting && (
          <div className="flex items-center gap-2 text-xs text-orange-400 mb-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Streaming document from official legal archive...</span>
          </div>
        )}

        {targetUrl && (
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-orange-600/30"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Document
            </a>
            <a
              href={targetUrl}
              download={fileName}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl transition-colors border border-slate-600"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={() => window.close()}
          className="mt-6 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
        >
          Close Tab
        </button>
      </div>
    </div>
  );
};

export default AttachmentViewerRedirector;
