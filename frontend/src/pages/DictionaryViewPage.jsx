import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dictionaryService } from '../features/dictionary/services/dictionaryService';
import Spinner from '../components/ui/Spinner';
import { 
  ArrowLeft, Printer, BookOpen, Copy, Check, 
  Bookmark, ShieldCheck
} from 'lucide-react';
import { formatWordDocumentDisplay } from '../utils/wordFormatter';

const fontSizes = [
  { label: 'Standard', fontSize: '15px', lineHeight: '1.75' },
  { label: 'Comfortable', fontSize: '17px', lineHeight: '1.85' },
  { label: 'Large', fontSize: '19px', lineHeight: '1.9' },
  { label: 'Enlarged', fontSize: '21px', lineHeight: '2.0' }
];

const DictionaryViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [copied, setCopied] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1);

  useEffect(() => {
    const fetchEntry = async () => {
      try {
        setLoading(true);
        const data = await dictionaryService.getDictionaryById(id);
        if (!data) {
          setError('No dictionary entry found matching this term in the SLD database.');
        } else {
          setEntry(data);
        }
      } catch (err) {
        console.error('Failed to load dictionary entry:', err);
        setError('Failed to load legal glossary record.');
      } finally {
        setLoading(false);
      }
    };
    fetchEntry();
  }, [id]);

  const handleCopy = () => {
    const fullText = `${entry?.words || ''}\n\n${entry?.meaning || ''}`;
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
          Retrieving legal definition from SLD dictionary...
        </p>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center shadow-xl">
          <BookOpen className="w-12 h-12 text-[#f15a24] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Definition Not Found</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">{error || 'Glossary term could not be retrieved.'}</p>
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

  const word = entry.words || 'Legal Term';
  const meaning = entry.meaning || '';

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
                  Legal Dictionary & Glossary
                </span>
                <span className="text-sm font-extrabold text-stone-900 dark:text-white truncate block max-w-xs sm:max-w-md">
                  {word}
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
              title="Copy Definition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f15a24] hover:bg-[#d94817] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Print Definition"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Content Area */}
      <main className="print-document max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-md p-6 sm:p-12 print:border-none print:shadow-none print:p-0">
          
          {/* Header */}
          <div className="border-b border-stone-200 dark:border-stone-800 pb-6 mb-8">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#f15a24] mb-2">
              <Bookmark className="w-4 h-4" />
              <span>SLD Judicial & Statutory Glossary</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-stone-100 tracking-tight leading-tight">
              {word}
            </h1>
            <div className="flex items-center gap-3 mt-3 text-xs text-stone-500 dark:text-stone-400">
              {entry.dictionaryId && <span className="font-mono">Ref: #{entry.dictionaryId}</span>}
              {entry.srNumber && <span>Entry #{entry.srNumber}</span>}
            </div>
          </div>

          {/* Definition Body */}
          <article 
            className="prose dark:prose-invert max-w-none text-stone-800 dark:text-stone-200 font-serif leading-relaxed"
            style={{
              fontSize: fontSizes[fontSizeIndex].fontSize,
              lineHeight: fontSizes[fontSizeIndex].lineHeight
            }}
          >
            <div className="p-6 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200/80 dark:border-stone-800 mb-6">
              <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
                Legal Definition & Judicial Application
              </h3>
              <div 
                className="word-document-content text-stone-800 dark:text-stone-200 font-serif leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatWordDocumentDisplay(meaning) }}
              />
            </div>
          </article>

          {/* Footer Seal */}
          <footer className="mt-12 pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>SLD Comprehensive Legal Dictionary • Certified Definition</span>
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

export default DictionaryViewPage;
