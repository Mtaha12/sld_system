import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { caseService } from '../features/cases/services/caseService';
import Spinner from '../components/ui/Spinner';
import { ArrowLeft, Printer } from 'lucide-react';

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

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Spinner size="lg" /></div>;
  if (error || !caseData) return <div className="min-h-screen bg-white flex items-center justify-center text-red-500">{error || 'Case not found'}</div>;

  return (
    <div className="min-h-screen bg-white text-black p-8 font-serif max-w-5xl mx-auto relative">
      
      {/* Non-printable controls */}
      <div className="print:hidden flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-brand-orange transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Search
        </button>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-sans"
        >
          <Printer className="w-4 h-4" /> Print This Page
        </button>
      </div>

      {/* Printable Document Area */}
      <div className="space-y-6">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          {caseData.mapYearPage && caseData.mapYearPage.length > 0 && (
            <div className="font-bold">
              Citation(s): {caseData.mapYearPage.join(' = ')}
            </div>
          )}
          
          <h1 className="text-xl font-bold uppercase">{caseData.court}</h1>
          
          <div className="font-bold">
            {caseData.caseNumber && caseData.caseNumber.length > 0 && (
              <span>{caseData.caseNumber.join(', ')}</span>
            )}
            {caseData.dated && (
               <span>, decided on {caseData.dated}</span>
            )}
          </div>

          {caseData.judges && caseData.judges.length > 0 && (
            <div className="font-bold uppercase mt-4">
              PRESENT: {caseData.judges.join(', ')}
            </div>
          )}

          {/* Petitioners and Respondents */}
          <div className="font-bold uppercase mt-6 space-y-2">
            {caseData.petitioners && caseData.petitioners.length > 0 && (
              <div>{caseData.petitioners.join(', ')}---PETITIONER</div>
            )}
            <div className="text-sm">VS</div>
            {/* The DB schema doesn't explicitly have 'respondents' in the top-level but maybe it's in petitioners or we just leave it if missing */}
            {/* Typically respondents are in the judgment body or a respondents field. I will check the schema. Assuming it's in petitioners if it has a format. */}
          </div>
          
          {caseData.lawyers && caseData.lawyers.length > 0 && (
            <div className="font-bold mt-4">
              {caseData.lawyers.join(', ')}
            </div>
          )}
        </div>

        {/* Laws Section */}
        {(caseData.principleLaw || (caseData.laws && caseData.laws.length > 0)) && (
          <div className="border-t border-b border-black py-2 my-6 font-bold">
            {caseData.principleLaw && (
              <div>Law: {caseData.principleLaw}</div>
            )}
            {caseData.laws && caseData.laws.map((law, idx) => (
              <div key={idx}>
                Law: {law.lawStatute} <br/>
                Section: {law.section}
              </div>
            ))}
          </div>
        )}

        {/* Judgment Content */}
        <div 
          className="text-justify leading-relaxed text-[15px]"
          dangerouslySetInnerHTML={{ __html: caseData.judgment || caseData.headNote || 'No judgment text available.' }}
        />

      </div>
    </div>
  );
};

export default CaseViewPage;
