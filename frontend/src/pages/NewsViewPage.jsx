import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { newsService } from '../features/news/services/newsService';
import Spinner from '../components/ui/Spinner';
import { 
  ArrowLeft, Printer, Newspaper, Copy, Check, 
  Calendar, ShieldCheck, Tag
} from 'lucide-react';
import { formatWordDocumentDisplay } from '../utils/wordFormatter';

const fontSizes = [
  { label: 'Standard', fontSize: '15px', lineHeight: '1.75' },
  { label: 'Comfortable', fontSize: '17px', lineHeight: '1.85' },
  { label: 'Large', fontSize: '19px', lineHeight: '1.9' },
  { label: 'Enlarged', fontSize: '21px', lineHeight: '2.0' }
];

const NewsViewPage = () => {
  const { id } = useParams();
  const [newsItem, setNewsItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [copied, setCopied] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const data = await newsService.getNewsById(id);
        if (!data) {
          setError('No news record found matching this identifier in the SLD database.');
        } else {
          setNewsItem(data);
        }
      } catch (err) {
        console.error('Failed to load news record:', err);
        setError('Failed to load legal update / news item.');
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [id]);

  const handleCopy = () => {
    const fullText = `${newsItem?.heading || ''}\n${newsItem?.date ? `Date: ${newsItem.date}` : ''}\n${newsItem?.year ? `Year: ${newsItem.year}` : ''}\n\n${newsItem?.detail || ''}`;
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
          Retrieving legal news report from SLD database...
        </p>
      </div>
    );
  }

  if (error || !newsItem) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center shadow-xl">
          <Newspaper className="w-12 h-12 text-[#f15a24] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Record Not Found</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">{error || 'News report could not be retrieved.'}</p>
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

  const heading = newsItem.heading || 'Legal & Regulatory News Update';
  const detail = newsItem.detail || '';

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
              <div className="w-8 h-8 rounded-lg bg-[#f15a24]/10 flex items-center justify-center text-[#f15a24]">
                <Newspaper className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-none truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {heading}
                </h1>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  SLD Legal & Regulatory News
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Font Size Selector */}
            <div className="hidden sm:flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs">
              {fontSizes.map((size, index) => (
                <button
                  key={size.label}
                  onClick={() => setFontSizeIndex(index)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    fontSizeIndex === index
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold transition-all cursor-pointer"
              title="Copy news content"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#f15a24] hover:bg-[#d94817] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Paper */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-white dark:bg-[#1a1b1e] border border-stone-200/80 dark:border-stone-800 shadow-xl rounded-2xl p-6 sm:p-12 md:p-16">
          
          {/* Document Header */}
          <div className="border-b border-stone-200 dark:border-stone-800 pb-8 mb-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#f15a24]/10 text-[#f15a24] flex items-center justify-center">
              <Newspaper className="w-6 h-6" />
            </div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#f15a24]">Tax & Corporate Legal Bulletins</p>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight leading-tight mt-1">
              {heading}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs font-semibold text-stone-600 dark:text-stone-300">
              {newsItem.date && (
                <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  Dated: {newsItem.date}
                </span>
              )}
              {newsItem.year && (
                <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800/40">
                  Year {newsItem.year}
                </span>
              )}
              {newsItem.srNumber && (
                <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 font-mono">
                  Sr #{newsItem.srNumber}
                </span>
              )}
              {newsItem.newsId && (
                <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 font-mono">
                  Ref: #{newsItem.newsId}
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
              <p className="italic text-stone-500">No extended commentary or detail available for this news bulletin.</p>
            )}
          </article>

          {/* Footer Seal */}
          <footer className="mt-12 pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Official News & Tax Bulletins • SLD System Legal Archives</span>
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

export default NewsViewPage;
