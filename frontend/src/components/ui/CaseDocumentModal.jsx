import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { caseService } from '../../features/cases/services/caseService';
import Spinner from './Spinner';
import { Printer, X } from 'lucide-react';

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden print:p-0 print:static print:inset-auto print:block print:bg-white">
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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm print:hidden transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog Box / Paper */}
      <div id="printable-case-document" className="relative w-full max-w-5xl bg-white text-black rounded-xl shadow-2xl flex flex-col max-h-full z-10 animate-fade-in overflow-hidden print:shadow-none print:max-h-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Toolbar (Hidden when printing) */}
        <div className="print:hidden flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-sans font-medium text-gray-700 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Document
            </button>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Document Area */}
        <div className="overflow-y-auto overflow-x-hidden p-8 sm:p-12 font-serif text-black bg-white print:overflow-visible print:p-0 print:m-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Spinner size="lg" />
              <p className="mt-4 font-sans text-gray-500">Retrieving court order...</p>
            </div>
          ) : error || !caseData ? (
            <div className="flex items-center justify-center py-20 text-red-500 font-sans font-medium">
              {error || 'Case not found'}
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Header Section */}
              <div className="text-center space-y-4">
                {caseData.mapYearPage && caseData.mapYearPage.length > 0 && (
                  <div className="font-bold text-[15px]">
                    Citation(s): {caseData.mapYearPage.join(' = ')}
                  </div>
                )}
                
                <h1 className="text-xl font-bold uppercase tracking-wide">{caseData.court}</h1>
                
                <div className="font-bold text-[15px]">
                  {caseData.caseNumber && caseData.caseNumber.length > 0 && (
                    <span>{caseData.caseNumber.join(', ')}</span>
                  )}
                  {caseData.dated && (
                     <span>, decided on {caseData.dated}</span>
                  )}
                </div>

                {caseData.judges && caseData.judges.length > 0 && (
                  <div className="font-bold uppercase mt-4 text-[15px]">
                    PRESENT: {caseData.judges.join(', ')}
                  </div>
                )}

                {/* Petitioners and Respondents */}
                <div className="font-bold uppercase mt-6 space-y-2 text-[15px]">
                  {caseData.petitioners && caseData.petitioners.length > 0 && (
                    <div>{caseData.petitioners.join(', ')}---PETITIONER</div>
                  )}
                  <div className="text-sm">VS</div>
                  {/* Assumption for respondents if they exist, else left out as in page version */}
                </div>
                
                {caseData.lawyers && caseData.lawyers.length > 0 && (
                  <div className="font-bold mt-4 text-[15px]">
                    {caseData.lawyers.join(', ')}
                  </div>
                )}
              </div>

              {/* Laws Section */}
              {(caseData.principleLaw || (caseData.laws && caseData.laws.length > 0)) && (
                <div className="border-t border-b border-black py-3 my-6 font-bold text-[15px]">
                  {caseData.principleLaw && (
                    <div>Law: {caseData.principleLaw}</div>
                  )}
                  {caseData.laws && caseData.laws.map((law, idx) => (
                    <div key={idx} className="mt-1">
                      Law: {law.lawStatute} <br/>
                      Section: {law.section}
                    </div>
                  ))}
                </div>
              )}

              {/* Judgment Content */}
              <div 
                className="text-justify leading-relaxed text-[15px] pb-12"
                dangerouslySetInnerHTML={{ __html: caseData.judgment || caseData.headNote || 'No judgment text available.' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CaseDocumentModal;

