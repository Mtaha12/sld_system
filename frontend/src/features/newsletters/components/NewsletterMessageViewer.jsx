import React, { useState, useMemo } from 'react';
import { DownloadCloud, ExternalLink, Copy, Check, Printer, FileText } from 'lucide-react';

/**
 * NewsletterMessageViewer
 * Beautifully formats newsletter message bodies with:
 * - Proper line breaks, paragraph spacing, and legible typography
 * - Highlighting of legal update headings, case law titles, and laws
 * - Interactive pills for attached document download links
 * - Clean section divider lines
 * - One-click Copy & Print utilities
 */
const NewsletterMessageViewer = ({ message, subject, date, srNumber, category }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!message) return;
    // Strip HTML tags for clean clipboard copying
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = message;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${subject || 'Newsletter'} - SLD System</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; padding: 40px; }
            h1 { font-size: 20px; border-bottom: 2px solid #ea580c; padding-bottom: 8px; margin-bottom: 16px; color: #111; }
            .meta { font-size: 13px; color: #666; margin-bottom: 24px; }
            .content { white-space: pre-wrap; font-size: 14px; word-break: break-word; }
            a { color: #ea580c; font-weight: bold; text-decoration: underline; }
            hr { border: none; border-top: 1px dashed #ccc; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>${subject || 'Newsletter Update'}</h1>
          <div class="meta">SR #${srNumber || '—'} • Date: ${date || '—'} • Category: ${category || '—'}</div>
          <div class="content">${message}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  // Enhance message HTML:
  // 1. Convert ================= or ---------------- into clean styled dividers
  // 2. Wrap <a> links in high-contrast download buttons
  const formattedHtml = useMemo(() => {
    if (!message) return '';

    let html = message;

    // Normalize Windows CRLF to standard LF
    html = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Replace sequences of 6 or more = or - characters with clean styled dividers
    html = html.replace(/[=]{6,}/g, '<div class="my-4 border-t-2 border-dashed border-gray-300 dark:border-gray-700"></div>');
    html = html.replace(/[-]{6,}/g, '<div class="my-3 border-t border-dashed border-gray-200 dark:border-gray-800"></div>');

    // Style any <a> links with attractive document download pill classes
    html = html.replace(
      /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1([^>]*)>(.*?)<\/a>/gi,
      (match, q, href, rest, text) => {
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 my-1.5 rounded-lg font-bold text-xs bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800/60 hover:bg-orange-600 hover:text-white transition-all shadow-sm" ${rest}><svg class="w-3.5 h-3.5 inline shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> <span>${text}</span> <svg class="w-3 h-3 inline opacity-70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a>`;
      }
    );

    return html;
  }, [message]);

  if (!message) {
    return (
      <div className="p-8 text-center text-theme-muted italic bg-gray-50 dark:bg-theme-surface-alt rounded-xl border border-theme-border">
        No message content recorded for this newsletter.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Action Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-theme-surface-alt/70 rounded-lg border border-theme-border/60 text-xs">
        <div className="flex items-center gap-2 text-theme-muted font-medium">
          <FileText className="w-4 h-4 text-brand-orange" />
          <span>Full Legal Bulletin Transcript</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white dark:bg-theme-surface hover:bg-gray-50 border border-theme-border text-theme-main font-medium shadow-sm transition-colors"
            title="Copy plain text to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white dark:bg-theme-surface hover:bg-gray-50 border border-theme-border text-theme-main font-medium shadow-sm transition-colors"
            title="Print or save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Text Content Container */}
      <div 
        className="p-5 sm:p-6 rounded-xl bg-white dark:bg-theme-surface border border-theme-border shadow-inner text-theme-main font-sans text-[13.5px] leading-relaxed max-h-[62vh] overflow-y-auto whitespace-pre-line selection:bg-brand-orange selection:text-white"
        dangerouslySetInnerHTML={{ __html: formattedHtml }}
      />
    </div>
  );
};

export default NewsletterMessageViewer;
