/**
 * Shared Legal Text & HTML Sanitization Utilities
 * Cleanly removes website HTML boilerplate, scripts, inline styling noise,
 * and UTF-8/Windows-1252 mojibake without losing legal content or table layout.
 */

const HTML_TAG_PATTERN =
  /<\/?(?:(?:a|abbr|address|article|aside|audio|b|base|bdi|bdo|blockquote|body|br|button|canvas|caption|center|cite|code|col|colgroup|data|datalist|dd|del|details|dfn|dialog|div|dl|dt|em|embed|fieldset|figcaption|figure|font|footer|form|h[1-6]|head|header|hgroup|hr|html|i|iframe|img|input|ins|kbd|label|legend|li|link|main|map|mark|menu|meta|meter|nav|noscript|object|ol|optgroup|option|output|p|param|picture|pre|progress|q|rp|rt|ruby|s|samp|script|section|select|small|source|span|strike|strong|style|sub|summary|sup|svg|table|tbody|td|template|textarea|tfoot|th|thead|time|title|tr|track|tt|u|ul|var|video|wbr|xml|!DOCTYPE|o:[a-z0-9_-]+|w:[a-z0-9_-]+|m:[a-z0-9_-]+|v:[a-z0-9_-]+)\b|(?:https?|mailto|ftp):)[^>]*>?/gi;

const ENTITY_MAP = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#039;': "'",
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&rdquo;': '”',
  '&ldquo;': '“',
  '&ndash;': '–',
  '&mdash;': '—',
  '&bull;': '•',
  '&hellip;': '…',
  '&sect;': '§',
  '&copy;': '©',
  '&reg;': '®',
  '&lt;': '<',
  '&gt;': '>'
};

export const fixMojibake = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/\u00e2\u20ac\u201c/g, '–')
    .replace(/\u00e2\u20ac\u201d/g, '—')
    .replace(/\u00e2\u20ac\u02dc/g, '‘')
    .replace(/\u00e2\u20ac\u2122/g, '’')
    .replace(/\u00e2\u20ac\u0153/g, '“')
    .replace(/\u00e2\u20ac\u009d/g, '”')
    .replace(/\u00e2\u20ac\u00a2/g, '•')
    .replace(/\u00e2\u20ac\u00a6/g, '…')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€˜/g, '‘')
    .replace(/â€™/g, '’')
    .replace(/â€œ/g, '“')
    .replace(/â€/g, '”')
    .replace(/â€¢/g, '•')
    .replace(/â€¦/g, '…')
    .replace(/Â\u00a0/g, ' ')
    .replace(/\u00c2\s/g, ' ')
    .replace(/\u00a0/g, ' ');
};

export const decodeEntities = (str) => {
  if (!str || typeof str !== 'string') return '';
  let out = str.replace(
    /&(?:nbsp|amp|quot|apos|#0?39|rsquo|lsquo|rdquo|ldquo|ndash|mdash|bull|hellip|sect|copy|reg|lt|gt);/gi,
    (m) => ENTITY_MAP[m.toLowerCase()] ?? m
  );
  out = out.replace(/&#(\d+);/g, (_, dec) => {
    const code = parseInt(dec, 10);
    return Number.isFinite(code) ? String.fromCharCode(code) : _;
  });
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const code = parseInt(hex, 16);
    return Number.isFinite(code) ? String.fromCharCode(code) : _;
  });
  return out;
};

/**
 * Strips all HTML, script, style, XML, and website layout markup from a judgment string,
 * preserving paragraph spacing and readable table alignment without leaving any HTML tags.
 */
export const cleanLegalPlainText = (raw) => {
  if (!raw || typeof raw !== 'string') return '';

  let text = raw;

  // 1. Strip script, style, noscript, svg, iframe, xml blocks completely (closed or truncated)
  text = text.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
  text = text.replace(/<script\b[\s\S]*?(?:<\/script>|$)/gi, '');
  text = text.replace(/<style\b[\s\S]*?(?:<\/style>|$)/gi, '');
  text = text.replace(/<noscript\b[\s\S]*?(?:<\/noscript>|$)/gi, '');
  text = text.replace(/<svg\b[\s\S]*?(?:<\/svg>|$)/gi, '');
  text = text.replace(/<iframe\b[\s\S]*?(?:<\/iframe>|$)/gi, '');
  text = text.replace(/<xml\b[\s\S]*?(?:<\/xml>|$)/gi, '');
  text = text.replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, '');

  // 2. Clean HTML tables into readable pipe-delimited rows before stripping tags
  text = text.replace(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi, (_, inner) => {
    const cleanCell = inner
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/?(?:div|p|span|strong|b|i|u|em|font)\b[^>]*>/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleanCell ? `${cleanCell} | ` : '';
  });
  text = text.replace(/\s*\|\s*<\/tr>/gi, '\n');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/?(?:table|tbody|thead|tfoot)\b[^>]*>/gi, '\n');

  // 3. Convert structural block/line tags into clean newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\b[^>]*>/gi, '\n');
  text = text.replace(/<li\b[^>]*>/gi, '\n• ');
  text = text.replace(/<\/(?:p|div|h[1-6]|blockquote|section|article|header|footer|ul|ol|li)>/gi, '\n\n');

  // 4. Remove all remaining HTML / website tags (including malformed attributes)
  text = text.replace(HTML_TAG_PATTERN, '');

  // 5. Remove leading SLD scraper header if any remained from raw HTML file dumps
  text = text.replace(/^\s*SLD\s*#:\s*\d+\s*/i, '');

  // 6. Decode HTML entities and fix UTF-8 / Win-1252 mojibake
  text = decodeEntities(text);
  text = fixMojibake(text);

  // 7. Normalize spacing & line breaks cleanly
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\|\s*\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
};

/**
 * Cleans website copy-paste HTML bloat and inline CSS noise from rich HTML records
 * (e.g., news articles) while preserving valid structural tags (<p>, <table>, lists, <strong>).
 */
export const cleanWebsiteHtmlBloat = (html) => {
  if (!html || typeof html !== 'string') return '';

  let cleaned = fixMojibake(html);

  cleaned = cleaned.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
  cleaned = cleaned.replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, '');
  cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, '');
  cleaned = cleaned.replace(/<xml\b[\s\S]*?(?:<\/xml>|$)/gi, '');
  cleaned = cleaned.replace(/<script\b[\s\S]*?(?:<\/script>|$)/gi, '');
  cleaned = cleaned.replace(/<style\b[\s\S]*?(?:<\/style>|$)/gi, '');
  cleaned = cleaned.replace(/<noscript\b[\s\S]*?(?:<\/noscript>|$)/gi, '');
  cleaned = cleaned.replace(/<svg\b[\s\S]*?(?:<\/svg>|$)/gi, '');
  cleaned = cleaned.replace(/<iframe\b[\s\S]*?(?:<\/iframe>|$)/gi, '');
  cleaned = cleaned.replace(/<head\b[\s\S]*?(?:<\/head>|$)/gi, '');
  cleaned = cleaned.replace(/<\/?(?:o:[a-z0-9_-]+|w:[a-z0-9_-]+|m:[a-z0-9_-]+|v:[a-z0-9_-]+|html|body|meta|link|title)\b[^>]*>/gi, '');
  cleaned = cleaned.replace(/<(p|div|span|li|h[1-6]|td|th|strong|em|b|i|u)(?=(?:Times|Open Sans|Helvetica|Arial|font-|Courier|Verdana|Tahoma|Georgia|Calibri|Cambria))[^>]*>/gi, '<$1>');
  cleaned = cleaned.replace(/<(?:p|div|span|a|img|table|tbody|tr|td|th|ul|ol|li|h[1-6]|strong|em|b|i|u|font|hr|br|section|article)\b[^>]*$/gi, '');

  const sanitizeStyle = (styleBody, tag) => {
    const cleaned = (styleBody || '')
      .replace(/!important/gi, '')
      .replace(/font-family\s*:[^;>]+;?/gi, ';')
      .replace(/(?:"Open Sans"|"Helvetica Neue")[^;>]*;?/gi, ';');

    const isTableTag = /^(?:table|thead|tbody|tfoot|tr|td|th|col|colgroup)$/i.test(tag || '');
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
          return /^(?:text-align|font-weight|font-style|text-decoration|border(?:-collapse|-spacing|-top|-bottom|-left|-right)?|width)$/.test(p);
        }
        return /^(?:text-align|font-weight|font-style|text-decoration)$/.test(p);
      });

    return kept.length > 0 ? ` style="${kept.join('; ')}"` : '';
  };

  // Strip broken scraper attributes, nested-quote font-family rules, and noisy inline CSS per element
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
        .replace(/\sstyle\s*=\s*"([^"]*)"?/gi, (__, body) => sanitizeStyle(body, tag))
        .replace(/\sstyle\s*=\s*'([^']*)'?/gi, (__, body) => sanitizeStyle(body, tag));
      a = a.replace(/\s+$/, '');
      return `<${tag}${a}>`;
    }
  );

  for (let i = 0; i < 3; i += 1) {
    cleaned = cleaned.replace(/<span\s*>([\s\S]*?)<\/span>/gi, '$1');
  }
  cleaned = cleaned.replace(/<font\b[^>]*>([\s\S]*?)<\/font>/gi, '$1');

  return cleaned.trim();
};
