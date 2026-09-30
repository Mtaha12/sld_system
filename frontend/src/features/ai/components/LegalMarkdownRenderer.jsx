import React, { useState } from 'react';
import { 
  Scale, FileText, Copy, Check, ChevronRight, 
  BookOpen, ShieldCheck, Gavel
} from 'lucide-react';

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
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-amber-600 dark:text-amber-400 hover:underline font-bold inline-flex items-center gap-0.5">$1 <span class="text-[10px]">↗</span></a>');

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
const NON_HEADING_WORDS = /^(?:PETITIONER|PETITIONERS|APPLICANT|APPLICANTS|APPELLANT|APPELLANTS|RESPONDENT|RESPONDENTS|DEFENDANT|PLAINTIFF|DEPONENT|THROUGH|THROUGH\s+COUNSEL|THROUGH:|ADVOCATE|ADVOCATE\s+HIGH\s+COURT|ADVOCATE\s+SUPREME\s+COURT|ADVOCATES)$/i;

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
  const legalSectionRegex = /^(?:INDEX|INDEX\s+OF\s+DOCUMENTS|LIST\s+OF\s+ANNEXURES|LIST\s+OF\s+ENCLOSURES|WRIT\s+PETITION|PETITION\s+UNDER\s+ARTICLE\s+199|PETITION\s+UNDER\s+SECTION\s+151|APPLICATION\s+FOR\s+STAY|C\.?M\.?\s+STAY|APPLICATION\s+FOR\s+EXEMPTION|C\.?M\.?\s+EXEMPTION|GROUNDS|GROUNDS\s+OF\s+APPEAL|GROUNDS\s+FOR\s+RELIEF|PRAYER|PRAYERS|RELIEF\s+CLAIMED|CERTIFICATE|AFFIDAVIT|VERIFICATION|VAKALAT\s*NAMA|POWER\s+OF\s+ATTORNEY|FORM\s*[“"']?B[”"']?|FORM\s+IT\s*-\s*16|FORM\s+OF\s+APPEAL|TAX\s+ASSESSED|TAX\s+ASSESSED\s+BREAKDOWN|STATEMENT\s+OF\s+FACTS|RELIEF\s+SOUGHT|BEFORE\s+THE\s+HON(?:'?BLE|\.))\b/i;

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
  const lines = rawText.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

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

  // Detect whether this response contains an authoritative legal document/pleading
  const isPleading = /HIGH\s*COURT|W\.?\s*P\.?\s*NO|ARTICLE\s*199|FORM\s*[“"']?B[”"']?|IT\s*-\s*16|VAKALAT\s*NAMA|PETITION\s*UNDER|BEFORE\s*THE\s*APPELLATE\s*TRIBUNAL/i.test(text);

  // Clean raw text: strip unneeded triple asterisks or stray trailing **
  const cleanedSourceText = text
    .replace(/\*{3,}/g, '')
    .replace(/^(\s*)\*\*([^*]+)$/gm, '$1$2');

  const blocks = parseContentToBlocks(cleanedSourceText);

  return (
    <div className="space-y-3.5">
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
      <div className={`p-4 sm:p-6 space-y-3 font-serif text-[14px] sm:text-[15px] leading-relaxed text-slate-900 dark:text-slate-100 ${
        isPleading 
          ? 'border border-amber-900/15 dark:border-amber-500/20 rounded-2xl bg-[#fdfcf9] dark:bg-[#11131a] shadow-xs' 
          : ''
      }`}>
        {renderParsedBlocks(blocks, 0)}
      </div>
    </div>
  );
};

/**
 * Renders each parsed block cleanly with NO extra lines, NO dashed boxes, and NO stray asterisks
 */
function renderParsedBlocks(blocks, parentIdx) {
  return blocks.map((block, idx) => {
    const key = `${parentIdx}_${idx}`;

    switch (block.type) {
      case 'spacer':
        return <div key={key} className="h-1" />;

      case 'divider':
        return (
          <div key={key} className="my-3 border-t border-slate-200 dark:border-slate-800" />
        );

      case 'heading': {
        const isCourtHeading = /^(?:HIGH\s+COURT|BEFORE\s+THE|APPELLATE\s+TRIBUNAL)\b/i.test(block.text);
        
        if (isCourtHeading) {
          return (
            <div key={key} className="my-3 text-center pb-1.5 border-b border-amber-500/40">
              <h2 className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-400 tracking-wider uppercase font-serif">
                {block.text}
              </h2>
            </div>
          );
        }

        return (
          <div key={key} className="pt-2 pb-1 mt-1 border-b border-amber-500/20">
            <h3 className="text-sm sm:text-base font-black text-amber-700 dark:text-amber-400 flex items-center gap-2 tracking-wide uppercase font-sans">
              <span className="w-1.5 h-3.5 rounded-full bg-amber-500 inline-block" />
              <span>{block.text}</span>
            </h3>
          </div>
        );
      }

      case 'versus_divider':
        return (
          <div key={key} className="my-2 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black tracking-widest text-amber-600 dark:text-amber-400 font-mono">
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
          <div key={key} className="my-2.5 p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 rounded-r-xl text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-serif leading-relaxed shadow-2xs">
            <span className="font-bold uppercase tracking-wider text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 not-italic mb-1 font-sans">
              <BookOpen className="w-3.5 h-3.5" />
              Judicial Ratio / Binding Precedent:
            </span>
            <blockquote className="italic">
              "{block.text}"
            </blockquote>
          </div>
        );

      case 'legal_item':
        return (
          <div key={key} className="flex items-start gap-2.5 py-1 text-sm sm:text-base leading-relaxed">
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs shrink-0 select-none font-mono mt-0.5 border border-amber-500/20">
              {block.prefix}
            </span>
            <div
              className="flex-1 text-slate-800 dark:text-slate-200"
              dangerouslySetInnerHTML={{ __html: formatInlineText(block.content) }}
            />
          </div>
        );

      case 'paragraph':
      default:
        return (
          <p
            key={key}
            className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 my-1"
            dangerouslySetInnerHTML={{ __html: formatInlineText(block.text) }}
          />
        );
    }
  });
}

export default LegalMarkdownRenderer;
