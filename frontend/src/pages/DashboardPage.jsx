import React from 'react';
import { BookOpen, Layers, Type, Bookmark, Scale, Calculator } from 'lucide-react';
import WarningAlert from '../features/dashboard/components/WarningAlert';
import TickerBanner from '../features/dashboard/components/TickerBanner';
import FeaturedSection from '../features/dashboard/components/FeaturedSection';
import NewsFeed from '../features/dashboard/components/NewsFeed';
import InfoWidgets from '../features/dashboard/components/InfoWidgets';
import BottomBanners from '../features/dashboard/components/BottomBanners';
import AdminFooter from '../features/dashboard/components/AdminFooter';

const REFERENCE_BUTTONS = [
  { key: 'articles', label: 'ARTICLES', count: '1,544', icon: BookOpen },
  { key: 'topics', label: 'TOPICS', count: '403', icon: Layers },
  { key: 'words-phrases', label: 'WORDS & PHRASES', count: '282', icon: Type },
  { key: 'legal-terms', label: 'LEGAL TERMS', count: '96', icon: Bookmark },
  { key: 'maxims', label: 'MAXIMS', count: '1,124', icon: Scale },
];

const DashboardPage = () => {
  const handleOpenReference = (key) => {
    window.open(`/reference/${key}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col h-full w-full animate-fade-in space-y-4 pb-4">
      {/* ── 5 Quick-Access Reference Buttons (Opens in New Tab on Click) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between overflow-x-auto scrollbar-none gap-2">
        <div className="flex items-center gap-1 sm:gap-2 w-full justify-between sm:justify-start">
          {REFERENCE_BUTTONS.map((btn, idx) => (
            <React.Fragment key={btn.key}>
              <a
                href={`/reference/${btn.key}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenReference(btn.key);
                }}
                className="group px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold tracking-wider text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap active:scale-95 border-b-2 border-transparent hover:border-emerald-600"
                title={`Open ${btn.label} Library in New Tab (${btn.count} entries)`}
              >
                <span>{btn.label}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 group-hover:bg-emerald-200 font-mono shadow-2xs">
                  {btn.count}
                </span>
              </a>
              {idx < REFERENCE_BUTTONS.length - 1 && (
                <span className="text-gray-300 dark:text-gray-600 font-light select-none hidden sm:inline">|</span>
              )}
            </React.Fragment>
          ))}

          {/* Tax Calculator Button - Shifted directly next to MAXIMS */}
          <span className="text-gray-300 dark:text-gray-600 font-light select-none hidden sm:inline">|</span>
          <a
            href="https://pakistan-tax-calculator-mmca.ai.studio/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-emerald-500/20 active:scale-95 shrink-0 border border-emerald-400/30 cursor-pointer ml-1"
            title="Open Pakistan Tax Calculator in New Tab"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
            <span className="whitespace-nowrap">Tax Calculator</span>
          </a>
        </div>
      </div>

      <TickerBanner />
      <WarningAlert />
      
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
        <div className="xl:col-span-8 flex flex-col">
          <FeaturedSection />
        </div>
        <div className="xl:col-span-4 flex flex-col">
          <NewsFeed />
        </div>
      </div>
      
      <InfoWidgets />
      <BottomBanners />
      <AdminFooter />
    </div>
  );
};

export default DashboardPage;
