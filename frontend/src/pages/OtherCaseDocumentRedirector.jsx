import React, { useEffect } from 'react';
import { API_URL } from '../services/api';

/**
 * Direct Document Viewer Bridge
 * Prevents Vercel production deployment from redirecting /api/other-cases/view-document to /login.
 * Immediately routes the browser tab to the backend VPS document stream.
 */
const OtherCaseDocumentRedirector = () => {
  useEffect(() => {
    const rawBase = (API_URL || '').trim().replace(/\/+$/, '');
    const search = window.location.search;
    
    // If API_URL is set and points to an external host (Hostinger VPS)
    if (rawBase && !rawBase.includes(window.location.host)) {
      window.location.replace(`${rawBase}/api/other-cases/view-document${search}`);
    } else {
      // In development or local proxy
      window.location.replace(`http://localhost:5000/api/other-cases/view-document${search}`);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans p-6 text-center select-none">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-base font-bold text-white mb-1">Opening Judicial Archive Record...</h2>
      <p className="text-xs text-slate-400">Streaming certified judgment document from superior court archives</p>
    </div>
  );
};

export default OtherCaseDocumentRedirector;
