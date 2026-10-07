import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { caseService } from '../features/cases/services/caseService';
import Spinner from '../components/ui/Spinner';
import { 
  ArrowLeft, Printer, Scale, Copy, Check, 
  BookOpen, ShieldCheck, FileText, Calendar, 
  Gavel, Landmark, Award, Share2, ZoomIn, ZoomOut
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
  
  // Split on common legal versus delimiters
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
 * Format decision date nicely
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

const CaseViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI states for interactive features
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [copiedHeadnote, setCopiedHeadnote] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1); // 0: Normal, 1: Comfortable, 2: Large

  const fontSizes = [
    { label: 'Standard', bodyClass: 'text-[15px] leading-relaxed', headerClass: 'text-xl' },
    { label: 'Comfortable', bodyClass: 'text-[16.5px] leading-[1.8]', headerClass: 'text-2xl' },
    { label: 'Enlarged', bodyClass: 'text-[18.5px] leading-[1.9]', headerClass: 'text-3xl' }
  ];

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

  const handleCopyCitation = () => {
    if (!citationString) return;
    navigator.clipboard.writeText(citationString);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2400);
  };

  const handleCopyHeadnote = () => {
    const textToCopy = caseData?.headNote || caseData?.principleLaw || citationString;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedHeadnote(true);
    setTimeout(() => setCopiedHeadnote(false), 2400);
  };

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

  const activeFont = fontSizes[fontSizeIndex];

  return (
    <div className="min-h-screen w-full bg-[#F4F1EA] dark:bg-[#0c0e14] text-[#1c1d22] dark:text-[#E2E8F0] overflow-y-auto print:bg-white print:text-black print:overflow-visible transition-colors">
      
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

          {/* Right Action Controls: Text Size, Copy Citation, Print */}
          <div className="flex items-center gap-2">
            
            {/* Font Size Adjuster */}
            <div className="hidden md:flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-300 dark:border-stone-700 p-0.5">
              <button
                onClick={() => setFontSizeIndex(prev => Math.max(0, prev - 1))}
                disabled={fontSizeIndex === 0}
                className="px-2 py-1 text-xs font-black text-stone-600 dark:text-stone-300 disabled:opacity-30 hover:bg-white dark:hover:bg-stone-700 rounded transition-colors cursor-pointer"
                title="Decrease Font Size"
              >
                A-
              </button>
              <span className="px-2 text-[10.5px] font-black uppercase tracking-wider text-stone-400">
                {activeFont.label}
              </span>
              <button
                onClick={() => setFontSizeIndex(prev => Math.min(fontSizes.length - 1, prev + 1))}
                disabled={fontSizeIndex === fontSizes.length - 1}
                className="px-2 py-1 text-xs font-black text-stone-600 dark:text-stone-300 disabled:opacity-30 hover:bg-white dark:hover:bg-stone-700 rounded transition-colors cursor-pointer"
                title="Increase Font Size"
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

            {/* Copy Headnote / Ratio Button */}
            {caseData.headNote && (
              <button 
                type="button"
                onClick={handleCopyHeadnote}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-xs transition-colors cursor-pointer"
                title="Copy headnote catchwords to clipboard"
              >
                {copiedHeadnote ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Headnote Copied!</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-3.5 h-3.5 text-stone-500" />
                    <span>Copy Headnote</span>
                  </>
                )}
              </button>
            )}

            {/* Print Official Law Report */}
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
        <article className="bg-[#FCFBF8] dark:bg-[#151821] border border-stone-300/90 dark:border-stone-800/90 rounded-2xl shadow-lg print:border-none print:shadow-none print:bg-white p-6 sm:p-12 relative overflow-hidden transition-colors">
          
          {/* Subtle Judicial Watermark Emblem */}
          <div className="absolute top-12 right-12 opacity-[0.035] dark:opacity-[0.05] pointer-events-none select-none print:hidden">
            <Scale className="w-80 h-80 text-stone-900 dark:text-white" />
          </div>

          {/* DOCUMENT HEADER BANNER */}
          <header className="relative border-b-2 border-stone-800 dark:border-stone-300 pb-6 mb-6 text-center space-y-4">
            
            {/* Top Gazette Identity & Seal */}
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3 text-xs uppercase tracking-widest font-sans font-black text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-amber-600" />
                Supreme Law Digest (SLD) Law Reports
              </span>
              <span className="font-serif font-bold text-amber-700 dark:text-amber-400">
                Official Case Record • SLD #{caseData.sldNumber || caseData.caseId}
              </span>
            </div>

            {/* Official Court Title in Classical Heading */}
            <div className="pt-2">
              <h1 className="text-xl sm:text-2xl font-serif font-black uppercase tracking-wider text-stone-950 dark:text-stone-50 leading-tight">
                {caseData.court || 'Court of Record'}
              </h1>
            </div>

            {/* Parallel Citations Bar (Gilded Ribbon) */}
            {citationString && (
              <div className="inline-flex items-center justify-center gap-2 px-5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-sm sm:text-base font-serif font-black tracking-wide shadow-xs">
                <span>{citationString}</span>
              </div>
            )}

            {/* Case / Appeal Reference Numbers & Decision Date */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:text-sm font-serif font-bold text-stone-700 dark:text-stone-300">
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

            {/* Coram / Bench */}
            {caseData.judges && caseData.judges.length > 0 && (
              <div className="pt-1">
                <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 block mb-0.5">
                  Coram / Before:
                </span>
                <p className="text-xs sm:text-sm font-serif font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                  {caseData.judges.join('  •  ')}
                </p>
              </div>
            )}

          </header>

          {/* 3. CAUSE TITLE: SUPERBLY ALIGNED PETITIONER VS RESPONDENT */}
          <section className="my-6 p-5 sm:p-7 rounded-2xl bg-gradient-to-b from-stone-50 via-stone-50/60 to-transparent dark:from-stone-900/40 dark:to-transparent border border-stone-200/90 dark:border-stone-800/80 shadow-xs">
            {causeList.isSplit ? (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-5 sm:gap-6">
                
                {/* Petitioner / Appellant Block */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-1.5">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 px-3 py-0.5 rounded-full shadow-2xs">
                    Petitioner / Appellant
                  </span>
                  <div className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100 leading-snug whitespace-pre-line">
                    {causeList.petitioner}
                  </div>
                </div>

                {/* Classical Versus Center Divider */}
                <div className="flex flex-col items-center justify-center px-4 py-1">
                  <div className="w-10 h-10 rounded-full bg-stone-200/90 dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-700 flex items-center justify-center shadow-xs">
                    <span className="text-xs font-serif font-black italic text-stone-700 dark:text-stone-200">
                      VS
                    </span>
                  </div>
                  <span className="text-[9px] font-sans font-black tracking-widest text-stone-400 dark:text-stone-500 uppercase mt-1">
                    VERSUS
                  </span>
                </div>

                {/* Respondent Block */}
                <div className="flex flex-col items-center md:items-end text-center md:text-right space-y-1.5">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-3 py-0.5 rounded-full shadow-2xs">
                    Respondent(s)
                  </span>
                  <div className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100 leading-snug whitespace-pre-line">
                    {causeList.respondent}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center space-y-2">
                <span className="text-[10.5px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 block">
                  Litigants & Parties
                </span>
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

          {/* 4. STATUTORY FRAMEWORK & PRINCIPLE OF LAW */}
          {(caseData.principleLaw || (caseData.laws && caseData.laws.length > 0)) && (
            <section className="my-6 p-4 sm:p-5 rounded-xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-3">
              
              {/* Applicable Statutes Capsules */}
              {caseData.laws && caseData.laws.length > 0 && (
                <div>
                  <span className="text-[10.5px] font-sans font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 block mb-2">
                    Applicable Statutes & Sections:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {caseData.laws.map((law, idx) => (
                      <span 
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans font-bold bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 shadow-2xs"
                      >
                        <Scale className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{law.lawStatute}</span>
                        {law.section && (
                          <span className="text-amber-700 dark:text-amber-400 font-black">
                            (Section {law.section})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Principle of Law Gilded Callout */}
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

          {/* 5. FORMAL LAW REPORT HEADNOTE */}
          {caseData.headNote && (
            <section className="my-6 p-5 sm:p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-amber-600 dark:border-amber-500 border-t border-r border-b border-amber-200/70 dark:border-amber-900/40 shadow-xs space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-sans font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  Official Head Note & Subject Digest
                </span>
                <span className="text-[10px] font-sans font-bold text-amber-700 dark:text-amber-400">
                  SLD Certified Digest
                </span>
              </div>
              <div className="text-xs sm:text-[13.5px] font-serif text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-line text-justify">
                {caseData.headNote}
              </div>
            </section>
          )}

          {/* 6. VERBATIM JUDGMENT / OPERATIVE ORDER */}
          <section className="mt-8 pt-6 border-t-2 border-stone-800 dark:border-stone-300 space-y-4">
            
            {/* Section Banner */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <h2 className="text-base sm:text-lg font-serif font-black uppercase tracking-wider text-stone-950 dark:text-stone-50 flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-600" />
                Judgment / Order of the Court
              </h2>
              <span className="text-[10.5px] font-sans font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Verbatim Transcript
              </span>
            </div>

            {/* Operative Transcript Flow */}
            <div 
              className={`font-serif text-stone-900 dark:text-stone-100 ${activeFont.bodyClass} space-y-4 text-justify print:text-black`}
            >
              {caseData.judgment && caseData.judgment.trim().length > 0 ? (
                caseData.judgment.includes('<p>') ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: caseData.judgment }}
                    className="prose dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-relaxed prose-headings:font-serif"
                  />
                ) : (
                  caseData.judgment.split(/\n\s*\n/).map((para, pIdx) => {
                    const cleanPara = para.trim();
                    if (!cleanPara) return null;
                    return (
                      <p key={pIdx} className="leading-relaxed indent-6 whitespace-pre-line">
                        {cleanPara}
                      </p>
                    );
                  })
                )
              ) : (
                /* Elegant Editorial Digest Fallback */
                <div className="p-6 rounded-xl bg-stone-100/60 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 text-center space-y-2 my-4">
                  <ShieldCheck className="w-8 h-8 text-amber-600 mx-auto" />
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

          {/* 7. AUTHENTIC LAW REPORTER VERIFICATION FOOTER */}
          <footer className="mt-12 pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-[11px] font-sans text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Certified verbatim electronic transcript from the Supreme Law Digest database.</span>
            </div>
            <div className="font-serif font-bold text-stone-600 dark:text-stone-300">
              Supreme Law Digest • Record Ref: #{caseData.sldNumber || caseData.caseId}
            </div>
          </footer>

        </article>

      </main>

    </div>
  );
};

export default CaseViewPage;
