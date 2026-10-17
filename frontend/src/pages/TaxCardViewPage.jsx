import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taxCardService } from '../features/tax-cards/services/taxCardService';
import Spinner from '../components/ui/Spinner';
import { 
  ArrowLeft, Printer, Landmark, Copy, Check, 
  Calendar, FileText, Download, ShieldCheck, ExternalLink
} from 'lucide-react';
import { formatWordDocumentDisplay } from '../utils/wordFormatter';

const fontSizes = [
  { label: 'Standard', fontSize: '15px', lineHeight: '1.75' },
  { label: 'Comfortable', fontSize: '17px', lineHeight: '1.85' },
  { label: 'Large', fontSize: '19px', lineHeight: '1.9' },
  { label: 'Enlarged', fontSize: '21px', lineHeight: '2.0' }
];

const TaxCardViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [taxCard, setTaxCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [copied, setCopied] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1);

  useEffect(() => {
    const fetchTaxCard = async () => {
      try {
        setLoading(true);
        const data = await taxCardService.getTaxCardById(id);
        if (!data) {
          setError('No tax card or finance act record found matching this identifier in the SLD database.');
        } else {
          setTaxCard(data);
        }
      } catch (err) {
        console.error('Failed to load tax card:', err);
        setError('Failed to load Finance Act / Tax Card record.');
      } finally {
        setLoading(false);
      }
    };
    fetchTaxCard();
  }, [id]);

  const handleCopy = () => {
    const fullText = `${taxCard?.heading || ''}\n${taxCard?.year ? `Tax Year: ${taxCard.year}` : ''}\n\n${taxCard?.detail || ''}`;
    navigator.clipboard.writeText(fullText);
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
        <p className="mt-4 text-sm font-semibold text-stone-600 dark:text-stone-400 animate-pulse">
          Retrieving Finance Act / Tax Card provision from SLD database...
        </p>
      </div>
    );
  }

  if (error || !taxCard) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center shadow-xl">
          <Landmark className="w-12 h-12 text-[#f15a24] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Record Not Found</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">{error || 'Tax Card could not be retrieved.'}</p>
          <button
            onClick={() => window.close()}
            className="px-5 py-2.5 bg-[#f15a24] text-white rounded-xl text-sm font-bold hover:bg-[#d94817] transition-all cursor-pointer"
          >
            Close Tab
          </button>
        </div>
      </div>
    );
  }

  const heading = taxCard.heading || 'Finance Act / Tax Schedule';
  const detail = taxCard.detail || '';

  return (
    <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#121316] text-stone-900 dark:text-stone-100 font-sans antialiased selection:bg-[#f15a24]/20 selection:text-[#f15a24]">
      {/* Top Floating Control Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-xs print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.close()}
              className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="Close View"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#f15a24] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                SLD
              </span>
              <div>
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400 tracking-wider uppercase block">
                  Finance Act & Tax Card Viewer
                </span>
                <span className="text-sm font-extrabold text-stone-900 dark:text-white truncate block max-w-xs sm:max-w-md">
                  {heading}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Font Size Toggle */}
            <div className="hidden sm:flex items-center border border-stone-200 dark:border-stone-700 rounded-lg p-0.5 bg-stone-50 dark:bg-stone-800">
              {fontSizes.map((sz, idx) => (
                <button
                  key={sz.label}
                  onClick={() => setFontSizeIndex(idx)}
                  className={`px-2 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                    fontSizeIndex === idx
                      ? 'bg-white dark:bg-stone-900 text-[#f15a24] shadow-xs'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                  title={`Set text size to ${sz.label}`}
                >
                  {sz.label[0]}
                </button>
              ))}
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-[#f15a24] text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-[#f15a24] transition-all cursor-pointer bg-white dark:bg-stone-800 shadow-2xs"
              title="Copy Tax Card Details"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f15a24] hover:bg-[#d94817] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Print Tax Card"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-md p-6 sm:p-12 print:border-none print:shadow-none print:p-0">
          
          {/* Header */}
          <div className="border-b border-stone-200 dark:border-stone-800 pb-6 mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 mb-3 border border-amber-200 dark:border-amber-900/50">
              <Landmark className="w-6 h-6" />
            </div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#f15a24]">Federal Board of Revenue • Annual Budget Law</p>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight leading-tight mt-1">
              {heading}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs font-semibold text-stone-600 dark:text-stone-300">
              {taxCard.year && (
                <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/40">
                  Tax Year {taxCard.year}
                </span>
              )}
              {taxCard.date && (
                <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  Dated: {taxCard.date}
                </span>
              )}
              {taxCard.taxCardId && (
                <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 font-mono">
                  Ref: #{taxCard.taxCardId}
                </span>
              )}
            </div>
          </div>

          {/* Document Body */}
          <article 
            className="prose dark:prose-invert max-w-none text-stone-800 dark:text-stone-200 font-serif leading-relaxed"
            style={{
              fontSize: fontSizes[fontSizeIndex].fontSize,
              lineHeight: fontSizes[fontSizeIndex].lineHeight
            }}
          >
            {detail ? (
              <div 
                className="word-document-content text-stone-800 dark:text-stone-200 font-serif leading-relaxed"
                style={{
                  fontSize: fontSizes[fontSizeIndex].fontSize,
                  lineHeight: fontSizes[fontSizeIndex].lineHeight
                }}
                dangerouslySetInnerHTML={{ __html: formatWordDocumentDisplay(detail) }}
              />
            ) : (
              <p className="italic text-stone-500">Official Finance Act schedules and tax rates table record.</p>
            )}

            {/* Attachment link if exists */}
            {taxCard.attachment && (
              <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-800">
                <a
                  href={taxCard.attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-[#f15a24] hover:text-white rounded-xl text-xs font-bold text-stone-800 dark:text-stone-200 transition-all shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Attached Official Schedule ({taxCard.attachmentName || 'Document'})</span>
                </a>
              </div>
            )}
          </article>

          {/* Footer Seal */}
          <footer className="mt-12 pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Official Finance Act & Tax Rates Record • SLD System Legal Archives</span>
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

export default TaxCardViewPage;
