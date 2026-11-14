import api, { API_URL } from '../services/api';

/**
 * Universal Attachment Downloader & Safe Inline Viewer
 * Handles base64 data URLs, Blob URLs, protected API streams, static /uploads files,
 * PDFs, images, text, and Office files (Excel/CSV/Word) cleanly inside a new browser tab.
 */

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const bytesToBase64 = (bytes) => {
  const chunk = 0x8000;
  const parts = [];
  for (let i = 0; i < bytes.length; i += chunk) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)));
  }
  return btoa(parts.join(''));
};

const detectMimeAndCategory = (bytes, filename = '', contentType = '') => {
  const lowerName = String(filename || '').split('?')[0].toLowerCase();
  const lowerMime = String(contentType || '').toLowerCase();

  if (bytes && bytes.length >= 5) {
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) {
      return { mime: 'application/pdf', category: 'pdf' };
    }
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { mime: 'image/png', category: 'image' };
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { mime: 'image/jpeg', category: 'image' };
    }
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return { mime: 'image/gif', category: 'image' };
    }
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      return { mime: 'image/webp', category: 'image' };
    }
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
      return { mime: lowerMime || 'application/octet-stream', category: 'office' };
    }
    if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
      return { mime: lowerMime || 'application/octet-stream', category: 'office' };
    }
  }

  if (lowerName.endsWith('.pdf') || lowerMime.includes('application/pdf')) {
    return { mime: 'application/pdf', category: 'pdf' };
  }
  if (lowerMime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/.test(lowerName)) {
    const extMime = lowerName.endsWith('.png')
      ? 'image/png'
      : lowerName.endsWith('.webp')
      ? 'image/webp'
      : lowerName.endsWith('.gif')
      ? 'image/gif'
      : 'image/jpeg';
    return { mime: lowerMime.startsWith('image/') ? lowerMime : extMime, category: 'image' };
  }
  if (
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.csv') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc') ||
    lowerMime.includes('spreadsheet') ||
    lowerMime.includes('excel') ||
    lowerMime.includes('word') ||
    lowerMime.includes('officedocument') ||
    lowerMime.includes('csv')
  ) {
    return { mime: lowerMime || 'application/octet-stream', category: 'office' };
  }
  if (lowerName.endsWith('.txt') || lowerMime.startsWith('text/plain')) {
    return { mime: 'text/plain; charset=utf-8', category: 'text' };
  }
  if (lowerMime.includes('text/html') || lowerName.endsWith('.html')) {
    return { mime: 'text/html', category: 'html' };
  }
  return { mime: lowerMime && lowerMime !== 'application/octet-stream' ? lowerMime : 'application/pdf', category: 'pdf' };
};

const createPreOpenedViewerTab = (title = 'Document Viewer') => {
  const win = window.open('', '_blank');
  if (win) {
    try {
      win.opener = null;
      win.document.open();
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
        html,body{margin:0;height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#1e293b;display:flex;align-items:center;justify-content:center}
        .box{text-align:center;padding:24px}.spin{width:28px;height:28px;border:3px solid #cbd5e1;border-top-color:#f15a24;border-radius:50%;animation:s .7s linear infinite;margin:0 auto 12px}
        @keyframes s{to{transform:rotate(360deg)}}
      </style></head><body><div class="box"><div class="spin"></div><div style="font-size:13px;font-weight:600;">Opening ${escapeHtml(title)}...</div></div></body></html>`);
      win.document.close();
    } catch (_) {}
  }
  return win;
};

const renderHtmlIntoViewerTab = (viewerWin, title, downloadHref, downloadName, bodyHtml, isRawDocument = false) => {
  const safeTitle = escapeHtml(title || 'Document Viewer');
  const safeName = escapeHtml(downloadName || 'document');
  const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #eef2f6; color: #0f172a; }
    .topbar { height: 44px; background: #1e293b; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; gap: 12px; }
    .title { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .actions { display: flex; align-items: center; gap: 8px; shrink: 0; }
    .btn { padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; border: none; background: #f15a24; color: #fff; }
    .btn-sec { background: #334155; color: #f8fafc; }
    .frame-host { height: calc(100vh - 44px); width: 100%; overflow: auto; }
    .doc-card { max-width: 1120px; margin: 20px auto; background: #fff; border-radius: 10px; padding: 24px 28px; box-shadow: 0 2px 10px rgba(15,23,42,.08); font-size: 14px; line-height: 1.65; }
    .doc-card h2 { font-size: 16px; margin: 18px 0 8px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .doc-card .table-wrap { overflow-x: auto; margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 6px; }
    .doc-card table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .doc-card th, .doc-card td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; vertical-align: top; }
    .doc-card tr:first-child th { background: #f1f5f9; font-weight: 700; color: #1e293b; }
    .doc-card tr:nth-child(even) td { background: #f8fafc; }
    .doc-card pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; margin: 0; font-size: 14px; }
    .doc-card .muted { color: #64748b; font-size: 12px; font-style: italic; }
    @media print { .topbar { display: none; } body { background: #fff; } .frame-host { height: auto; overflow: visible; } .doc-card { box-shadow: none; margin: 0; padding: 0; max-width: 100%; } }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="title">${safeTitle}</div>
    <div class="actions">
      <button class="btn btn-sec" onclick="window.print()">Print</button>
      ${downloadHref ? `<a class="btn" href="${escapeHtml(downloadHref)}" download="${safeName}">Download</a>` : ''}
    </div>
  </div>
  <div class="frame-host">
    ${isRawDocument ? bodyHtml : `<div class="doc-card">${bodyHtml}</div>`}
  </div>
</body>
</html>`;

  if (viewerWin && !viewerWin.closed) {
    viewerWin.document.open();
    viewerWin.document.write(htmlDoc);
    viewerWin.document.close();
  } else {
    const htmlBlob = new Blob([htmlDoc], { type: 'text/html; charset=utf-8' });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    window.open(htmlUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(htmlUrl), 120000);
  }
};

const renderBytesIntoViewerTab = async (viewerWin, bytes, { filename = 'document', title = 'Document', contentType = '', serverPath = '' } = {}) => {
  const { mime, category } = detectMimeAndCategory(bytes, filename, contentType);
  const blob = new Blob([bytes], { type: mime });
  const blobUrl = URL.createObjectURL(blob);

  if (category === 'office' || category === 'text') {
    try {
      const payload = serverPath && !serverPath.startsWith('data:')
        ? { path: serverPath, filename, mimeType: contentType }
        : { base64: bytesToBase64(bytes), filename, mimeType: contentType || mime };
      const previewRes = await api.post('/api/attachment-preview', payload);
      const preview = previewRes.data?.data;
      if (preview?.bodyHtml && preview.format !== 'unsupported') {
        renderHtmlIntoViewerTab(viewerWin, title || filename, blobUrl, filename, preview.bodyHtml, false);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 300000);
        return;
      }
    } catch (previewErr) {
      console.warn('Server attachment preview fallback:', previewErr);
    }
  }

  if (category === 'image') {
    renderHtmlIntoViewerTab(
      viewerWin,
      title || filename,
      blobUrl,
      filename,
      `<div style="display:flex;align-items:center;justify-content:center;min-height:100%;padding:20px;"><img src="${blobUrl}" alt="${escapeHtml(filename)}" style="max-width:100%;max-height:calc(100vh - 90px);border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.18);" /></div>`,
      true
    );
    setTimeout(() => URL.revokeObjectURL(blobUrl), 300000);
    return;
  }

  if (category === 'text') {
    const text = new TextDecoder('utf-8').decode(bytes);
    renderHtmlIntoViewerTab(viewerWin, title || filename, blobUrl, filename, `<pre>${escapeHtml(text)}</pre>`, false);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 300000);
    return;
  }

  if (category === 'html') {
    if (viewerWin && !viewerWin.closed) {
      viewerWin.location.replace(blobUrl);
    } else {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 300000);
    return;
  }

  // PDF (or fallback document): render inside full-screen <embed>/<object> wrapper so browser/extensions never force-download
  renderHtmlIntoViewerTab(
    viewerWin,
    title || filename,
    blobUrl,
    filename,
    `<iframe src="${blobUrl}" style="width:100%;height:100%;border:none;background:#525659;" title="${escapeHtml(title || filename)}"></iframe>`,
    true
  );
  setTimeout(() => URL.revokeObjectURL(blobUrl), 300000);
};

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
  const isApiPath = clean.startsWith('/api/');
  const resolvedPath = isApiPath ? clean : (clean.startsWith('/uploads') ? clean : `/uploads${clean}`);

  const rawBase = (API_URL || '').trim().replace(/\/+$/, '');
  if (rawBase && typeof window !== 'undefined' && !rawBase.includes(window.location.host)) {
    return `${rawBase}${resolvedPath}`;
  }

  return resolvedPath;
};

export const getAttachmentUrl = (att) => {
  if (!att) return '';

  if (typeof att === 'string') {
    if (att.startsWith('http://') || att.startsWith('https://') || att.startsWith('data:') || att.startsWith('blob:')) {
      return att;
    }
    return getResolvedBackendUrl(att);
  }

  if (typeof File !== 'undefined' && att instanceof File) {
    try {
      return URL.createObjectURL(att);
    } catch (_) {
      return '';
    }
  }
  if (typeof Blob !== 'undefined' && att instanceof Blob) {
    try {
      return URL.createObjectURL(att);
    } catch (_) {
      return '';
    }
  }

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

const triggerBlobDownload = (blobUrl, filename) => {
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = blobUrl;
  a.download = filename || 'Document';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) document.body.removeChild(a);
  }, 2000);
};

/**
 * Fetches and renders a protected backend endpoint (e.g. /api/whatsapp-updates/:id/view) inline using Axios (with JWT auto-refresh).
 */
export const openProtectedEndpointInViewer = async (apiPath, { filename = 'Document', title = 'Document' } = {}) => {
  const viewerWin = createPreOpenedViewerTab(title || filename);
  try {
    const response = await api.get(apiPath, { responseType: 'arraybuffer' });
    const bytes = new Uint8Array(response.data);
    const contentType = response.headers?.['content-type'] || '';
    const disp = response.headers?.['content-disposition'] || '';
    const dispMatch = disp.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
    const resolvedName = (dispMatch && dispMatch[1]) ? decodeURIComponent(dispMatch[1]) : filename;

    await renderBytesIntoViewerTab(viewerWin, bytes, {
      filename: resolvedName,
      title: title || resolvedName,
      contentType
    });
  } catch (err) {
    console.error('openProtectedEndpointInViewer error:', err);
    if (viewerWin && !viewerWin.closed) {
      const msg = escapeHtml(err.response?.data?.message || err.message || 'Unable to load attachment preview.');
      renderHtmlIntoViewerTab(viewerWin, 'Attachment Error', '', '', `<p style="color:#dc2626;font-weight:600;">${msg}</p>`, false);
    }
  }
};

/**
 * Downloads a protected backend endpoint (e.g. /api/whatsapp-updates/:id/download) using Axios auth + token refresh.
 */
export const downloadProtectedEndpoint = async (apiPath, filename = 'document.pdf') => {
  try {
    const response = await api.get(apiPath, { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(response.data);
    triggerBlobDownload(blobUrl, filename);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    console.error('downloadProtectedEndpoint error:', err);
  }
};

/**
 * Safely downloads or views an attachment in the browser.
 * View mode (download === false) ALWAYS renders PDFs, images, text, and Office files (.xlsx/.xls/.csv/.docx)
 * inline in a new browser tab rather than triggering a file download.
 */
export const downloadOrViewAttachment = (att, optionsOrName = {}, legacyAction = null) => {
  try {
    if (!att) return;

    let opts = {};
    if (typeof optionsOrName === 'string') {
      opts = {
        name: optionsOrName,
        download: legacyAction === 'download' || legacyAction === true
      };
    } else if (optionsOrName && typeof optionsOrName === 'object') {
      opts = { ...optionsOrName };
      if (legacyAction !== null) {
        opts.download = legacyAction === 'download' || legacyAction === true;
      }
    }

    const download = Boolean(opts.download);
    const url = getAttachmentUrl(att);
    const name = opts.name || opts.title || getAttachmentDisplayName(att);
    const title = opts.title || name || 'Attachment Document';

    if (!url) {
      console.warn('Cannot open attachment: No URL found', att);
      return;
    }

    // 1. Base64 Data URL Handler
    if (url.startsWith('data:')) {
      try {
        const parts = url.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : '';
        const binaryString = atob(parts[1]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        if (download) {
          const detected = detectMimeAndCategory(bytes, name, mimeType);
          const blobUrl = URL.createObjectURL(new Blob([bytes], { type: detected.mime }));
          triggerBlobDownload(blobUrl, name);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } else {
          const viewerWin = createPreOpenedViewerTab(title);
          renderBytesIntoViewerTab(viewerWin, bytes, { filename: name, title, contentType: mimeType });
        }
        return;
      } catch (b64Err) {
        console.error('Failed to decode data URL:', b64Err);
      }
    }

    // 2. Blob URL Handler
    if (url.startsWith('blob:')) {
      if (download) {
        triggerBlobDownload(url, name);
      } else {
        const viewerWin = createPreOpenedViewerTab(title);
        fetch(url)
          .then((r) => r.arrayBuffer().then((buf) => ({ buf, contentType: r.headers.get('content-type') || '' })))
          .then(({ buf, contentType }) =>
            renderBytesIntoViewerTab(viewerWin, new Uint8Array(buf), { filename: name, title, contentType })
          )
          .catch(() => {
            if (viewerWin && !viewerWin.closed) viewerWin.location.replace(url);
            else window.open(url, '_blank', 'noopener,noreferrer');
          });
      }
      return;
    }

    // 3. Regular Server URL / Remote URL
    const rawString = typeof att === 'string' ? att : (att.url || att.path || att.attachment || '');
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = getResolvedBackendUrl(targetUrl);
    }
    if (
      typeof window !== 'undefined' &&
      window.location?.protocol === 'https:' &&
      /^http:\/\/(api\.sldsystempk\.com|portal\.sldsystem\.com)\//i.test(targetUrl)
    ) {
      targetUrl = targetUrl.replace(/^http:\/\//i, 'https://');
    }

    if (download) {
      let downloadUrl = targetUrl;
      if (targetUrl.includes('/uploads/')) {
        const sep = targetUrl.includes('?') ? '&' : '?';
        downloadUrl = `${targetUrl}${sep}name=${encodeURIComponent(name || title || '')}&title=${encodeURIComponent(title || name || '')}&download=1`;
      }
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = downloadUrl;
      link.download = name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 2000);
      return;
    }

    const showViewerHttpError = (status, message) => {
      const safeTitle = escapeHtml(title || name || 'Document');
      const safeMsg = escapeHtml(message || `Document could not be loaded (HTTP ${status}).`);
      const safeUrl = escapeHtml(targetUrl);
      renderHtmlIntoViewerTab(
        viewerWin,
        title || name,
        '',
        name,
        `<h2>Document Not Found (HTTP ${escapeHtml(String(status || 404))})</h2>
         <p style="margin:8px 0 12px;color:#334155;">${safeMsg}</p>
         <p class="muted" style="word-break:break-all;">Document: ${safeTitle}<br/>URL: ${safeUrl}</p>
         <p class="muted" style="margin-top:8px;">If this attachment is newly added or imported, verify that the PDF file has been uploaded in Admin Panel &rarr; Manage Emails.</p>`
      );
    };

    // View mode: Pre-open viewer tab synchronously so popup blockers never trigger,
    // then fetch bytes & render inline (never auto-downloading PDFs, Excel, Word, or octet-stream).
    const viewerWin = createPreOpenedViewerTab(title);
    const isProtectedApi = targetUrl.includes('/api/');

    if (isProtectedApi) {
      api
        .get(targetUrl, { responseType: 'arraybuffer' })
        .then((res) =>
          renderBytesIntoViewerTab(viewerWin, new Uint8Array(res.data), {
            filename: name,
            title,
            contentType: res.headers?.['content-type'] || ''
          })
        )
        .catch((err) => {
          const status = err?.response?.status;
          if (status) {
            let apiMsg = err?.response?.data?.message || '';
            if (!apiMsg && err?.response?.data instanceof ArrayBuffer) {
              try {
                apiMsg = JSON.parse(new TextDecoder().decode(err.response.data))?.message || '';
              } catch (_) {}
            }
            showViewerHttpError(status, apiMsg || `Unable to open document (HTTP ${status}).`);
            return;
          }
          if (viewerWin && !viewerWin.closed) viewerWin.location.replace(targetUrl);
        });
      return;
    }

    let fetchTargetUrl = targetUrl;
    if (targetUrl.includes('/uploads/')) {
      const sep = targetUrl.includes('?') ? '&' : '?';
      fetchTargetUrl = `${targetUrl}${sep}name=${encodeURIComponent(name || title || '')}&title=${encodeURIComponent(title || name || '')}`;
    }

    fetch(fetchTargetUrl, {
      headers: {
        'X-Document-Name': name || title || ''
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          // If static fetch returns 404, query MongoDB dynamic resolver before failing
          try {
            const fallbackResolverUrl = getResolvedBackendUrl(
              `/api/resolve-document?url=${encodeURIComponent(targetUrl)}&name=${encodeURIComponent(name || title || '')}&title=${encodeURIComponent(title || name || '')}`
            );
            const fallbackRes = await fetch(fallbackResolverUrl);
            if (fallbackRes.ok) {
              const fbType = (fallbackRes.headers.get('content-type') || '').toLowerCase();
              if (fbType.includes('text/html')) {
                const htmlContent = await fallbackRes.text();
                if (viewerWin && !viewerWin.closed) {
                  viewerWin.document.open();
                  viewerWin.document.write(htmlContent);
                  viewerWin.document.close();
                  return null;
                }
              }
              const fbBuf = await fallbackRes.arrayBuffer();
              return { buf: fbBuf, contentType: fbType || 'application/pdf' };
            }
          } catch (_) {}

          let serverMessage = '';
          try {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const errJson = await res.json();
              serverMessage = errJson?.message || '';
            }
          } catch (_) {}
          const httpErr = new Error(serverMessage || `HTTP ${res.status}`);
          httpErr.isHttpError = true;
          httpErr.status = res.status;
          throw httpErr;
        }
        const contentType = res.headers.get('content-type') || '';
        return res.arrayBuffer().then((buf) => ({ buf, contentType }));
      })
      .then((result) => {
        if (!result) return;
        const { buf, contentType } = result;
        renderBytesIntoViewerTab(viewerWin, new Uint8Array(buf), {
          filename: name,
          title,
          contentType,
          serverPath: rawString || targetUrl
        });
      })
      .catch((err) => {
        if (err?.isHttpError) {
          showViewerHttpError(err.status, err.message);
          return;
        }
        // Cross-origin external URLs without CORS fall back directly
        if (viewerWin && !viewerWin.closed) {
          viewerWin.location.replace(targetUrl);
        } else {
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
        }
      });
  } catch (err) {
    console.error('downloadOrViewAttachment error:', err);
  }
};

