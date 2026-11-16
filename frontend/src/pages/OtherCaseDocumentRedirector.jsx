import React, { useEffect } from 'react';
import { getActiveApiBaseUrl } from '../services/api';

/**
 * Direct Document Viewer Bridge
 * Prevents Vercel production deployment from redirecting /api/other-cases/view-document to /login.
 * Immediately routes the browser tab to the backend VPS document stream.
 */
const OtherCaseDocumentRedirector = () => {
  useEffect(() => {
    const rawBase = getActiveApiBaseUrl();
    const search = window.location.search;
    window.location.replace(`${rawBase}/api/other-cases/view-document${search}`);
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
