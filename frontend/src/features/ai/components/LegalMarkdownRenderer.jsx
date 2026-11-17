import React, { useState } from 'react';
import { 
  Scale, FileText, Copy, Check, ChevronRight, 
  BookOpen, ShieldCheck, Gavel
} from 'lucide-react';
import { downloadOrViewAttachment, getResolvedBackendUrl } from '../../../utils/attachmentDownloader';

/**
 * Strips markdown asterisks, hashes, emojis, and stray punctuation from a title/heading
 */
const cleanHeadingText = (raw) => {
  if (!raw) return '';
  let s = raw.trim();
  // Strip emojis at start (e.g. ⚖️, 📜, 🏛️, 📋, 📌, 🛡️, etc.)
  s = s.replace(/^[\p{Extended_Pictographic}\p{Emoji}\u200d\uFE0F\s]+/u, '');
  // Strip all asterisks, hashes, underscores from everywhere in heading
  s = s.replace(/[*#_~`]+/g, ' ');
  // Strip trailing colons or dashes
  s = s.replace(/[:\-]+$/, '');
  return s.replace(/\s+/g, ' ').trim();
};

/**
 * Formats inline bold, italic, code, and links safely
 * Also cleans up ANY stray/unclosed asterisks so no raw ** ever appears
 */
const formatInlineText = (text) => {
  if (!text) return '';
  let html = text.trim();

  // Escape HTML entities to prevent injection
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Strip standalone or boundary ** (e.g. "**PETITIONER", "INDEX**")
  html = html.replace(/^\*\*+|\*\*+$/g, '');

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-slate-100">$1</strong>');
  
  // Italic (*text*)
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-600 dark:text-slate-400 font-serif">$1</em>');

  // Strip ANY leftover stray asterisks so the user NEVER sees raw * or **
  html = html.replace(/\*+/g, '');

  // Inline code / placeholders (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-mono font-semibold border border-amber-500/20">$1</code>');

  // Markdown links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    const rawUrl = String(url || '').trim();
    const resolvedUrl = (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) ? getResolvedBackendUrl(rawUrl) : rawUrl;
    return `<a href="${resolvedUrl}" target="_blank" rel="noopener noreferrer" class="text-amber-600 dark:text-amber-400 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer">${linkText} <span class="text-[10px]">↗</span></a>`;
  });

  // Autolink bare URLs (http:// or https://) not already enclosed in an anchor tag
  html = html.replace(/(^|[^"=])(https?:\/\/[^\s<>'"]+)/g, (match, prefix, rawUrl) => {
    return `${prefix}<a href="${rawUrl}" target="_blank" rel="noopener noreferrer" class="text-amber-600 dark:text-amber-400 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer">${rawUrl} <span class="text-[10px]">↗</span></a>`;
  });

  return html;
};

/**
 * Checks if a line is part of a markdown table
 */
const isTableLine = (line) => {
  if (!line) return false;
  const t = line.trim();
  return t.startsWith('|') && t.includes('|', 1) && t.split('|').length >= 3;
};

/**
 * Checks if a line is a table separator (e.g. | :---: | :--- | :---: |)
 */
const isTableSeparator = (line) => {
  if (!line) return false;
  const t = line.trim();
  return /^\|?\s*[-:]+[-| :]*\|?$/.test(t);
};

// Words that are party titles or advocate signatures — NEVER treat as section headings
const NON_HEADING_WORDS = /^(?:PETITIONER|PETITIONERS|APPLICANT|APPLICANTS|APPELLANT|APPELLANTS|RESPONDENT|RESPONDENTS|DEFENDANT|PLAINTIFF|DEPONENT|THROUGH|THROUGH\s+COUNSEL|THROUGH:|ADVOCATE|ADVOCATE\s+HIGH\s+COURT|ADVOCATE\s+SUPREME\s+COURT|ADVOCATES|IN\s+THE\s+MATTER\s+OF|IN\s+THE\s+MATTER\s+OF:)$/i;

/**
 * Determines whether a line represents a formal legal section heading
 */
const detectLegalHeading = (trimmed) => {
  const clean = cleanHeadingText(trimmed);

  // If it's a party or advocate, do NOT treat as a heading!
  if (NON_HEADING_WORDS.test(clean)) {
    return { isHeading: false };
  }

  // If line starts with markdown # heading
  if (/^#{1,6}\s+/.test(trimmed)) {
    const level = trimmed.startsWith('###') ? 3 : (trimmed.startsWith('##') ? 2 : 1);
    return { isHeading: true, text: clean, level };
  }

  // If line starts with an emoji (e.g. ⚖️ INDEX, 📜 AFFIDAVIT)
  if (/^[\p{Extended_Pictographic}\p{Emoji}\u200d\uFE0F]\s*/u.test(trimmed)) {
    if (clean.length > 0 && clean.length < 80) {
      return { isHeading: true, text: clean, level: 2 };
    }
  }

  // Known legal pleading sections in Pakistani Courts
  const legalSectionRegex = /^(?:INDEX|INDEX\s+OF\s+DOCUMENTS|LIST\s+OF\s+ANNEXURES|LIST\s+OF\s+ENCLOSURES|WRIT\s+PETITION|PETITION\s+UNDER\s+ARTICLE\s+199|PETITION\s+UNDER\s+SECTION\s+151|APPLICATION\s+FOR\s+STAY|C\.?M\.?\s+STAY|APPLICATION\s+FOR\s+EXEMPTION|C\.?M\.?\s+EXEMPTION|GROUNDS|GROUNDS\s+OF\s+APPEAL|GROUNDS\s+FOR\s+RELIEF|PRAYER|PRAYERS|RELIEF\s+CLAIMED|CERTIFICATE|AFFIDAVIT|VERIFICATION|VAKALAT\s*NAMA|POWER\s+OF\s+ATTORNEY|FORM\s*[“"']?B[”"']?|FORM\s+IT\s*-\s*16|FORM\s+OF\s+APPEAL|TAX\s+ASSESSED|TAX\s+ASSESSED\s+BREAKDOWN|STATEMENT\s+OF\s+FACTS|RELIEF\s+SOUGHT|BEFORE\s+THE\s+HON(?:'?BLE|\.)|BEFORE\s+THE\s+COMMISSIONER)\b/i;

  if (legalSectionRegex.test(clean) && clean.length < 90) {
    return { isHeading: true, text: clean, level: 2 };
  }

  return { isHeading: false };
};

/**
 * Checks if a line is a signature / counsel sign-off
 */
const isSignatureTrigger = (trimmed) => {
  const clean = cleanHeadingText(trimmed);
  return /^(?:PETITIONER|APPLICANT|APPELLANT|DEPONENT)(?:\s+Through)?$/i.test(clean) ||
         /^(?:Through|Through\s+Counsel|Through:)$/i.test(clean) ||
         /^(?:Advocate\s+High\s+Court|Advocate\s+Supreme\s+Court|Advocate|FCA|ITP)\b/i.test(clean);
};

/**
 * Splits raw legal response into clean, non-duplicated structured blocks
 */
const parseContentToBlocks = (rawText) => {
  if (!rawText) return [];

  // 1. Purge OCR scan headers/footers, date stamps, and pagination
  let cleanText = String(rawText)
    .replace(/\bPrinted\s+on\s+\d+\s+Page\s+\d+\s+of\s+\d+\b/gi, '')
    .replace(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}\s+[\d:]+\b/gi, '')
    .replace(/\b(?:RTO|LTO|MTO)\s+[A-Z\s]+,\s*TAX\s+HOUSE[^\r\n]*/gi, '')
    .replace(/\bBANK\s+ACCOUNT\s+NO\s+CREDIT\s+ENTRIES\b/gi, '')
    .replace(/\bPage\s+\d+\s+of\s+\d+\b/gi, '');

  // 2. Break embedded sub-items stuck in a single line (e.g. " (b) DG PDA (c) DG DHA" -> "\n\n(b) DG PDA\n\n(c) DG DHA")
  cleanText = cleanText.replace(/([^\n])\s+(\([a-z\d]+\))\s+/gi, '$1\n\n$2 ');

  // 3. Break embedded numbered points (e.g. " 1. In the wealth ... 2. In the wealth ...")
  cleanText = cleanText.replace(/([^\n])\s+(\b[1-9]\d?\.)\s+/g, '$1\n\n$2 ');

  // 4. Break embedded SUBJECT: or SHOW CAUSE lines into bold headings
  cleanText = cleanText.replace(/([^\n])\s+(SUBJECT:\s*[^\n.]+)\.?/gi, '$1\n\n**$2**\n\n');

  const lines = cleanText.split(/\r?\n/);
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 0. Fenced Code Block Detection (```lang ... ```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++;
      }
      blocks.push({
        type: 'code_block',
        language: lang || 'code',
        code: codeLines.join('\n')
      });
      continue;
    }

    // 1. Empty lines — Collapse multiple blank lines into a single minimal spacer
    if (!trimmed) {
      if (blocks.length > 0 && blocks[blocks.length - 1].type !== 'spacer') {
        blocks.push({ type: 'spacer' });
      }
      i++;
      continue;
    }

    // 2. Horizontal divider (---, ***, ___)
    if (trimmed === '---' || trimmed === '***' || trimmed === '___' || /^[-*_]{4,}$/.test(trimmed)) {
      if (blocks.length > 0 && blocks[blocks.length - 1].type !== 'divider') {
        blocks.push({ type: 'divider' });
      }
      i++;
      continue;
    }

    // 2.5 Cause Title Block: IN THE MATTER OF: ... VERSUS ...
    const isMatterTrigger = /^(?:IN\s+THE\s+MATTER\s+OF\s*:?|CAUSE\s+TITLE\s*:?)$/i.test(trimmed.replace(/[#*_]/g, '').trim());
    if (isMatterTrigger) {
      i++;
      const appellantLines = [];
      while (i < lines.length && !/^(?:VS\.?|VERSUS|V\/S)$/i.test(lines[i].replace(/[#*_]/g, '').trim())) {
        const cur = lines[i].trim();
        if (cur && !/^(?:---|\*\*\*|___)$/.test(cur)) {
          appellantLines.push(cur);
        }
        i++;
      }
      if (i < lines.length && /^(?:VS\.?|VERSUS|V\/S)$/i.test(lines[i].replace(/[#*_]/g, '').trim())) {
        i++; // skip VERSUS line
      }
      const respondentLines = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (!cur) { i++; continue; }
        if (/^(?:---|\*\*\*|___)$/.test(cur) || /^#{1,6}\s+/.test(cur) || detectLegalHeading(cur).isHeading) {
          break;
        }
        respondentLines.push(cur);
        i++;
      }
      blocks.push({
        type: 'cause_title_card',
        appellant: appellantLines,
        respondent: respondentLines
      });
      continue;
    }

    // 3. Consolidated Signature / Counsel Block:
    // Groups PETITIONER / APPLICANT + Through Counsel + Underline + Advocate High Court together
    if (isSignatureTrigger(trimmed)) {
      let party = '';
      let through = 'Through Counsel:';
      let counsel = '';

      while (i < lines.length) {
        const cur = lines[i].trim();
        const cleanCur = cleanHeadingText(cur);

        if (!cur) {
          i++;
          continue;
        }

        if (/^(?:PETITIONER|APPLICANT|APPELLANT|DEPONENT)\b/i.test(cleanCur)) {
          party = cleanCur;
          i++;
          continue;
        }

        if (/^(?:Through|Through\s+Counsel|Through:)\b/i.test(cleanCur)) {
          through = cleanCur.endsWith(':') ? cleanCur : `${cleanCur}:`;
          i++;
          continue;
        }

        if (/^_{3,}$/.test(cur) || /^-{3,}$/.test(cur)) {
          // Skip raw underscore lines inside signature block to prevent duplicate lines
          i++;
          continue;
        }

        if (/^(?:Advocate|Advocate\s+High\s+Court|Advocate\s+Supreme\s+Court|Advocates|FCA|ITP)\b/i.test(cleanCur)) {
          counsel = cleanCur;
          i++;
          continue;
        }

        break;
      }

      blocks.push({
        type: 'signature_block',
        party: party || 'PETITIONER',
        through,
        counsel: counsel || 'Advocate High Court / Supreme Court'
      });
      continue;
    }

    // 4. Standalone underscore lines (e.g. "___________________")
    if (/^_{3,}$/.test(trimmed) || /^-{3,}$/.test(trimmed)) {
      // Skip if following a signature or table to prevent extra lines
      if (blocks.length > 0 && (blocks[blocks.length - 1].type === 'signature_block' || blocks[blocks.length - 1].type === 'divider')) {
        i++;
        continue;
      }
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }

    // 5. Markdown Pipe Table Detection
    if (isTableLine(trimmed)) {
      const tableLines = [];
      while (i < lines.length && isTableLine(lines[i].trim())) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const rawHeaderParts = tableLines[0].split('|').map(c => c.trim());
        if (rawHeaderParts[0] === '') rawHeaderParts.shift();
        if (rawHeaderParts.length > 0 && rawHeaderParts[rawHeaderParts.length - 1] === '') rawHeaderParts.pop();

        const headers = rawHeaderParts.map(c => cleanHeadingText(c));

        let dataStartIndex = 1;
        if (tableLines.length > 1 && isTableSeparator(tableLines[1])) {
          dataStartIndex = 2;
        }

        const rows = [];
        for (let r = dataStartIndex; r < tableLines.length; r++) {
          const rawRowParts = tableLines[r].split('|').map(c => c.trim());
          if (rawRowParts[0] === '') rawRowParts.shift();
          if (rawRowParts.length > 0 && rawRowParts[rawRowParts.length - 1] === '') rawRowParts.pop();

          if (rawRowParts.some(c => c.length > 0)) {
            rows.push(rawRowParts);
          }
        }

        blocks.push({
          type: 'table',
          headers,
          rows
        });
        continue;
      }
    }

    // 6. Legal Headings Detection
    const headingCheck = detectLegalHeading(trimmed);
    if (headingCheck.isHeading) {
      blocks.push({
        type: 'heading',
        level: headingCheck.level,
        text: headingCheck.text
      });
      i++;
      continue;
    }

    // 7. Versus Divider (e.g. "VS.", "VERSUS", "V/S")
    if (/^(?:VS\.?|VERSUS|V\/S)$/i.test(trimmed.replace(/[*_]/g, '').trim())) {
      blocks.push({ type: 'versus_divider' });
      i++;
      continue;
    }

    // 8. Party Indicator (e.g. "(PETITIONER)", "(RESPONDENTS)")
    if (/^\(?\s*(?:PETITIONER|RESPONDENTS?|APPELLANT)\s*\)?$/i.test(trimmed.replace(/[*_]/g, '').trim())) {
      blocks.push({
        type: 'party_badge',
        text: trimmed.replace(/[()*_]/g, '').trim()
      });
      i++;
      continue;
    }

    // 9. Blockquote or Precedent Quote (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push({
        type: 'precedent_quote',
        text: quoteLines.join(' ')
      });
      continue;
    }

    // 10. Quoted Precedents (e.g. lines wrapped in quotes referencing case law)
    if (/^[“"'].*?(?:PTD|SCMR|PLD|CLC|MLD|YLR|CLD|PCrLJ|WP).*?[”"']$/i.test(trimmed)) {
      blocks.push({
        type: 'precedent_quote',
        text: trimmed.replace(/^[“"']|[”"']$/g, '')
      });
      i++;
      continue;
    }

    // 11. Numbered Legal Paragraph or Ground (e.g. "1. That the addresses...", "(a) That...")
    const numMatch = trimmed.match(/^(\d+\.|\([a-z0-9]+\)|[a-z]\)|[IVXLCDM]+\.)\s+(.*)$/i);
    if (numMatch) {
      blocks.push({
        type: 'legal_item',
        prefix: numMatch[1],
        content: numMatch[2]
      });
      i++;
      continue;
    }

    // 11B. Unordered Bullet List Item (•, -, *)
    const bulletMatch = trimmed.match(/^[•\-\*]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        type: 'bullet_item',
        content: bulletMatch[1]
      });
      i++;
      continue;
    }

    // 12. Standard Paragraph
    blocks.push({
      type: 'paragraph',
      text: trimmed
    });
    i++;
  }

  return blocks;
};

const LegalMarkdownRenderer = ({ text, onCopy }) => {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!text) return null;

  const handleCopySection = (str, key) => {
    // Strip markdown code fences and unneeded asterisks for clean clipboard text
    let cleanStr = str.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
    cleanStr = cleanStr.replace(/\*\*+/g, '');
    navigator.clipboard.writeText(cleanStr);
    setCopiedKey(key);
    onCopy?.(cleanStr, key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Detect whether this response contains an authoritative drafted legal document/pleading
  const isPleading = /(?:PETITION\s*UNDER\s*ARTICLE\s*199|MEMO\s*OF\s*APPEAL|FORM\s*[“"']?B[”"']?\s*\[RULE\s*7\]|FORM\s*OF\s*APPEAL\s*IT\s*-\s*16|VAKALAT\s*NAMA|BEFORE\s*THE\s*APPELLATE\s*TRIBUNAL\s*INLAND\s*REVENUE|GROUNDS\s*OF\s*APPEAL\s*:|PRAYER\s*CLAUSE\s*:|IN\s*THE\s*HON'?BLE\s*HIGH\s*COURT\s*OF[\s\S]{1,100}WRIT\s*PETITION\s*NO)/i.test(text);

  // Clean raw text: strip unneeded triple asterisks or stray trailing **
  const cleanedSourceText = text
    .replace(/\*{3,}/g, '')
    .replace(/^(\s*)\*\*([^*]+)$/gm, '$1$2');

  const blocks = parseContentToBlocks(cleanedSourceText);

  const handleContainerClick = (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;

    // Intercept document views, court downloads, PDFs, and API preview endpoints
    if (
      href.includes('/api/other-cases/view-document') ||
      href.includes('/other-cases/view-document') ||
      href.includes('/uploads/') ||
      href.endsWith('.pdf') ||
      href.includes('supremecourt.gov.pk') ||
      href.includes('lhc.gov.pk') ||
      href.includes('caselaw.shc.gov.pk')
    ) {
      e.preventDefault();
      const title = link.textContent.replace('↗', '').trim();
      let targetHref = href;
      if (
        href.includes('supremecourt.gov.pk') ||
        href.includes('lhc.gov.pk') ||
        href.includes('caselaw.shc.gov.pk')
      ) {
        const proxyBase = getResolvedBackendUrl('/api/other-cases/view-document');
        targetHref = `${proxyBase}?url=${encodeURIComponent(href)}`;
      } else if (targetHref.startsWith('/') && !targetHref.startsWith('//')) {
        targetHref = getResolvedBackendUrl(targetHref);
      }
      downloadOrViewAttachment(targetHref, { title, name: title, download: false });
    }
  };

  return (
    <div className="space-y-3.5" onClick={handleContainerClick}>
      {/* Top Banner: Statutory Legal Pleading with ONLY "Copy Pleading" Button */}
      {isPleading && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider block leading-tight font-serif">
                Statutory Legal Pleading Document
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                Verified Pakistani Court & Tribunal Format • Registry Compliant
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCopySection(cleanedSourceText, 'full_doc')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
            title="Copy clean pleading to clipboard"
          >
            {copiedKey === 'full_doc' ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Pleading</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Styled Judicial Court Paper Sheet */}
      <div className={`p-5 sm:p-8 space-y-4 font-serif text-[15px] sm:text-[16px] leading-loose text-slate-900 dark:text-slate-100 ${
        isPleading 
          ? 'border border-amber-900/15 dark:border-amber-500/25 rounded-2xl bg-[#fffefb] dark:bg-[#11131a] shadow-xs' 
          : ''
      }`}>
        {renderParsedBlocks(blocks, 0, handleCopySection, copiedKey)}
      </div>
    </div>
  );
};

/**
 * Renders each parsed block cleanly with NO extra lines, NO dashed boxes, and NO stray asterisks
 */
function renderParsedBlocks(blocks, parentIdx, handleCopySection, copiedKey) {
  return blocks.map((block, idx) => {
    const key = `${parentIdx}_${idx}`;

    switch (block.type) {
      case 'spacer':
        return <div key={key} className="h-1.5" />;

      case 'divider':
        return (
          <div key={key} className="my-4 border-t border-slate-200 dark:border-slate-800" />
        );

      case 'cause_title_card':
        return (
          <div key={key} className="my-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-amber-500/[0.04] via-transparent to-amber-500/[0.02] border border-amber-900/15 dark:border-amber-500/25 shadow-xs font-serif">
            <div className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 font-sans mb-3 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              <span>In the Matter Of:</span>
            </div>
            
            {/* Appellant Details */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pb-3.5 border-b border-dashed border-slate-300 dark:border-slate-800">
              <div className="space-y-1">
                {block.appellant.map((line, lIdx) => {
                  const cleanLine = line.replace(/^\*+|\*+$/g, '').trim();
                  const isPartyTag = /^\(?\s*Appellant\s*\)?$/i.test(cleanLine);
                  if (isPartyTag) return null;
                  const isName = lIdx === 0;
                  return (
                    <div
                      key={lIdx}
                      className={isName 
                        ? "text-base sm:text-lg font-bold text-slate-900 dark:text-white" 
                        : "text-xs sm:text-sm text-slate-600 dark:text-slate-400"}
                      dangerouslySetInnerHTML={{ __html: formatInlineText(line) }}
                    />
                  );
                })}
              </div>
              <span className="self-start sm:self-center px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-black uppercase tracking-wider font-sans border border-amber-500/30">
                Appellant
              </span>
            </div>

            {/* Versus Divider */}
            <div className="flex items-center justify-center gap-3 my-3">
              <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1 max-w-[100px]" />
              <span className="text-xs font-black tracking-widest text-amber-700 dark:text-amber-400 font-mono uppercase px-2">
                VERSUS
              </span>
              <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1 max-w-[100px]" />
            </div>

            {/* Respondent Details */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pt-1">
              <div className="space-y-1">
                {block.respondent.map((line, lIdx) => {
                  const cleanLine = line.replace(/^\*+|\*+$/g, '').trim();
                  const isPartyTag = /^\(?\s*Respondent\s*\)?$/i.test(cleanLine);
                  if (isPartyTag) return null;
                  const isName = lIdx === 0;
                  return (
                    <div
                      key={lIdx}
                      className={isName 
                        ? "text-base sm:text-lg font-bold text-slate-900 dark:text-white" 
                        : "text-xs sm:text-sm text-slate-600 dark:text-slate-400"}
                      dangerouslySetInnerHTML={{ __html: formatInlineText(line) }}
                    />
                  );
                })}
              </div>
              <span className="self-start sm:self-center px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider font-sans border border-slate-300 dark:border-slate-700">
                Respondent
              </span>
            </div>
          </div>
        );

      case 'heading': {
        const isCourtHeading = /^(?:HIGH\s+COURT|BEFORE\s+THE|APPELLATE\s+TRIBUNAL)\b/i.test(block.text);
        const isPleadingTitle = /^(?:MEMORANDUM\s+OF\s+APPEAL|WRIT\s+PETITION|FORM\s+OF\s+APPEAL|STATUTORY\s+LEGAL\s+NOTICE)\b/i.test(block.text);
        const isMissingDocs = /Missing Details/i.test(block.text);
        
        if (isCourtHeading) {
          return (
            <div key={key} className="my-5 text-center pb-2.5 border-b-2 border-amber-500/40">
              <h2 className="text-base sm:text-xl font-black text-amber-700 dark:text-amber-400 tracking-wider uppercase font-serif">
                {block.text}
              </h2>
            </div>
          );
        }

        if (isPleadingTitle) {
          return (
            <div key={key} className="my-5 p-3.5 rounded-xl bg-amber-500/[0.08] dark:bg-amber-500/[0.12] border border-amber-500/30 text-center">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-wide uppercase font-serif">
                {block.text}
              </h3>
            </div>
          );
        }

        if (isMissingDocs) {
          return (
            <div key={key} className="pt-5 pb-2.5 mt-6 border-b-2 border-amber-500/40">
              <h3 className="text-sm sm:text-base font-black text-amber-700 dark:text-amber-400 flex items-center gap-2 tracking-wide uppercase font-sans">
                <span className="w-2 h-4 rounded-full bg-amber-500 inline-block" />
                <span>{block.text}</span>
              </h3>
            </div>
          );
        }

        return (
          <div key={key} className="pt-4 pb-2 mt-4 border-b border-amber-500/20">
            <h3 className="text-sm sm:text-base font-black text-amber-700 dark:text-amber-400 flex items-center gap-2 tracking-wide uppercase font-sans">
              <span className="w-1.5 h-3.5 rounded-full bg-amber-500 inline-block" />
              <span>{block.text}</span>
            </h3>
          </div>
        );
      }

      case 'versus_divider':
        return (
          <div key={key} className="my-2 text-center versus-print-hide print:!hidden" data-print-hide="true">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black tracking-widest text-amber-600 dark:text-amber-400 font-mono versus-print-hide print:!hidden">
              <span>—</span>
              <span>VERSUS</span>
              <span>—</span>
            </div>
          </div>
        );

      case 'party_badge':
        return (
          <div key={key} className="my-1">
            <span className="inline-block px-2.5 py-0.5 rounded bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs uppercase tracking-wider font-sans border border-amber-500/20">
              ({block.text})
            </span>
          </div>
        );

      case 'signature_block':
        return (
          <div key={key} className="my-3 pt-2 flex flex-col items-end text-right font-sans">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {block.party}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {block.through}
            </div>
            <div className="w-52 border-b border-slate-400 dark:border-slate-600 my-1.5" />
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {block.counsel}
            </div>
          </div>
        );

      case 'table':
        return (
          <div key={key} className="my-3 overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700/80 shadow-2xs bg-white dark:bg-[#141620]">
            <table className="w-full text-left border-collapse text-xs sm:text-sm font-sans">
              <thead className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-300 dark:border-slate-700">
                <tr>
                  {block.headers.map((h, hIdx) => {
                    const isSNo = /^(?:s\.?no|sr\.?#?|no\.?)$/i.test(h.trim());
                    const isAnnex = /^(?:annex(?:ure)?s?)$/i.test(h.trim());
                    const isPages = /^(?:pages?)$/i.test(h.trim());

                    return (
                      <th
                        key={hIdx}
                        className={`py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] sm:text-xs tracking-wider border-r border-slate-300/80 dark:border-slate-700 last:border-r-0 ${
                          isSNo || isAnnex || isPages ? 'text-center' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {block.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={`transition-colors ${
                      rIdx % 2 === 0
                        ? 'bg-transparent'
                        : 'bg-slate-50 dark:bg-white/[0.02]'
                    } hover:bg-amber-500/5 dark:hover:bg-slate-800/50`}
                  >
                    {row.map((cell, cIdx) => {
                      const header = block.headers[cIdx] || '';
                      const isSNo = /^(?:s\.?no|sr\.?#?|no\.?)$/i.test(header.trim());
                      const isAnnex = /^(?:annex(?:ure)?s?)$/i.test(header.trim());
                      const isPages = /^(?:pages?)$/i.test(header.trim());

                      const isAnnexLetter = /^[A-Z]$/.test(cell.replace(/[*_]/g, '').trim());

                      return (
                        <td
                          key={cIdx}
                          className={`py-2 px-3 text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 last:border-r-0 leading-relaxed ${
                            isSNo ? 'text-center font-bold text-slate-500 font-mono w-14' : 
                            isAnnex ? 'text-center font-bold w-20' : 
                            isPages ? 'text-center font-mono w-24' : 'text-left font-medium'
                          }`}
                        >
                          {isAnnex && isAnnexLetter ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-black border border-amber-500/30">
                              {cell.replace(/[*_]/g, '').trim()}
                            </span>
                          ) : (
                            <span dangerouslySetInnerHTML={{ __html: formatInlineText(cell) }} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'precedent_quote':
        return (
          <div key={key} className="my-4 p-4 bg-amber-500/[0.06] dark:bg-amber-500/[0.08] border-l-4 border-amber-500 rounded-r-xl text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-serif leading-relaxed shadow-2xs">
            <span className="font-bold uppercase tracking-wider text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5 not-italic mb-1.5 font-sans">
              <BookOpen className="w-3.5 h-3.5" />
              Judicial Ratio / Binding Precedent:
            </span>
            <blockquote className="italic leading-[1.75] pl-2">
              "{block.text}"
            </blockquote>
          </div>
        );

      case 'legal_item': {
        const boldTitleMatch = block.content.match(/^(\*\*.*?\*\*)\s*([\s\S]*)$/);
        const hasBoldTitle = !!boldTitleMatch;
        const titlePart = hasBoldTitle ? boldTitleMatch[1] : '';
        const bodyPart = hasBoldTitle ? boldTitleMatch[2] : block.content;

        return (
          <div key={key} className="my-3 sm:my-3.5 p-3.5 sm:p-4 rounded-xl bg-white/70 dark:bg-[#141724]/70 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-amber-500/30 transition-all">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-amber-500/15 dark:bg-amber-500/25 text-amber-800 dark:text-amber-300 font-bold text-xs sm:text-sm shrink-0 select-none font-mono border border-amber-500/30 shadow-2xs mt-0.5">
                {block.prefix}
              </span>
              <div className="flex-1 min-w-0">
                {hasBoldTitle ? (
                  <>
                    <div 
                      className="font-bold font-serif text-sm sm:text-base text-slate-900 dark:text-white leading-snug mb-1.5"
                      dangerouslySetInnerHTML={{ __html: formatInlineText(titlePart) }}
                    />
                    {bodyPart && (
                      <div 
                        className="text-xs sm:text-[14.5px] leading-relaxed sm:leading-[1.8] text-slate-700 dark:text-slate-300 font-serif"
                        dangerouslySetInnerHTML={{ __html: formatInlineText(bodyPart) }}
                      />
                    )}
                  </>
                ) : (
                  <div
                    className="text-xs sm:text-[14.5px] leading-relaxed sm:leading-[1.8] text-slate-800 dark:text-slate-200 font-serif"
                    dangerouslySetInnerHTML={{ __html: formatInlineText(block.content) }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      }

      case 'bullet_item':
        return (
          <div key={key} className="flex items-start gap-3 py-1.5 text-[14.5px] sm:text-[15.5px] leading-relaxed sm:leading-[1.85] pl-2 my-1 font-serif">
            <span className="w-2 h-2 rounded-full bg-amber-500 mt-2.5 shrink-0" />
            <div
              className="flex-1 text-slate-800 dark:text-slate-200"
              dangerouslySetInnerHTML={{ __html: formatInlineText(block.content) }}
            />
          </div>
        );

      case 'code_block': {
        const isCopied = copiedKey === `code_${key}`;
        return (
          <div key={key} className="my-3.5 rounded-xl border border-slate-700/80 bg-[#161b22] text-slate-100 overflow-hidden shadow-md font-mono text-xs sm:text-sm">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0d1117] border-b border-slate-700/60 text-slate-400 text-xs">
              <span className="font-semibold uppercase tracking-wider">{block.language || 'code'}</span>
              {handleCopySection && (
                <button
                  type="button"
                  onClick={() => handleCopySection(block.code, `code_${key}`)}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Copy code to clipboard"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy code</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed text-slate-200">
              <code>{block.code}</code>
            </pre>
          </div>
        );
      }

      case 'paragraph':
      default:
        return (
          <p
            key={key}
            className="text-[14.5px] sm:text-[15.5px] leading-loose sm:leading-[1.9] text-slate-800 dark:text-slate-200 mb-4 sm:mb-5 font-serif"
            dangerouslySetInnerHTML={{ __html: formatInlineText(block.text) }}
          />
        );
    }
  });
}

export default LegalMarkdownRenderer;
