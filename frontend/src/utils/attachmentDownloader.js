/**
 * Universal Attachment Downloader & Safe Viewer
 * Handles base64 data URLs, Blob URLs, and server static files safely across modern browsers.
 * Prevents Chrome/Edge 'about:blank#blocked' errors when handling PDF/image data URIs.
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

export const getAttachmentUrl = (att) => {
  if (!att) return '';
  if (typeof att === 'string') {
    if (att.startsWith('http://') || att.startsWith('https://') || att.startsWith('data:') || att.startsWith('blob:')) {
      return att;
    }
    return att.startsWith('/') ? att : `/uploads/${att}`;
  }
  if (att.url) return att.url;
  if (att.path) return att.path.startsWith('/') ? att.path : `/${att.path}`;
  if (att.name) return `/uploads/${att.name}`;
  return '';
};

/**
 * Safely downloads or views an attachment in the browser.
 * For data URLs (base64): converts to a binary Blob first to bypass top-level data: URL navigation blocks.
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

    // 2. Regular Server URL / Remote URL
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('blob:')) {
      targetUrl = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
    }

    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = targetUrl;
    if (download) {
      link.download = name;
    } else {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 2000);
  } catch (err) {
    console.error('downloadOrViewAttachment error:', err);
  }
};
