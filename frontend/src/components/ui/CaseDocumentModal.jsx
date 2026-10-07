import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { caseService } from '../../features/cases/services/caseService';
import Spinner from './Spinner';
import { Printer, X } from 'lucide-react';

/**
 * Robust Cause Title parser for Commonwealth / Pakistani law reports
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

const CaseDocumentModal = ({ caseId, onClose }) => {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!caseId) return;
    
    // Handle Escape key to close
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    const fetchCase = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await caseService.getCaseById(caseId);
        setCaseData(data);
      } catch (err) {
        setError('Failed to load case details.');
      } finally {
        setLoading(false);
      }
    };
    fetchCase();

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [caseId, onClose]);

  if (!caseId) return null;

  const causeList = parseCauseTitle(caseData?.petitioners);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-hidden print:p-0 print:static print:inset-auto print:block print:bg-white">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-case-document, #printable-case-document * {
            visibility: visible;
          }
          #printable-case-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw;
            min-height: 100vh;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          #root {
            display: none !important;
          }
        }
      `}</style>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-xs print:hidden transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog Box / Paper */}
      <div id="printable-case-document" className="relative w-full max-w-4xl bg-[#FCFBF8] text-stone-900 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] z-10 animate-fade-in overflow-hidden border border-stone-300 print:border-none print:shadow-none print:max-h-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Toolbar (Hidden when printing) */}
        <div className="print:hidden flex justify-between items-center px-6 py-3.5 border-b border-stone-200 bg-stone-100/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-md">
              SLD #{caseData?.sldNumber || caseId}
            </span>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 text-xs font-medium text-stone-700 shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" /> Print Document
            </button>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Document Area */}
        <div className="overflow-y-auto overflow-x-hidden p-6 sm:p-10 font-serif text-stone-900 bg-[#FCFBF8] print:overflow-visible print:p-0 print:m-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Spinner size="lg" />
              <p className="mt-4 font-sans text-xs text-stone-500">Retrieving official court order...</p>
            </div>
          ) : error || !caseData ? (
            <div className="flex items-center justify-center py-20 text-red-500 font-sans font-medium text-sm">
              {error || 'Case not found'}
            </div>
          ) : (
            <article className="space-y-6 max-w-3xl mx-auto">
              
              {/* Header Section */}
              <header className="border-b-2 border-stone-800 pb-5 text-center space-y-3">
                {caseData.mapYearPage && caseData.mapYearPage.length > 0 && (
                  <div className="inline-block px-4 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs sm:text-sm font-bold tracking-wide">
                    {caseData.mapYearPage.join('  •  ')}
                  </div>
                )}
                
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-stone-950 pt-1">
                  {caseData.court || 'Court of Record'}
                </h1>
                
                <div className="text-xs sm:text-sm font-bold text-stone-700 space-x-2">
                  {caseData.caseNumber && caseData.caseNumber.length > 0 && (
                    <span>{caseData.caseNumber.join('; ')}</span>
                  )}
                  {caseData.dated && (
                    <span className="text-stone-600">• Decided on {caseData.dated}</span>
                  )}
                </div>

                {caseData.judges && caseData.judges.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400 block">
                      Before:
                    </span>
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-800">
                      {caseData.judges.join('  •  ')}
                    </p>
                  </div>
                )}
              </header>

              {/* Litigants & Parties */}
              <section className="p-4 sm:p-5 rounded-xl bg-stone-100/70 border border-stone-200">
                {causeList.isSplit ? (
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 text-center md:text-left">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full inline-block">
                        Petitioner / Appellant
                      </span>
                      <p className="text-sm font-bold text-stone-900 leading-snug whitespace-pre-line">
                        {causeList.petitioner}
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center px-2">
                      <span className="text-xs font-black italic text-stone-700 bg-stone-200 px-2.5 py-1 rounded-full">
                        VS
                      </span>
                    </div>

                    <div className="space-y-1 md:text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full inline-block">
                        Respondent(s)
                      </span>
                      <p className="text-sm font-bold text-stone-900 leading-snug whitespace-pre-line">
                        {causeList.respondent}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block">
                      Parties to Appeal
                    </span>
                    <p className="text-sm font-bold text-stone-900 leading-relaxed whitespace-pre-line">
                      {causeList.raw || 'Parties to Record'}
                    </p>
                  </div>
                )}

                {caseData.lawyers && caseData.lawyers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-200 text-xs text-stone-600 font-serif italic text-center">
                    <span className="font-sans font-bold uppercase text-[10px] text-stone-400 not-italic mr-2">
                      Counsel:
                    </span>
                    {caseData.lawyers.join('  •  ')}
                  </div>
                )}
              </section>

              {/* Statutory Framework */}
              {(caseData.principleLaw || (caseData.laws && caseData.laws.length > 0)) && (
                <section className="p-3.5 rounded-xl bg-stone-100/50 border border-stone-200 text-xs space-y-2">
                  {caseData.laws && caseData.laws.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="font-sans font-bold uppercase text-[10px] text-stone-400 mr-1">
                        Statutes:
                      </span>
                      {caseData.laws.map((law, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-stone-300 text-stone-800 font-bold">
                          <span>{law.lawStatute}</span>
                          {law.section && <span className="text-amber-700">(Sec. {law.section})</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  {caseData.principleLaw && (
                    <div className="pt-1.5 border-t border-stone-200 text-stone-800 italic">
                      <span className="font-sans font-bold uppercase text-[10px] text-amber-700 not-italic mr-1.5">
                        Principle of Law:
                      </span>
                      "{caseData.principleLaw}"
                    </div>
                  )}
                </section>
              )}

              {/* Head Note */}
              {caseData.headNote && (
                <section className="p-4 rounded-xl bg-amber-50/60 border-l-4 border-amber-600 border-t border-r border-b border-amber-200 text-xs sm:text-[13px] leading-relaxed text-stone-800 whitespace-pre-line text-justify">
                  <span className="font-sans font-black uppercase text-[10.5px] text-amber-800 block mb-1.5">
                    Official Head Note & Subject Digest
                  </span>
                  {caseData.headNote}
                </section>
              )}

              {/* Judgment Text */}
              <section className="pt-4 border-t-2 border-stone-800 space-y-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-stone-900">
                  Judgment / Order
                </h2>
                <div className="text-justify leading-relaxed text-sm sm:text-[15px] space-y-3.5 pb-8">
                  {caseData.judgment && caseData.judgment.trim().length > 0 ? (
                    caseData.judgment.split(/\n\s*\n/).map((para, pIdx) => {
                      const cleanPara = para.trim();
                      if (!cleanPara) return null;
                      return (
                        <p key={pIdx} className="leading-relaxed indent-5 whitespace-pre-line">
                          {cleanPara}
                        </p>
                      );
                    })
                  ) : (
                    <p className="italic text-stone-500 py-4 text-center">
                      Official operative ratio is summarized in the headnote above. No full verbatim transcript available for this record.
                    </p>
                  )}
                </div>
              </section>

            </article>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CaseDocumentModal;
