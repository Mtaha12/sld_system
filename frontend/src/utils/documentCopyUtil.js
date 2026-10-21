/**
 * Document Copy Utility for SLD System
 * Formats legislative provisions, court judgments, and official gazettes
 * for pristine pasting into Microsoft Word, LibreOffice, and plain text editors.
 * Eliminates raw HTML entities (&nbsp;, &ldquo;, &rdquo;, etc.) and preserves
 * proper typography, paragraphs, line breaks, and metadata headers.
 */

export const decodeHtmlEntities = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return '';
  
  const entities = {
    '&nbsp;': ' ',
    '&ldquo;': '“',
    '&rdquo;': '”',
    '&lsquo;': '‘',
    '&rsquo;': '’',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&ndash;': '–',
    '&mdash;': '—',
    '&bull;': '•',
    '&hellip;': '…',
    '&sect;': '§',
    '&copy;': '©',
    '&reg;': '®'
  };

  let decoded = rawText.replace(/&(?:nbsp|ldquo|rdquo|lsquo|rsquo|quot|apos|#39|amp|lt|gt|ndash|mdash|bull|hellip|sect|copy|reg);/gi, (match) => {
    return entities[match.toLowerCase()] ?? match;
  });

  // Decode numeric entities &#160; etc.
  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch {
      return _;
    }
  });

  // Decode hex entities &#x201C; etc.
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return _;
    }
  });

  return decoded;
};

export const htmlToCleanPlainText = (html) => {
  if (!html || typeof html !== 'string') return '';
  let str = html;

  // Standardize breaks and paragraphs to newlines
  str = str.replace(/<br\s*\/?>/gi, '\n');
  str = str.replace(/<\/p>/gi, '\n\n');
  str = str.replace(/<\/div>/gi, '\n');
  str = str.replace(/<\/h[1-6]>/gi, '\n\n');
  str = str.replace(/<\/li>/gi, '\n');
  str = str.replace(/<\/tr>/gi, '\n');
  str = str.replace(/<\/td>/gi, '\t');
  str = str.replace(/<\/th>/gi, '\t');

  // Strip remaining HTML tags
  str = str.replace(/<[^>]+>/g, '');

  // Decode entities into proper characters
  str = decodeHtmlEntities(str);

  // Normalize line endings and collapse 3+ consecutive newlines into 2
  str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  str = str.replace(/\n{3,}/g, '\n\n');

  // Clean horizontal spaces per line while preserving paragraph breaks
  const cleanedLines = str.split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim());
  return cleanedLines.join('\n').trim();
};

/**
 * Copies structured legal documents into the system clipboard with both
 * rich formatted text (text/html) and clean decoded plain text (text/plain).
 */
export const copyCleanDocument = async ({
  title = '',
  chapter = '',
  section = '',
  heading = '',
  blocks = [],
  singleContent = '',
  referenceNumber = '',
  dateStr = '',
  department = ''
}) => {
  // 1. Build Clean Plain Text
  let plain = '';
  if (title) plain += `${title}\n`;
  if (referenceNumber) plain += `Reference: ${referenceNumber}\n`;
  if (chapter) plain += `Chapter: ${chapter}\n`;
  if (section) plain += `Section: ${section}\n`;
  if (heading) plain += `Heading: ${heading}\n`;
  if (department) plain += `Department: ${department}\n`;
  if (dateStr) plain += `Date: ${dateStr}\n`;
  plain += '\n';

  if (Array.isArray(blocks) && blocks.length > 0) {
    blocks.forEach((b, idx) => {
      if (blocks.length > 1) {
        plain += `--- Block ${idx + 1} ---\n`;
      }
      if (b.sectionHeading) plain += `Heading: ${b.sectionHeading}\n`;
      if (b.fromDate || b.toDate) {
        const from = b.fromDate ? String(b.fromDate).split('T')[0] : '';
        const to = b.toDate ? String(b.toDate).split('T')[0] : '';
        plain += `Period: ${from} to ${to}\n`;
      }
      if (b.date) {
        plain += `Date: ${String(b.date).split('T')[0]}\n`;
      }
      if (b.detail || b.content || b.text) {
        const blockText = htmlToCleanPlainText(b.detail || b.content || b.text);
        plain += `\n${blockText}\n\n`;
      }
    });
  } else if (singleContent) {
    plain += `${htmlToCleanPlainText(singleContent)}\n`;
  }
  plain = plain.trim();

  // 2. Build Clean Word-Compatible HTML
  let html = `<div style="font-family: Calibri, 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: #111827;">`;
  if (title) {
    html += `<h1 style="font-size: 18pt; font-weight: bold; margin: 0 0 8pt 0; color: #111827; text-transform: uppercase;">${decodeHtmlEntities(title)}</h1>`;
  }
  
  const metaItems = [];
  if (referenceNumber) metaItems.push(`<b>Reference:</b> ${decodeHtmlEntities(referenceNumber)}`);
  if (chapter) metaItems.push(`<b>Chapter:</b> ${decodeHtmlEntities(chapter)}`);
  if (section) metaItems.push(`<b>Section:</b> ${decodeHtmlEntities(section)}`);
  if (heading) metaItems.push(`<b>Heading:</b> ${decodeHtmlEntities(heading)}`);
  if (department) metaItems.push(`<b>Department:</b> ${decodeHtmlEntities(department)}`);
  if (dateStr) metaItems.push(`<b>Date:</b> ${decodeHtmlEntities(dateStr)}`);

  if (metaItems.length > 0) {
    html += `<p style="font-size: 10pt; color: #4b5563; margin: 0 0 12pt 0; padding-bottom: 6pt; border-bottom: 1.5pt solid #d1d5db;">${metaItems.join(' &nbsp;|&nbsp; ')}</p>`;
  }

  if (Array.isArray(blocks) && blocks.length > 0) {
    blocks.forEach((b, idx) => {
      html += `<div style="margin: 0 0 16pt 0;">`;
      if (blocks.length > 1) {
        html += `<h2 style="font-size: 13pt; font-weight: bold; margin: 0 0 4pt 0; color: #1f2937;">Block ${idx + 1}</h2>`;
      }
      if (b.sectionHeading) {
        html += `<h3 style="font-size: 12pt; font-weight: bold; margin: 0 0 4pt 0; color: #374151;">${decodeHtmlEntities(b.sectionHeading)}</h3>`;
      }
      if (b.fromDate || b.toDate) {
        const from = b.fromDate ? String(b.fromDate).split('T')[0] : '';
        const to = b.toDate ? String(b.toDate).split('T')[0] : '';
        html += `<p style="font-size: 9.5pt; color: #6b7280; margin: 0 0 6pt 0;"><b>Period:</b> ${from} to ${to}</p>`;
      }
      if (b.detail || b.content || b.text) {
        // Decode entities while preserving basic paragraph tags
        let cleanBlockHtml = decodeHtmlEntities(b.detail || b.content || b.text);
        if (!/<p/i.test(cleanBlockHtml)) {
          cleanBlockHtml = cleanBlockHtml.split('\n\n').map(p => `<p style="margin: 0 0 6pt 0; line-height: 1.5;">${p.replace(/\n/g, '<br/>')}</p>`).join('');
        }
        html += `<div style="font-size: 11pt; line-height: 1.6; text-align: justify;">${cleanBlockHtml}</div>`;
      }
      html += `</div>`;
    });
  } else if (singleContent) {
    let cleanSingleHtml = decodeHtmlEntities(singleContent);
    if (!/<p/i.test(cleanSingleHtml)) {
      cleanSingleHtml = cleanSingleHtml.split('\n\n').map(p => `<p style="margin: 0 0 6pt 0; line-height: 1.5;">${p.replace(/\n/g, '<br/>')}</p>`).join('');
    }
    html += `<div style="font-size: 11pt; line-height: 1.6; text-align: justify;">${cleanSingleHtml}</div>`;
  }
  html += `</div>`;

  // 3. Write to Clipboard with rich and plain MIME types
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const blobText = new Blob([plain], { type: 'text/plain' });
      const blobHtml = new Blob([html], { type: 'text/html' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': blobText,
          'text/html': blobHtml
        })
      ]);
      return true;
    }
  } catch (err) {
    console.warn('[ClipboardItem rich copy warning, using writeText fallback]:', err);
  }

  // Fallback
  await navigator.clipboard.writeText(plain);
  return true;
};
