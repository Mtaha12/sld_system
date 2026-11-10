import { useEffect } from 'react';
import api from '../services/api.js';

/**
 * Strict legal document security verification before printing.
 * Verifies that the user has an active, legitimate session on the SLD server.
 * If unauthenticated, fake, or revoked by administrator, cancels printing immediately,
 * purges local session tokens, alerts the user, and redirects to /login.
 *
 * @param {Object} [options]
 * @param {Function} [options.onBeforePrint] Optional callback before print dialog opens
 * @param {Function} [options.onAuthFailed] Optional custom failure handler
 * @returns {Promise<boolean>} Resolves true if print was triggered, false if blocked
 */
export const verifyAndPrint = async ({ onBeforePrint, onAuthFailed } = {}) => {
  const token = localStorage.getItem('sld_access_token');
  const isAuthSession = localStorage.getItem('sld_auth_session') === 'true';

  // 1. Initial local token validation
  if (!token || !isAuthSession) {
    const errorMsg = 'Access Denied: You must be logged in with an active account to print official legal documents.';
    if (typeof onAuthFailed === 'function') {
      onAuthFailed(errorMsg);
    } else {
      alert(errorMsg);
    }
    window.location.href = '/login';
    return false;
  }

  // 2. Real-time authoritative server session verification
  try {
    const res = await api.get('/api/auth/me');
    if (!res?.data?.success || !res?.data?.data) {
      throw new Error('Server session verification returned an invalid response.');
    }

    // Verify user is active
    const user = res.data.data;
    if (user.status && user.status.toUpperCase() !== 'ACTIVE') {
      throw new Error(`Your account is currently ${user.status}.`);
    }

    // 3. User session is 100% verified and active: Proceed to print
    if (typeof onBeforePrint === 'function') {
      onBeforePrint();
    }
    window.print();
    return true;
  } catch (err) {
    console.error('[SecurePrint] Security verification failed:', err);

    // Immediate cleanup of invalid / revoked session
    try {
      localStorage.removeItem('sld_access_token');
      localStorage.removeItem('sld_refresh_token');
      localStorage.removeItem('sld_auth_session');
      localStorage.removeItem('sld_user_profile');
    } catch {
      // ignore
    }

    const serverMsg = err.response?.data?.message || err.message;
    const finalMsg = `Access Denied: Your session is invalid, expired, or has been closed by an administrator (${serverMsg}).\n\nPlease log in again to access and print documents.`;

    if (typeof onAuthFailed === 'function') {
      onAuthFailed(finalMsg);
    } else {
      alert(finalMsg);
    }

    window.location.href = '/login';
    return false;
  }
};

/**
 * Hook to intercept Ctrl+P / Cmd+P shortcuts and prevent unauthenticated document printing.
 * Automatically attaches listeners and ensures keyboard print shortcuts are guarded by verifyAndPrint.
 */
export const useSecurePrintShortcut = ({ onBeforePrint } = {}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        verifyAndPrint({ onBeforePrint });
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onBeforePrint]);
};

export const PRINT_PAGE_SIZES = {
  auto: 'auto',
  a4: '210mm 297mm',
  letter: '8.5in 11in',
  legal: '8.5in 14in',
};

export const getPagePrintSizeCss = (pageSize) =>
  PRINT_PAGE_SIZES[String(pageSize || 'auto').toLowerCase()] || 'auto';

export const buildUniformPrintCss = (pageSize = 'auto') => `
  @media print {
    @page {
      size: ${getPagePrintSizeCss(pageSize)};
      margin: 6mm;
    }
    html, body, #root {
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: white !important;
      color: black !important;
      font-size: 12pt !important;
      line-height: 1.5 !important;
      zoom: 1 !important;
      transform: none !important;
      -webkit-text-size-adjust: none !important;
      text-size-adjust: none !important;
    }
    .print-document,
    .print-sheet,
    .print-container {
      width: 100% !important;
      max-width: 100% !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      background: white !important;
      color: black !important;
    }
    .print-document *,
    .print-container * {
      font-size: 12pt !important;
      line-height: 1.5 !important;
      overflow-wrap: anywhere !important;
      word-break: break-word !important;
      -webkit-text-size-adjust: none !important;
      text-size-adjust: none !important;
    }
    .print-document h1,
    .print-container h1 {
      font-size: 14pt !important;
      line-height: 1.3 !important;
    }
    .print-document h2,
    .print-container h2 {
      font-size: 12.5pt !important;
      line-height: 1.35 !important;
    }
    .print-document h3,
    .print-document h4,
    .print-container h3,
    .print-container h4 {
      font-size: 12pt !important;
      line-height: 1.35 !important;
    }
    .print-document p,
    .print-document div.word-p,
    .print-container p {
      orphans: 1 !important;
      widows: 1 !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    .statute-block-card {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
  }
`;

export default verifyAndPrint;

