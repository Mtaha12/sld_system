import { API_URL } from '../services/api';

/**
 * Universal Attachment Downloader & Safe Viewer
 * Handles base64 data URLs, Blob URLs, local files, and server static files safely across modern browsers.
 * Prevents Chrome/Edge 'about:blank#blocked' errors and Vercel SPA router redirecting to '/login'.
 */

export const getAttachmentDisplayName = (att) => {
  if (!att) return 'Attachment Document';
  if (typeof att === 'string') {
    const clean = att.split('?')[0].split('#')[0];
    const name = clean.split('/').pop();
    return name || 'Attachment Document';
  }
  return att.name || att.originalName || att.filename || (att.url ? att.url.split('/').pop() : 'Attachment Document');
};

/**
 * Resolves a relative path to an absolute backend URL when running in production
 */
export const getResolvedBackendUrl = (pathOrUrl) => {
  if (!pathOrUrl) return '';
  if (
    pathOrUrl.startsWith('http://') || 
    pathOrUrl.startsWith('https://') || 
    pathOrUrl.startsWith('data:') || 
    pathOrUrl.startsWith('blob:')
  ) {
    return pathOrUrl;
  }

  const clean = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  const uploadPath = clean.startsWith('/uploads') ? clean : `/uploads${clean}`;
  
  const rawBase = (API_URL || '').trim().replace(/\/+$/, '');
  // If API_URL points to an external server (e.g. Hostinger VPS or custom API domain)
  if (rawBase && typeof window !== 'undefined' && !rawBase.includes(window.location.host)) {
    return `${rawBase}${uploadPath}`;
  }

  return uploadPath;
};

export const getAttachmentUrl = (att) => {
  if (!att) return '';

  // Direct string handling
  if (typeof att === 'string') {
    if (att.startsWith('http://') || att.startsWith('https://') || att.startsWith('data:') || att.startsWith('blob:')) {
      return att;
    }
    return getResolvedBackendUrl(att);
  }

  // File or Blob instance
  if (typeof File !== 'undefined' && att instanceof File) {
    try {
      return URL.createObjectURL(att);
    } catch (e) {
      return '';
    }
  }
  if (typeof Blob !== 'undefined' && att instanceof Blob) {
    try {
      return URL.createObjectURL(att);
    } catch (e) {
      return '';
    }
  }

  // Object candidate checks
  const candidate = att.url || att.path || att.attachment || att.raw?.url || att.raw || '';
  if (typeof candidate === 'string' && candidate) {
    if (candidate.startsWith('http://') || candidate.startsWith('https://') || candidate.startsWith('data:') || candidate.startsWith('blob:')) {
      return candidate;
    }
    return getResolvedBackendUrl(candidate);
  }

  if (att.name) {
    return getResolvedBackendUrl(att.name);
  }

  return '';
};

/**
 * Safely downloads or views an attachment in the browser.
 * - For data URLs (base64): converts to a binary Blob to bypass top-level data: URL blocks ('about:blank#blocked').
 * - For Blob URLs: opens or downloads directly.
 * - For server URLs: resolves to absolute backend API host and opens/downloads without triggering SPA redirect to /login.
 */
export const downloadOrViewAttachment = (att, { download = false } = {}) => {
  try {
    if (!att) return;
    const url = getAttachmentUrl(att);
    const name = getAttachmentDisplayName(att);

    if (!url) {
      console.warn('Cannot download attachment: No URL found', att);
      return;
    }

    // 1. Base64 Data URL Handler: Convert to Blob to prevent about:blank#blocked
    if (url.startsWith('data:')) {
      try {
        const parts = url.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const base64Data = parts[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);

        if (download) {
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = blobUrl;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
          }, 60000);
        } else {
          // Open in a new tab safely via Blob URL
          const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // Popup blocker intercepted: fallback to direct download
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              document.body.removeChild(a);
              URL.revokeObjectURL(blobUrl);
            }, 60000);
          } else {
            setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
          }
        }
        return;
      } catch (b64Err) {
        console.error('Failed to convert data URL to Blob:', b64Err);
      }
    }

    // 2. Blob URL Handler
    if (url.startsWith('blob:')) {
      if (download) {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
        }, 1000);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    // 3. Regular Server URL / Remote URL
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = getResolvedBackendUrl(targetUrl);
    }

    if (download) {
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = targetUrl;
      link.download = name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 2000);
    } else {
      // Safely open in a new browser tab directly
      const newWin = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        // Fallback via anchor click if window.open is blocked
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = targetUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
        }, 2000);
      }
    }
  } catch (err) {
    console.error('downloadOrViewAttachment error:', err);
  }
};
