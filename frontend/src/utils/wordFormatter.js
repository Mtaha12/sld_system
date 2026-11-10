/**
 * Word Document Text & HTML Formatting Utilities
 * Standardizes pasted text and database content into clean, professional
 * Microsoft Word document typography across the application without
 * unusual margins, website HTML tags, inline styles, mojibake, or broken paragraphs.
 */

const MOJIBAKE_REPLACEMENTS = [
  [/\u00e2\u20ac\u201c/g, '–'],
  [/\u00e2\u20ac\u201d/g, '—'],
  [/\u00e2\u20ac\u02dc/g, '‘'],
  [/\u00e2\u20ac\u2122/g, '’'],
  [/\u00e2\u20ac\u0153/g, '“'],
  [/\u00e2\u20ac\u009d/g, '”'],
  [/\u00e2\u20ac\u00a2/g, '•'],
  [/\u00e2\u20ac\u00a6/g, '…'],
  [/â€“/g, '–'],
  [/â€”/g, '—'],
  [/â€˜/g, '‘'],
  [/â€™/g, '’'],
  [/â€œ/g, '“'],
  [/â€ /g, '”'],
  [/â€¢/g, '•'],
  [/â€¦/g, '…'],
  [/Â\u00a0/g, ' '],
  [/\u00c2\s/g, ' '],
];

const BOILERPLATE_TAG_REGEX =
  /<\/?(?:(?:html|head|body|meta|link|title|base|o:[a-z0-9_-]+|w:[a-z0-9_-]+|m:[a-z0-9_-]+|v:[a-z0-9_-]+)\b|(?:https?|mailto|ftp):)[^>]*>/gi;

const BLOCK_DIVIDER_TAG_REGEX =
  /<\/?(?:div|section|article|header|footer|aside|nav|main|figure|figcaption|center)\b[^>]*>/gi;

const STRAY_WRAPPER_TAG_REGEX =
  /<\/?(?:span|font|a|button|input|select|option|label|form)\b[^>]*>/gi;

export const fixMojibake = (str) => {
  if (!str || typeof str !== 'string') return '';
  let out = str;
  for (const [pattern, replacement] of MOJIBAKE_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
};

const stripDangerousAndBoilerplateMarkup = (input) => {
  let text = fixMojibake(input);

  // Strip comments, MS Office XML blocks, conditional tags, scripts, styles, SVGs, iframes
  text = text.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
  text = text.replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, '');
  text = text.replace(/<!DOCTYPE[^>]*>/gi, '');
  text = text.replace(/<xml\b[\s\S]*?(?:<\/xml>|$)/gi, '');
  text = text.replace(/<script\b[\s\S]*?(?:<\/script>|$)/gi, '');
  text = text.replace(/<style\b[\s\S]*?(?:<\/style>|$)/gi, '');
  text = text.replace(/<noscript\b[\s\S]*?(?:<\/noscript>|$)/gi, '');
  text = text.replace(/<svg\b[\s\S]*?(?:<\/svg>|$)/gi, '');
  text = text.replace(/<iframe\b[\s\S]*?(?:<\/iframe>|$)/gi, '');
  text = text.replace(/<head\b[\s\S]*?(?:<\/head>|$)/gi, '');

  // Strip wrapper document tags, standalone <hr>, and broken unclosed trailing <div ...
  text = text.replace(BOILERPLATE_TAG_REGEX, '');
  text = text.replace(/<(p|div|span|li|h[1-6]|td|th|strong|em|b|i|u)(?=(?:Times|Open Sans|Helvetica|Arial|font-|Courier|Verdana|Tahoma|Georgia|Calibri|Cambria))[^>]*>/gi, '<$1>');
  text = text.replace(/<hr\b[^>]*>/gi, '');
  text = text.replace(/<(?:p|div|span|a|img|table|tbody|tr|td|th|ul|ol|li|h[1-6]|strong|em|b|i|u|font|br|section|article)\b[^>]*$/gi, '');

  return text;
};

const sanitizeStyleAttribute = (styleBody, tagName = '') => {
  if (!styleBody) return '';
  const cleaned = styleBody
    .replace(/!important/gi, '')
    .replace(/font-family\s*:[^;>]+;?/gi, ';')
    .replace(/(?:"Open Sans"|"Helvetica Neue")[^;>]*;?/gi, ';');

  const isTableTag = /^(?:table|thead|tbody|tfoot|tr|td|th|col|colgroup)$/i.test(tagName);
  const kept = cleaned
    .split(';')
    .map((decl) => decl.trim())
    .filter((decl) => {
      if (!decl || !decl.includes(':')) return false;
      const idx = decl.indexOf(':');
      const p = decl.slice(0, idx).trim().toLowerCase();
      const v = decl.slice(idx + 1).trim();
      if (!v) return false;
      if (isTableTag) {
        return /^(?:text-align|font-weight|font-style|text-decoration|border(?:-collapse|-spacing|-top|-bottom|-left|-right)?|width)$/.test(
          p
        );
      }
      return /^(?:text-align|font-weight|font-style|text-decoration)$/.test(p);
    });

  return kept.length > 0 ? ` style="${kept.join('; ')}"` : '';
};

const plainTextToParagraphHtml = (plain) => {
  const cleaned = plain
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(BLOCK_DIVIDER_TAG_REGEX, '\n')
    .replace(STRAY_WRAPPER_TAG_REGEX, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) return '';

  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return '';

  return paragraphs
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
};

/**
 * Cleans raw pasted HTML from Microsoft Word, scraped websites, or rich text editors.
 * Strips XML namespaces, Mso styles, website inline styling bloat, scripts, broken
 * attributes, and collapses multiple blank paragraph gaps into clean typography.
 */
export const cleanWordPasteHtml = (html) => {
  if (!html || typeof html !== 'string') return '';

  let cleaned = stripDangerousAndBoilerplateMarkup(html);

  // Clean broken scraper attributes, nested-quote font-family rules & website inline CSS per element
  cleaned = cleaned.replace(
    /<([a-z][a-z0-9]*)\b([^>]*)>/gi,
    (_, tag, attrs) => {
      if (!attrs) return `<${tag}>`;
      let a = attrs
        .replace(/font-family\s*:[^;>]+;?/gi, ';')
        .replace(/(?:"Open Sans"|"Helvetica Neue")[^;>]*;?/gi, ';')
        .replace(/\s+(?!(?:alt|href|src|title|id|name|value)\b)[a-z0-9_-]+=""/gi, '')
        .replace(/\s+\d+(?:\.\d+)?(?:px|pt|em|rem|%)?;=""/gi, '')
        .replace(/!important"/gi, '"')
        .replace(/\sclass="?[a-z0-9_-]*mso[a-z0-9_-]*"?/gi, '')
        .replace(/\sclass="\s*"/gi, '')
        .replace(/\sstyle\s*=\s*"([^"]*)"?/gi, (__, styleBody) =>
          sanitizeStyleAttribute(styleBody, tag)
        )
        .replace(/\sstyle\s*=\s*'([^']*)'?/gi, (__, styleBody) =>
          sanitizeStyleAttribute(styleBody, tag)
        );
      a = a.replace(/\s+$/, '');
      return `<${tag}${a}>`;
    }
  );

  // Strip unstyled <span> and <font> wrappers repeatedly
  for (let i = 0; i < 3; i += 1) {
    cleaned = cleaned.replace(/<span\s*>([\s\S]*?)<\/span>/gi, '$1');
  }
  cleaned = cleaned.replace(/<font\b[^>]*>([\s\S]*?)<\/font>/gi, '$1');

  // Collapse excess empty paragraphs and excessive <br> runs
  cleaned = cleaned.replace(/(?:<p[^>]*>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>\s*){2,}/gi, '<p>&nbsp;</p>');
  cleaned = cleaned.replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br/><br/>');
  cleaned = cleaned.replace(/^(?:<p[^>]*>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>\s*)+/gi, '');
  cleaned = cleaned.replace(/(?:\s*<p[^>]*>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>)+$/gi, '');

  return cleaned.trim();
};

/**
 * Prepares database content for display in Word document layout.
 * Handles structured HTML, mixed table + newline text, stray wrapper tags,
 * website scrape markup, and plain text with consistent paragraphs.
 */
export const formatWordDocumentDisplay = (rawContent) => {
  if (!rawContent || typeof rawContent !== 'string') return '';

  const trimmed = rawContent.trim();
  if (!trimmed) return '';

  const prepared = stripDangerousAndBoilerplateMarkup(trimmed);
  if (!prepared.trim()) return '';

  const hasParagraphOrListHtml = /<(?:p|br|h[1-6]|ul|ol|li|blockquote)\b/i.test(prepared);
  const hasTableHtml = /<table\b/i.test(prepared);

  if (hasParagraphOrListHtml) {
    let clean = cleanWordPasteHtml(prepared);
    // Remove bare newlines immediately adjacent to HTML tags to prevent double spacing
    clean = clean.replace(/>\s*\n+\s*</g, '><');
    // Unwrap pure <div> wrappers that hold inner <p>/<table> blocks cleanly
    clean = clean.replace(/(?:<div\s*>)+/gi, '').replace(/(?:<\/div>)+/gi, '');
    clean = clean.replace(/(?:<p[^>]*>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>\s*){2,}/gi, '<p>&nbsp;</p>');
    return clean.trim();
  }

  // Case where content has HTML <table> blocks combined with plain-text paragraphs
  if (hasTableHtml) {
    const parts = prepared.split(/(<table\b[\s\S]*?<\/table>)/gi);
    return parts
      .map((part) => {
        if (!part) return '';
        if (/^<table\b/i.test(part.trim())) {
          return cleanWordPasteHtml(part).replace(/>\s*\n+\s*</g, '><');
        }
        return plainTextToParagraphHtml(part);
      })
      .filter(Boolean)
      .join('');
  }

  // Plain text or text with only stray <div>/<span>/<hr>/<strong> wrapper tags and \n\n paragraphs
  return plainTextToParagraphHtml(prepared);
};

export default {
  fixMojibake,
  cleanWordPasteHtml,
  formatWordDocumentDisplay,
};
