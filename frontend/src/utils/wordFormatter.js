/**
 * Word Document Text & HTML Formatting Utilities
 * Standardizes pasted text and database content into clean, professional
 * Microsoft Word document typography across the application without
 * unusual margins, broken paragraphs, or excessive line skipping.
 */

/**
 * Cleans raw pasted HTML from Microsoft Word or other text processors.
 * Strips XML namespaces, Mso styles, redundant font overrides, and collapses
 * multiple blank paragraph gaps into clean Word-style spacing.
 */
export const cleanWordPasteHtml = (html) => {
  if (!html || typeof html !== 'string') return '';

  let cleaned = html;

  // 1. Remove XML declarations and Word conditional comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/<xml[\s\S]*?<\/xml>/gi, '');
  cleaned = cleaned.replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, '');
  cleaned = cleaned.replace(/<\/?o:[a-z0-9_-]+[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/?w:[a-z0-9_-]+[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/?m:[a-z0-9_-]+[^>]*>/gi, '');

  // 2. Remove Mso- classes and Mso- styles
  cleaned = cleaned.replace(/\sclass="?[a-z0-9_-]*mso[a-z0-9_-]*"?/gi, '');
  cleaned = cleaned.replace(/mso-[^:;"]+:[^;"]+;?/gi, '');

  // 3. Normalize excessive line heights and margins from Word
  cleaned = cleaned.replace(/line-height:\s*[^;"]+;?/gi, 'line-height: 1.6;');
  cleaned = cleaned.replace(/margin(?:-bottom|-top)?:\s*[^;"]+;?/gi, 'margin: 0 0 6px 0;');
  cleaned = cleaned.replace(/font-family:\s*[^;"]+;?/gi, '');

  // 4. Collapse 2 or more empty paragraphs / linebreaks into a single normal gap
  cleaned = cleaned.replace(/(?:<p[^>]*>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>\s*){2,}/gi, '<p>&nbsp;</p>');
  cleaned = cleaned.replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br/><br/>');

  // 5. Clean empty spans and empty font tags
  cleaned = cleaned.replace(/<span\s*>(.*?)<\/span>/gi, '$1');
  cleaned = cleaned.replace(/<font[^>]*>(.*?)<\/font>/gi, '$1');

  return cleaned.trim();
};

/**
 * Prepares database content for display in Word document layout.
 * Resolves both HTML and raw plaintext with proper paragraphs and linebreaks,
 * eliminating accidental double spacing caused by whitespace-pre-wrap or raw \n.
 */
export const formatWordDocumentDisplay = (rawContent) => {
  if (!rawContent || typeof rawContent !== 'string') return '';

  const trimmed = rawContent.trim();
  if (!trimmed) return '';

  const hasHtmlTags = /<\/?(?:p|div|br|h[1-6]|ul|ol|li|table|blockquote|span|b|i|strong|em)[^>]*>/i.test(trimmed);

  if (hasHtmlTags) {
    let clean = cleanWordPasteHtml(trimmed);
    // Remove newlines immediately adjacent to tags to avoid extra whitespace rendering
    clean = clean.replace(/>\s*\n+\s*</g, '><');
    // Collapse multiple empty paragraph blocks
    clean = clean.replace(/(?:<p[^>]*>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>\s*){2,}/gi, '<p>&nbsp;</p>');
    return clean;
  }

  // Plain text input: convert double newlines into clean Word paragraphs
  const paragraphs = trimmed
    .split(/\r?\n\s*\r?\n/)
    .map(p => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return '';

  return paragraphs
    .map(p => `<p>${p.replace(/\r?\n/g, '<br/>')}</p>`)
    .join('');
};

export default {
  cleanWordPasteHtml,
  formatWordDocumentDisplay
};
