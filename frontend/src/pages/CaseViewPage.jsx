import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { caseService } from '../features/cases/services/caseService';
import Spinner from '../components/ui/Spinner';
import { ArrowLeft, Printer, Scale, ExternalLink } from 'lucide-react';

const CaseViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const data = await caseService.getCaseById(id);
        setCaseData(data);
      } catch (err) {
        setError('Failed to load case details.');
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );

  if (error || !caseData) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-red-500 font-sans">
      {error || 'Case not found'}
    </div>
  );

  return (
    <div className="h-screen w-full bg-[#faf9f6] text-[#1a1a1a] overflow-y-auto print:h-auto print:bg-white print:overflow-visible">
      <div className="p-4 sm:p-8 pb-16 font-serif max-w-5xl mx-auto min-h-full">
        
        {/* Top non-printable toolbar */}
        <div className="print:hidden flex justify-between items-center mb-8 pb-4 border-b border-gray-300 font-sans">
          <button 
            onClick={() => window.close() || navigate(-1)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Close / Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md border border-amber-200">
              SLD #{caseData.sldNumber || caseData.caseId}
            </span>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3.5 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-sm font-medium text-gray-800 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Document
            </button>
          </div>
        </div>

      {/* Printable Document Area */}
      <div className="bg-white p-8 sm:p-12 shadow-sm rounded-xl border border-gray-200 print:border-none print:shadow-none space-y-6">
        
        {/* Header Section */}
        <div className="text-center space-y-3 pb-6 border-b border-gray-200">
          
          <div className="inline-block px-3 py-1 bg-blue-50 text-[#1e3a5a] border border-blue-100 rounded text-xs font-sans font-bold tracking-wide">
            SLD #{caseData.sldNumber || caseData.caseId}
          </div>

          {caseData.mapYearPage && caseData.mapYearPage.length > 0 && (
            <div className="font-bold text-base text-gray-800 tracking-wide">
              {caseData.mapYearPage.join('  =  ')}
            </div>
          )}
          
          <h1 className="text-2xl font-bold uppercase text-gray-900 tracking-wider pt-2">
            {caseData.court || 'Court of Record'}
          </h1>
          
          <div className="font-semibold text-gray-700 text-sm">
            {caseData.caseNumber && caseData.caseNumber.length > 0 && (
              <span>{caseData.caseNumber.join(', ')}</span>
            )}
            {caseData.dated && (
              <span>, Decision Dated: {String(caseData.dated).split('T')[0]}</span>
            )}
          </div>

          {caseData.judges && caseData.judges.length > 0 && (
            <div className="font-bold uppercase mt-4 text-xs text-gray-600 tracking-wider">
              {caseData.judges.join(' ')}
            </div>
          )}

          {/* Petitioners and Respondents */}
          {caseData.petitioners && caseData.petitioners.length > 0 && (
            <div className="font-bold uppercase mt-6 text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {caseData.petitioners.join('\n')}
            </div>
          )}
          
          {caseData.lawyers && caseData.lawyers.length > 0 && (
            <div className="font-medium text-xs text-gray-600 mt-4 italic">
              {caseData.lawyers.join(' | ')}
            </div>
          )}
        </div>

        {/* Laws & Statutes Section */}
        {(caseData.principleLaw || (caseData.laws && caseData.laws.length > 0)) && (
          <div className="border-t border-b border-gray-300 py-3 font-sans text-xs text-gray-700 bg-gray-50/60 rounded px-4">
            <span className="font-bold text-gray-900 uppercase block mb-1">Applicable Statutes & Sections:</span>
            {caseData.principleLaw && (
              <div className="mb-1"><strong className="text-gray-900">Principle:</strong> {caseData.principleLaw}</div>
            )}
            {caseData.laws && caseData.laws.map((law, idx) => (
              <div key={idx} className="inline-block mr-3 mb-1">
                <span className="font-semibold text-gray-900">{law.lawStatute}</span>
                {law.section && <span className="text-gray-600"> (S. {law.section})</span>}
              </div>
            ))}
          </div>
        )}

        {/* Headnote if available */}
        {caseData.headNote && (
          <div className="p-4 bg-amber-50/40 rounded-lg border border-amber-200/60 font-sans text-xs text-gray-800 leading-relaxed">
            <span className="font-bold text-amber-900 block mb-1 uppercase tracking-wider text-[11px]">Head Note</span>
            <p className="whitespace-pre-line">{caseData.headNote}</p>
          </div>
        )}

        {/* Judgment / Order Content */}
        <div className="pt-4">
          <h2 className="text-base font-bold uppercase tracking-wider text-gray-900 mb-4 pb-2 border-b border-gray-200 font-sans flex items-center gap-2">
            <Scale className="w-4 h-4 text-brand-orange" /> Judgment / Order
          </h2>
          <div 
            className="text-justify leading-relaxed text-[15px] whitespace-pre-line font-serif text-gray-900"
            dangerouslySetInnerHTML={{ 
              __html: caseData.judgment 
                ? (caseData.judgment.includes('<p>') ? caseData.judgment : caseData.judgment.replace(/\n/g, '<br />'))
                : (caseData.headNote ? caseData.headNote.replace(/\n/g, '<br />') : 'No judgment order text available for this case.') 
            }}
          />
        </div>

      </div>
    </div>
  </div>
  );
};

export default CaseViewPage;
