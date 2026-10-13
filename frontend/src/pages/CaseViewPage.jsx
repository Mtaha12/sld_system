import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { caseService } from '../features/cases/services/caseService';
import Spinner from '../components/ui/Spinner';
import { 
  ArrowLeft, Printer, Scale, Copy, Check, 
  FileText, Calendar, Gavel, Award
} from 'lucide-react';

/**
 * Robust Cause Title parser for Commonwealth / Pakistani law reports
 * Splits Petitioner and Respondent across "VS", "VERSUS", or "v."
 */
const parseCauseTitle = (petitioners) => {
  if (!petitioners || (Array.isArray(petitioners) && petitioners.length === 0)) {
    return { petitioner: '', respondent: '', isSplit: false, raw: '' };
  }

  const raw = Array.isArray(petitioners) ? petitioners.join('\n') : String(petitioners).trim();
  const versusRegex = /\s*(?:\r?\n)?\s*(?:[-—–\s]*(?:VS|vs|v\.|V\.|VERSUS|Versus)[-—–\s]*)\s*(?:\r?\n)?\s*/;
  
  if (versusRegex.test(raw)) {
    const parts = raw.split(versusRegex);
    if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
      return {
        petitioner: parts[0].trim(),
        respondent: parts.slice(1).join('\n').trim(),
        isSplit: true,
        raw
      };
    }
  }

  return { petitioner: raw, respondent: '', isSplit: false, raw };
};

/**
 * Format decision date
 */
const formatLegalDate = (dateVal) => {
  if (!dateVal) return null;
  try {
    const dStr = String(dateVal).split('T')[0];
    const parts = dStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }
    return dStr;
  } catch (e) {
    return String(dateVal);
  }
};

const fontSizes = [
  { label: 'Standard', fontSize: '15.5px', lineHeight: '1.75' },
  { label: 'Comfortable', fontSize: '17.5px', lineHeight: '1.85' },
  { label: 'Large', fontSize: '19.5px', lineHeight: '1.9' },
  { label: 'Enlarged', fontSize: '22px', lineHeight: '2.0' }
];

const CaseViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI states for interactive features
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [copiedJudgment, setCopiedJudgment] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1); // 0: Standard, 1: Comfortable, 2: Large, 3: Enlarged
  const [pageSize, setPageSize] = useState('legal'); // 'legal' | 'letter' | 'a4'

  useEffect(() => {
    const fetchCase = async () => {
      try {
        setLoading(true);
        const data = await caseService.getCaseById(id);
        if (!data) {
          setError('No case record found matching this identifier in the SLD database.');
        } else {
          setCaseData(data);
        }
      } catch (err) {
        console.error('Failed to load case:', err);
        setError('Failed to load official case record. Please verify the SLD number or connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [id]);

  // Parsed cause list
  const causeList = useMemo(() => {
    return parseCauseTitle(caseData?.petitioners);
  }, [caseData]);

  // Joined parallel citation string
  const citationString = useMemo(() => {
    if (!caseData?.mapYearPage || caseData.mapYearPage.length === 0) {
      return caseData?.sldNumber ? `SLD Ref #${caseData.sldNumber}` : '';
    }
    return caseData.mapYearPage.join('  =  ');
  }, [caseData]);

  // Group applicable statutes by Law name, showing sections on line 2
  const groupedLaws = useMemo(() => {
    const map = new Map();
    if (Array.isArray(caseData?.laws)) {
      caseData.laws.forEach(l => {
        const st = String(l?.lawStatute || '').trim();
        const sec = String(l?.section || '').trim();
        if (!st && !sec) return;
        const statuteName = st || 'Statute';
        if (!map.has(statuteName)) {
          map.set(statuteName, new Set());
        }
        if (sec) map.get(statuteName).add(sec);
      });
    }
    if (map.size === 0 && caseData?.principleLaw) {
      map.set(caseData.principleLaw, new Set());
    }
    return Array.from(map.entries()).map(([statute, sectionsSet]) => ({
      statute,
      sections: Array.from(sectionsSet)
    }));
  }, [caseData]);

  const handleCopyCitation = () => {
    if (!citationString) return;
    navigator.clipboard.writeText(citationString);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2400);
  };

  const handleCopyJudgment = () => {
    const textToCopy = caseData?.judgment || caseData?.headNote || citationString;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedJudgment(true);
    setTimeout(() => setCopiedJudgment(false), 2400);
  };

  const activeFont = fontSizes[fontSizeIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] dark:bg-[#0E1015] flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 animate-pulse">
          <Scale className="w-7 h-7" />
        </div>
        <div className="flex flex-col items-center">
          <p className="text-sm font-serif font-bold text-slate-800 dark:text-slate-200">
            Accessing Supreme Law Digest Archive...
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Retrieving verified judgment records and parallel citations
          </p>
        </div>
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] dark:bg-[#0E1015] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-500 mb-4 shadow-sm">
          <Gavel className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-serif font-black text-slate-900 dark:text-slate-100 mb-2">
          Case Law Not Found
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
          {error || 'The requested judicial record could not be extracted from the database archive.'}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Research
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F4F1EA] dark:bg-[#0c0e14] text-[#1c1d22] dark:text-[#E2E8F0] overflow-y-auto print:bg-white print:text-black print:overflow-visible transition-colors">
      
      {/* Dynamic Print CSS for Selected Paper Size (Letter, Legal, A4) */}
      <style>{`
        @media print {
          @page {
            size: ${pageSize};
            margin: 5mm 8mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .versus-print-hide, 
          .footer-print-hide, 
          footer, 
          .print-hidden, 
          [data-print-hide="true"],
          .versus-divider {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            max-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* 1. TOP NON-PRINTABLE JUDICIAL CHAMBERS TOOLBAR */}
      <header className="print:hidden sticky top-0 z-40 bg-white/95 dark:bg-[#12151D]/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-xs transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Close & Back with Case Stamp */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  window.close();
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Return to previous screen"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-stone-300 dark:border-stone-700">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                <Award className="w-3 h-3 text-amber-500" />
                SLD Official Report
              </span>
              <span className="text-xs font-serif font-black text-stone-900 dark:text-stone-100">
                SLD #{caseData.sldNumber || caseData.caseId}
              </span>
            </div>
          </div>

          {/* Right Action Controls: A- / A+ Adjuster, Copy Citation, Copy Judgment, Page Size Selector, Print */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* Font Size Adjuster (A- / A+) */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-300 dark:border-stone-700 p-0.5">
              <button
                type="button"
                onClick={() => setFontSizeIndex(prev => Math.max(0, prev - 1))}
                disabled={fontSizeIndex === 0}
                className="px-2.5 py-1 text-xs font-black text-stone-700 dark:text-stone-300 disabled:opacity-30 hover:bg-white dark:hover:bg-stone-700 rounded transition-colors cursor-pointer"
                title="Decrease Font Size (A-)"
              >
                A-
              </button>
              <span className="px-2.5 text-[10.5px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 select-none">
                {activeFont.label}
              </span>
              <button
                type="button"
                onClick={() => setFontSizeIndex(prev => Math.min(fontSizes.length - 1, prev + 1))}
                disabled={fontSizeIndex === fontSizes.length - 1}
                className="px-2.5 py-1 text-xs font-black text-stone-700 dark:text-stone-300 disabled:opacity-30 hover:bg-white dark:hover:bg-stone-700 rounded transition-colors cursor-pointer"
                title="Increase Font Size (A+)"
              >
                A+
              </button>
            </div>

            {/* Copy Citation Button */}
            {citationString && (
              <button 
                type="button"
                onClick={handleCopyCitation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-xs transition-colors cursor-pointer"
                title="Copy official citations to clipboard"
              >
                {copiedCitation ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                    <span className="hidden sm:inline">Copy Citation</span>
                  </>
                )}
              </button>
            )}

            {/* Copy Judgment Button (Replaced Copy Headnote as requested) */}
            <button 
              type="button"
              onClick={handleCopyJudgment}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-xs transition-colors cursor-pointer"
              title="Copy certified judgment to clipboard"
            >
              {copiedJudgment ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Judgment Copied!</span>
                </>
              ) : (
                <>
                  <Scale className="w-3.5 h-3.5 text-stone-500" />
                  <span>Copy Judgment</span>
                </>
              )}
            </button>

            {/* Print Page Size Selector: Letter / Legal / A4 */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-300 dark:border-stone-700 px-2 py-1 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 mr-1.5">
                Page:
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="bg-transparent text-xs font-bold text-stone-900 dark:text-stone-100 outline-none cursor-pointer"
                title="Select page size for print format"
              >
                <option value="legal">Legal (8.5×14")</option>
                <option value="letter">Letter (8.5×11")</option>
                <option value="a4">A4 (210×297mm)</option>
              </select>
            </div>

            {/* Print Official Law Report Button */}
            <button 
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Print certified law report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>

          </div>

        </div>
      </header>

      {/* 2. THE MASTER JUDICIAL LAW REPORT CANVAS */}
      <main className="max-w-4xl mx-auto my-4 sm:my-8 px-3 sm:px-6 pb-24 print:m-0 print:p-0 print:max-w-none">
        
        {/* Document Folio Paper Container */}
        <article className="bg-[#FCFBF8] dark:bg-[#151821] border border-stone-300/90 dark:border-stone-800/90 rounded-2xl shadow-lg print:border-none print:shadow-none print:bg-white p-6 sm:p-12 print:p-0 print:m-0 relative overflow-hidden transition-colors">
          
          {/* Subtle Judicial Watermark Emblem */}
          <div className="absolute top-12 right-12 opacity-[0.035] dark:opacity-[0.05] pointer-events-none select-none print:hidden">
            <Scale className="w-80 h-80 text-stone-900 dark:text-white" />
          </div>

          {/* DOCUMENT HEADER BANNER (Top gazette title removed as requested) */}
          <header className="relative border-b-2 border-stone-800 dark:border-stone-300 pb-6 mb-6 text-center space-y-3.5">
            
            {/* Official Court Title in Classical Heading */}
            <div className="pt-1">
              <h1 className="text-xl sm:text-2xl font-serif font-black uppercase tracking-wider text-stone-950 dark:text-stone-50 leading-tight">
                {caseData.court || 'Court of Record'}
              </h1>
            </div>

            {/* Parallel Citations Bar (Gilded Ribbon) */}
            {citationString && (
              <div className="inline-flex items-center justify-center gap-2 px-6 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-sm sm:text-base font-serif font-black tracking-wide shadow-xs">
                <span>{citationString}</span>
              </div>
            )}

            {/* Case / Appeal Reference Numbers & Decision Date */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs sm:text-sm font-serif font-bold text-stone-700 dark:text-stone-300">
              {caseData.caseNumber && caseData.caseNumber.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Gavel className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span>{caseData.caseNumber.join('; ')}</span>
                </span>
              )}
              {caseData.dated && (
                <span className="inline-flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
                  <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>Decision Dated: {formatLegalDate(caseData.dated)}</span>
                </span>
              )}
            </div>

            {/* Coram / Bench without redundant label */}
            {caseData.judges && caseData.judges.length > 0 && (
              <div className="pt-1">
                <p className="text-xs sm:text-sm font-serif font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                  BEFORE: {caseData.judges.join('  •  ')}
                </p>
              </div>
            )}

          </header>

          {/* 3. CAUSE TITLE: ALIGNED PETITIONER VS RESPONDENT (Label removed) */}
          <section className="my-6 p-5 sm:p-7 rounded-2xl bg-gradient-to-b from-stone-50 via-stone-50/60 to-transparent dark:from-stone-900/40 dark:to-transparent border border-stone-200/90 dark:border-stone-800/80 shadow-xs print:my-2 print:p-2 print:border-none print:shadow-none">
            {causeList.isSplit ? (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-5 sm:gap-6 print:gap-2">
                
                {/* Petitioner / Appellant Block */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-1.5">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 px-3 py-0.5 rounded-full shadow-2xs print:border-none print:p-0">
                    Petitioner / Appellant
                  </span>
                  <div className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100 leading-snug whitespace-pre-line">
                    {causeList.petitioner}
                  </div>
                </div>

                {/* Classical Versus Center Divider (Hidden in print) */}
                <div className="flex flex-col items-center justify-center px-4 py-1 versus-print-hide print:!hidden" data-print-hide="true">
                  <div className="w-10 h-10 rounded-full bg-stone-200/90 dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-700 flex items-center justify-center shadow-xs versus-print-hide print:!hidden">
                    <span className="text-xs font-serif font-black italic text-stone-700 dark:text-stone-200 versus-print-hide print:!hidden">
                      VS
                    </span>
                  </div>
                  <span className="text-[9px] font-sans font-black tracking-widest text-stone-400 dark:text-stone-500 uppercase mt-1 versus-print-hide print:!hidden">
                    VERSUS
                  </span>
                </div>

                {/* Respondent Block */}
                <div className="flex flex-col items-center md:items-end text-center md:text-right space-y-1.5">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-3 py-0.5 rounded-full shadow-2xs print:border-none print:p-0">
                    Respondent(s)
                  </span>
                  <div className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100 leading-snug whitespace-pre-line">
                    {causeList.respondent}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100 leading-relaxed whitespace-pre-line">
                  {causeList.raw || 'Parties to Appeal'}
                </div>
              </div>
            )}

            {/* Legal Representation / Advocates Bar */}
            {caseData.lawyers && caseData.lawyers.length > 0 && (
              <div className="mt-5 pt-4 border-t border-stone-200/80 dark:border-stone-800/80 text-xs text-stone-600 dark:text-stone-400 font-serif flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 italic">
                <span className="font-sans font-bold uppercase tracking-wider text-[10px] text-stone-400 dark:text-stone-500 not-italic">
                  Legal Counsel Appearing:
                </span>
                {caseData.lawyers.map((counsel, idx) => (
                  <span key={idx} className="font-medium">
                    {counsel}
                  </span>
                ))}
              </div>
            )}

          </section>

          {/* 4. STATUTORY FRAMEWORK: LAW ON LINE 1 & SECTIONS ON LINE 2 (Grouped) */}
          {groupedLaws.length > 0 && (
            <section className="my-6 p-4 sm:p-5 rounded-xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-3">
              <span className="text-[10.5px] font-sans font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 block mb-1">
                Applicable Statutes & Sections:
              </span>
              <div className="space-y-3">
                {groupedLaws.map((grp, gIdx) => (
                  <div key={gIdx} className="border-b border-stone-200/60 dark:border-stone-800/60 pb-2 last:border-b-0 last:pb-0">
                    <div className="font-serif font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                      {grp.statute}
                    </div>
                    {grp.sections.length > 0 && (
                      <div className="font-serif font-bold text-xs sm:text-sm text-amber-800 dark:text-amber-400 mt-0.5">
                        ({grp.sections.length > 1 ? 'Sections: ' : 'Section: '}{grp.sections.join(', ')})
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Principle of Law Ratio Decidendi */}
              {caseData.principleLaw && (
                <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800/80">
                  <span className="text-[10.5px] font-sans font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1">
                    Principle of Law / Ratio Decidendi:
                  </span>
                  <p className="text-xs sm:text-sm font-serif italic text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
                    "{caseData.principleLaw}"
                  </p>
                </div>
              )}
            </section>
          )}

          {/* 5. FORMAL LAW REPORT HEADNOTE (Badges removed, increased font) */}
          {caseData.headNote && (
            <section className="my-6 p-5 sm:p-7 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border-l-4 border-amber-600 dark:border-amber-500 border-t border-r border-b border-amber-200/70 dark:border-amber-900/40 shadow-xs">
              <div 
                className="font-serif text-stone-800 dark:text-stone-200 whitespace-pre-line text-justify transition-all"
                style={{ fontSize: activeFont.fontSize, lineHeight: activeFont.lineHeight }}
              >
                {caseData.headNote}
              </div>
            </section>
          )}

          {/* 6. VERBATIM JUDGMENT / OPERATIVE ORDER (Divider banner removed as requested) */}
          <section className="mt-6 pt-4 space-y-4">
            
            {/* Operative Transcript Flow with Dynamic Font Size Rescaling */}
            <div 
              className="font-serif text-stone-900 dark:text-stone-100 space-y-4 text-justify print:text-black transition-all"
              style={{ fontSize: activeFont.fontSize, lineHeight: activeFont.lineHeight }}
            >
              {caseData.judgment && caseData.judgment.trim().length > 0 ? (
                caseData.judgment.includes('<p>') ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: caseData.judgment }}
                    className="prose dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-relaxed prose-headings:font-serif"
                    style={{ fontSize: activeFont.fontSize, lineHeight: activeFont.lineHeight }}
                  />
                ) : (
                  caseData.judgment.split(/\n\s*\n/).map((para, pIdx) => {
                    const cleanPara = para.trim();
                    if (!cleanPara) return null;
                    return (
                      <p key={pIdx} className="indent-6 whitespace-pre-line">
                        {cleanPara}
                      </p>
                    );
                  })
                )
              ) : (
                <div className="p-6 rounded-xl bg-stone-100/60 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 text-center space-y-2 my-4">
                  <h3 className="text-sm font-serif font-bold text-stone-800 dark:text-stone-200">
                    Official Judicial Digest Record
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-lg mx-auto leading-relaxed">
                    This decision has been indexed and digested directly from the official records of the {caseData.court || 'Court of Record'}. The full operative ratio and statutory holdings are set out in the certified syllabus and principle of law above.
                  </p>
                </div>
              )}
            </div>

          </section>

          {/* 7. AUTHENTIC LAW REPORTER VERIFICATION FOOTER (Hidden in print) */}
          <footer className="mt-12 pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-[11px] font-sans text-stone-500 dark:text-stone-400 footer-print-hide print:!hidden" data-print-hide="true">
            <div className="flex items-center gap-2 footer-print-hide print:!hidden">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 footer-print-hide print:!hidden">✓ Certified verbatim electronic transcript</span>
            </div>
            <div className="font-serif font-bold text-stone-600 dark:text-stone-300 footer-print-hide print:!hidden">
              Supreme Law Digest • Record Ref: #{caseData.sldNumber || caseData.caseId}
            </div>
          </footer>

        </article>

      </main>

    </div>
  );
};

export default CaseViewPage;
