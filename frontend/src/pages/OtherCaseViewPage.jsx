import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { otherCaseService, getOtherCaseDocumentUrl } from '../features/cases/services/otherCaseService';
import Spinner from '../components/ui/Spinner';
import { 
  ArrowLeft, Printer, Scale, Copy, Check, 
  FileText, Calendar, Gavel, ExternalLink, ShieldCheck, Download
} from 'lucide-react';
import { formatWordDocumentDisplay } from '../utils/wordFormatter';

const fontSizes = [
  { label: 'Standard', fontSize: '15px', lineHeight: '1.75' },
  { label: 'Comfortable', fontSize: '17px', lineHeight: '1.85' },
  { label: 'Large', fontSize: '19px', lineHeight: '1.9' },
  { label: 'Enlarged', fontSize: '21px', lineHeight: '2.0' }
];

const OtherCaseViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [copied, setCopied] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        setLoading(true);
        const data = await otherCaseService.getOtherCaseById(id);
        if (!data) {
          setError('No case law record found matching this identifier in the database.');
        } else {
          setCaseData(data);
        }
      } catch (err) {
        console.error('Failed to load other case law:', err);
        setError('Failed to load case law record. Please verify the identifier or connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [id]);

  const handleCopy = () => {
    const fullText = `${caseData?.citation || ''}\n${caseData?.parties || caseData?.caseTitle || ''}\nCase No: ${caseData?.caseNo || ''}\nOrder Date: ${caseData?.orderDate || caseData?.judgmentDate || ''}\n\n${caseData?.headNotes || caseData?.notes || ''}`;
    navigator.clipboard.writeText(fullText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
        <Spinner size="lg" />
        <p className="mt-4 text-xs font-mono text-stone-500 uppercase tracking-widest animate-pulse">
          Retrieving superior court judgment record...
        </p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
            <Scale className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-2">Record Not Found</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">{error || 'The requested judgment record could not be located.'}</p>
          <button
            onClick={() => navigate('/other-caselaws')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Manage Other Case Law</span>
          </button>
        </div>
      </div>
    );
  }

  const targetDocId = caseData.mongoId || caseData.id || caseData.otherCaseId || caseData.srNumber;
  const hasDoc = Boolean(
    (caseData.caseNoLink && caseData.caseNoLink.trim() && caseData.caseNoLink !== 'Nil') ||
    (caseData.downloadLink && caseData.downloadLink.trim() && caseData.downloadLink !== 'Nil') ||
    (caseData.attachment && caseData.attachment.trim() && caseData.attachment !== 'Nil')
  );
  const documentUrl = hasDoc && targetDocId ? getOtherCaseDocumentUrl(targetDocId) : null;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans selection:bg-brand-orange selection:text-white">
      {/* ── Top Floating Action Bar ─────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-4 py-3 print:hidden shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/other-caselaws')}
              className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-600 dark:text-stone-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Back to Other Case Laws"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                SR #{caseData.srNumber || 'N/A'}
              </span>
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 truncate max-w-[200px] sm:max-w-xs font-mono">
                {caseData.citation || caseData.caseNo}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Font size toggles */}
            <div className="hidden md:flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg p-0.5 text-xs">
              {fontSizes.map((fs, idx) => (
                <button
                  key={fs.label}
                  onClick={() => setFontSizeIndex(idx)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                    fontSizeIndex === idx 
                      ? 'bg-white dark:bg-stone-700 text-brand-orange shadow-2xs font-bold' 
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  {fs.label}
                </button>
              ))}
            </div>

            {/* Document Action Button */}
            {documentUrl && (
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                title="View Full High Court Judgment Document in new tab"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Full PDF</span>
                <ExternalLink className="w-3 h-3 opacity-75" />
              </a>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-stone-600 dark:text-stone-300 transition-colors"
              title="Copy Case Law Text"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-stone-600 dark:text-stone-300 transition-colors"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* ── Document Container ──────────────────────────────────── */}
      <main className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl p-6 sm:p-10 transition-colors">
          
          {/* Header Metadata Ribbon */}
          <div className="border-b border-stone-200 dark:border-stone-800 pb-6 mb-6">
            
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold">
                  {caseData.apexCourt || 'Superior Court of Record'}
                </span>
                {caseData.apexStatus && (
                  <span className="px-2.5 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 rounded-lg text-xs font-semibold">
                    {caseData.apexStatus}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-stone-500 dark:text-stone-400">
                {caseData.orderDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>Order Date: {caseData.orderDate}</span>
                  </span>
                )}
                <span>Year: {caseData.caseYear || 'N/A'}</span>
              </div>
            </div>

            {/* Title / Parties */}
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 leading-snug mb-3">
              {caseData.parties || caseData.caseTitle || 'Case Record'}
            </h1>

            {/* Grid of Key Judicial Citations */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 block">Case Number</span>
                <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{caseData.caseNo || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 block">Citation</span>
                <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{caseData.citation || 'Nil'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 block">Bench / Coram</span>
                <span className="font-medium text-stone-800 dark:text-stone-200">{caseData.bench || caseData.authorJudge || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 block">SLD SR #</span>
                <span className="font-bold text-brand-orange">{caseData.srNumber || '-'}</span>
              </div>
            </div>

          </div>

          {/* Official Document Action Banner */}
          {documentUrl && (
            <div className="mb-8 p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-theme-main">Certified Official High Court Judgment Document</h4>
                  <p className="text-xs text-theme-muted font-mono">{caseData.caseNo}.pdf • Streamed inline from legal archives</p>
                </div>
              </div>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-brand-orange hover:bg-orange-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-colors shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full Certified PDF</span>
              </a>
            </div>
          )}

          {/* Head Notes / Summary formatted as clean Word Document */}
          <article 
            className="prose dark:prose-invert max-w-none text-stone-800 dark:text-stone-200 font-serif leading-relaxed"
            style={{
              fontSize: fontSizes[fontSizeIndex].fontSize,
              lineHeight: fontSizes[fontSizeIndex].lineHeight
            }}
          >
            <div className="mb-3">
              <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Official Judicial Headnotes & Summary
              </h3>
            </div>

            {caseData.headNotes ? (
              <div 
                className="word-document-content text-stone-800 dark:text-stone-200 font-serif leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatWordDocumentDisplay(caseData.headNotes) }}
              />
            ) : (
              <p className="italic text-stone-500">
                Complete verbatim judgment is indexed in the official certified document above.
              </p>
            )}
          </article>

          {/* Official Verification Seal Footer */}
          <footer className="mt-12 pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Certified Official Legal Provision • SLD System Superior Court Repository</span>
            </div>
            <div className="text-[11px] font-mono">
              SLD System (SMC-PVT) Limited
            </div>
          </footer>

        </div>
      </main>
    </div>
  );
};

export default OtherCaseViewPage;
