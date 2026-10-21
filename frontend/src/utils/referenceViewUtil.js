/**
 * Utility to safely open Reference "View" data (Hyperlinks, File Attachments, or Text Notes)
 * in a brand new browser tab without affecting the current application state.
 */

const escapeHtml = (unsafe) => {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const hasReferenceView = (item) => {
  if (!item) return false;
  const raw = item.viewData || item.viewUrl || item.view;
  return Boolean(raw && String(raw).trim().length > 0);
};

export const openReferenceView = (item) => {
  if (!item) return;

  const rawData = String(item.viewData || item.viewUrl || item.view || '').trim();
  const viewType = item.viewType || '';
  const title = item.title || item.heading || item.name || item.viewTitle || 'SLD Legal Reference';

  if (!rawData) return;

  // 1. Hyperlink: If specified as link or matches URL pattern
  const isUrlPattern = /^https?:\/\//i.test(rawData) || /^(www\.)[a-z0-9]/i.test(rawData);
  if (viewType === 'link' || (!viewType && isUrlPattern)) {
    // Sanitize against dangerous schemes
    if (/^(javascript|vbscript|data):/i.test(rawData)) {
      console.warn('Blocked potentially unsafe protocol');
      return;
    }
    const safeUrl = /^https?:\/\//i.test(rawData) ? rawData : `https://${rawData}`;
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // 2. File Attachment: If specified as file or path starts with /uploads/
  const isFilePath = rawData.startsWith('/uploads/') || /\.(pdf|docx?|txt|rtf|png|jpe?g|webp)$/i.test(rawData);
  if (viewType === 'file' || (!viewType && isFilePath)) {
    const fullUrl = rawData.startsWith('http')
      ? rawData
      : `${window.location.origin}${rawData.startsWith('/') ? '' : '/'}${rawData}`;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // 3. Text Content: Render in a new tab with styled document viewer
  const formattedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)} - SLD View</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 40px 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      line-height: 1.7;
    }
    .wrapper {
      max-width: 860px;
      margin: 0 auto;
      background: #1e293b;
      padding: 36px 44px;
      border-radius: 16px;
      border: 1px solid #334155;
      box-shadow: 0 20px 45px rgba(0,0,0,0.45);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #ffffff;
      padding: 4px 14px;
      border-radius: 9999px;
      margin-bottom: 18px;
    }
    h1 {
      margin: 0 0 16px 0;
      font-size: 24px;
      font-weight: 700;
      color: #38bdf8;
      border-bottom: 1px solid #334155;
      padding-bottom: 14px;
      word-break: break-word;
    }
    .content-box {
      background: #0b1120;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 24px;
      font-size: 15px;
      color: #cbd5e1;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: inherit;
    }
    .footer {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #64748b;
    }
    .print-btn {
      background: #334155;
      color: #f8fafc;
      border: none;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .print-btn:hover { background: #475569; }
    @media print {
      @page { margin: 0.5in; }
      body { background: #fff; color: #000; padding: 0; font-size: 15px; line-height: 1.75; }
      .wrapper { border: none; box-shadow: none; padding: 0; background: #fff; }
      .content-box { background: #fff; border: 1px solid #ddd; color: #000; }
      h1 { font-size: 18px; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="badge">SLD System Reference View</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="content-box">${escapeHtml(rawData)}</div>
    <div class="footer">
      <span>Official SLD Legal Reference Record</span>
      <button class="print-btn" onclick="window.print()">Print Document</button>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([formattedHtml], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
};
