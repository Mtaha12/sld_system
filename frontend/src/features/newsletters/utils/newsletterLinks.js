import { downloadOrViewAttachment } from '../../../utils/attachmentDownloader';

/**
 * Formats ISO date strings ("2026-11-11") cleanly to DD/MM/YYYY ("11/11/2026") for Digest lists.
 */
export const formatNewsletterDate = (dateStr) => {
  if (!dateStr) return '—';
  const clean = String(dateStr).trim().split('T')[0];
  const ymd = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    return `${ymd[3].padStart(2, '0')}/${ymd[2].padStart(2, '0')}/${ymd[1]}`;
  }
  return clean;
};

/**
 * Returns a clean practice-area topic badge for color-coding client Email Digest rows.
 */
export const detectTopicBadge = (heading = '') => {
  const h = String(heading).toUpperCase();
  if (h.includes('INCOME TAX')) return { label: 'Income Tax', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' };
  if (h.includes('SALES TAX')) return { label: 'Sales Tax', cls: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' };
  if (h.includes('CUSTOM')) return { label: 'Customs', cls: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800' };
  if (h.includes('FEDERAL EXCISE') || h.includes('EXCISE')) return { label: 'Federal Excise', cls: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800' };
  if (h.includes('BANKING')) return { label: 'Banking', cls: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800' };
  if (h.includes('CORPORATE')) return { label: 'Corporate', cls: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800' };
  if (h.includes('CRIMINAL')) return { label: 'Criminal', cls: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' };
  if (h.includes('CIVIL')) return { label: 'Civil', cls: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' };
  if (h.includes('LABOUR')) return { label: 'Labour', cls: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800' };
  if (h.includes('NEWS')) return { label: 'News Updates', cls: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800' };
  return { label: 'Legal Update', cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
};

/**
 * Extracts normalized structured link items from any newsletter item (client fallback if needed).
 */
export const getNewsletterLinkRows = (newsletter) => {
  if (!newsletter) return [];
  if (Array.isArray(newsletter.linkItems) && newsletter.linkItems.length > 0) {
    return newsletter.linkItems
      .filter((li) => li && (li.heading || li.link))
      .map((li) => ({
        heading: String(li.heading || li.attachmentName || 'Document Link').trim(),
        link: String(li.link || li.url || '').trim(),
        attachmentName: String(li.attachmentName || li.name || '').trim(),
        size: Number(li.size) || 0,
        type: String(li.type || '').trim()
      }));
  }

  const rows = [];
  const seen = new Set();

  if (typeof newsletter.message === 'string' && newsletter.message) {
    const rx = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = rx.exec(newsletter.message)) !== null) {
      const link = String(m[1] || '').trim();
      const heading = String(m[2] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!link || /^(mailto:|tel:|javascript:|#)/i.test(link)) continue;
      const key = `${heading.toLowerCase()}|${link.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        heading: heading || link.split('/').pop() || 'Document Link',
        link,
        attachmentName: link.split('/').pop()?.split('?')[0] || '',
        size: 0,
        type: ''
      });
    }
  }

  const atts = Array.isArray(newsletter.attachments) ? newsletter.attachments : [];
  for (const att of atts) {
    const url = String(att?.url || '').trim();
    if (!url || rows.some((r) => r.link.toLowerCase() === url.toLowerCase())) continue;
    const rawName = String(att?.name || url.split('/').pop() || 'Attachment').trim();
    rows.push({
      heading: rawName.replace(/\.[^.]+$/, '') || rawName,
      link: url,
      attachmentName: rawName,
      size: Number(att?.size) || 0,
      type: String(att?.type || '').trim()
    });
  }

  return rows;
};

/**
 * Safely validates and opens a newsletter link or attachment inline in a new browser tab.
 */
export const openNewsletterLink = (url, heading = '', { download = false } = {}) => {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl || /^(javascript:|data:text\/html)/i.test(cleanUrl)) return;
  downloadOrViewAttachment(cleanUrl, {
    name: heading || cleanUrl.split('/').pop() || 'Document',
    title: heading || 'Email Digest Attachment',
    download
  });
};

