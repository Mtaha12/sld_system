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

export default verifyAndPrint;

