import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { customTariffService } from '../features/custom-tariffs/services/customTariffService';
import Spinner from '../components/ui/Spinner';
import { 
  ArrowLeft, Printer, Layers, Copy, Check, 
  Calendar, ShieldCheck, Download, FileText, Tag, ChevronRight
} from 'lucide-react';
import { formatWordDocumentDisplay } from '../utils/wordFormatter';

const fontSizes = [
  { label: 'Standard', fontSize: '15px', lineHeight: '1.75' },
  { label: 'Comfortable', fontSize: '17px', lineHeight: '1.85' },
  { label: 'Large', fontSize: '19px', lineHeight: '1.9' },
  { label: 'Enlarged', fontSize: '21px', lineHeight: '2.0' }
];

const CustomTariffViewPage = () => {
  const { id } = useParams();
  const [tariff, setTariff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [copied, setCopied] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1);

  useEffect(() => {
    const fetchTariff = async () => {
      try {
        setLoading(true);
        const data = await customTariffService.getCustomTariffById(id);
        if (!data) {
          setError('No Customs Tariff schedule found matching this identifier in the SLD database.');
        } else {
          setTariff(data);
        }
      } catch (err) {
        console.error('Failed to load custom tariff:', err);
        setError('Failed to load Customs Tariff schedule.');
      } finally {
        setLoading(false);
      }
    };
    fetchTariff();
  }, [id]);

  const handleCopy = () => {
    const fullText = `${tariff?.heading || ''}\nSLD #: ${tariff?.sldNumber || ''}\nDated: ${tariff?.dated || ''}\nPeriod: ${tariff?.fromYear || ''} - ${tariff?.toYear || ''}\n\n${tariff?.detail || ''}`;
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
          Retrieving Pakistan Customs Tariff schedule from SLD database...
        </p>
      </div>
    );
  }

  if (error || !tariff) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center shadow-xl">
          <Layers className="w-12 h-12 text-[#f15a24] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Record Not Found</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">{error || 'Custom Tariff could not be retrieved.'}</p>
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

  const heading = tariff.heading || 'Customs Tariff Schedule';
  const detail = tariff.detail || '';
  const items = tariff.items || [];

  return (
    <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#121316] text-stone-900 dark:text-stone-100 font-sans antialiased selection:bg-[#f15a24]/20 selection:text-[#f15a24]">
      {/* Top Floating Control Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-xs print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
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
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-none truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {heading}
                </h1>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  Pakistan Customs Tariff & PCT Codes
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
              title="Copy content"
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-white dark:bg-[#1a1b1e] border border-stone-200/80 dark:border-stone-800 shadow-xl rounded-2xl p-6 sm:p-10 md:p-14">
          
          {/* Document Header */}
          <div className="border-b border-stone-200 dark:border-stone-800 pb-8 mb-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#f15a24]/10 text-[#f15a24] flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#f15a24]">Federal Customs & Tariff Schedules</p>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight leading-tight mt-1">
              {heading}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs font-semibold text-stone-600 dark:text-stone-300">
              {tariff.sldNumber && (
                <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800/40 font-mono">
                  SLD #{tariff.sldNumber}
                </span>
              )}
              {tariff.dated && (
                <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  Dated: {tariff.dated}
                </span>
              )}
              {(tariff.fromYear || tariff.toYear) && (
                <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/40">
                  Period: {tariff.fromYear} – {tariff.toYear}
                </span>
              )}
              {tariff.status && (
                <span className={`px-3 py-1 rounded-full font-bold text-[11px] ${
                  tariff.status === 'Active' 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                }`}>
                  {tariff.status}
                </span>
              )}
            </div>
          </div>

          {/* Document Narrative / Description */}
          {detail && (
            <article 
              className="prose dark:prose-invert max-w-none text-stone-800 dark:text-stone-200 font-serif leading-relaxed mb-8"
              style={{
                fontSize: fontSizes[fontSizeIndex].fontSize,
                lineHeight: fontSizes[fontSizeIndex].lineHeight
              }}
            >
              <div 
                className="word-document-content text-stone-800 dark:text-stone-200 font-serif leading-relaxed"
                style={{
                  fontSize: fontSizes[fontSizeIndex].fontSize,
                  lineHeight: fontSizes[fontSizeIndex].lineHeight
                }}
                dangerouslySetInnerHTML={{ __html: formatWordDocumentDisplay(detail) }}
              />
            </article>
          )}

          {/* Structured Tariff Items Table */}
          {items.length > 0 && (
            <div className="mt-8">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#f15a24]" />
                <span>PCT Codes & Tariff Classification Schedule ({items.length} items)</span>
              </h2>
              
              <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-stone-100 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5">PCT Code</th>
                      <th className="px-3 py-2.5">Description</th>
                      <th className="px-2 py-2.5 text-center">UOM</th>
                      <th className="px-2 py-2.5 text-center">CD</th>
                      <th className="px-2 py-2.5 text-center">AD</th>
                      <th className="px-2 py-2.5 text-center">RD</th>
                      <th className="px-2 py-2.5 text-center">Ex.STH</th>
                      <th className="px-2 py-2.5 text-center">CON</th>
                      <th className="px-2 py-2.5 text-center">ST</th>
                      <th className="px-2 py-2.5 text-center">WHT</th>
                      <th className="px-2 py-2.5 text-center">Other</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
                    {items.map((row, idx) => (
                      <React.Fragment key={row._id || idx}>
                        <tr className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors">
                          <td className="px-3 py-2 font-mono font-bold text-[#f15a24] whitespace-nowrap">
                            {row.pctCode || '—'}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {row.description || '—'}
                          </td>
                          <td className="px-2 py-2 text-center whitespace-nowrap">{row.uom || '—'}</td>
                          <td className="px-2 py-2 text-center whitespace-nowrap font-medium">{row.cd || '—'}</td>
                          <td className="px-2 py-2 text-center whitespace-nowrap">{row.ad || '—'}</td>
                          <td className="px-2 py-2 text-center whitespace-nowrap">{row.rd || '—'}</td>
                          <td className="px-2 py-2 text-center whitespace-nowrap">{row.exSth || '—'}</td>
                          <td className="px-2 py-2 text-center whitespace-nowrap">{row.con || '—'}</td>
                          <td className="px-2 py-2 text-center whitespace-nowrap">{row.st || '—'}</td>
                          <td className="px-2 py-2 text-center whitespace-nowrap">{row.wht || '—'}</td>
                          <td className="px-2 py-2 text-center whitespace-nowrap">{row.other || '—'}</td>
                        </tr>
                        {row.subDetail && (
                          <tr className="bg-stone-50/50 dark:bg-stone-900/40">
                            <td colSpan={11} className="px-4 py-1.5 text-[11px] text-stone-600 dark:text-stone-400 italic">
                              <span className="font-semibold text-stone-700 dark:text-stone-300">Sub-Detail: </span>
                              {row.subDetail}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Attachment Link */}
          {tariff.attachment && (
            <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-800 print:hidden">
              <a
                href={tariff.attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f15a24] hover:bg-[#d94817] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Attached Schedule ({tariff.attachmentName || 'Customs Tariff Schedule File'})</span>
              </a>
            </div>
          )}

          {/* Footer Seal */}
          <footer className="mt-12 pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Official Pakistan Customs Tariff Record • SLD System Legal Archives</span>
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

export default CustomTariffViewPage;
