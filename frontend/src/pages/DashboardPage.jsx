import React, { useState, useEffect } from 'react';
import { BookOpen, Layers, Type, Bookmark, Scale, Calculator, Lock } from 'lucide-react';
import WarningAlert from '../features/dashboard/components/WarningAlert';
import TickerBanner from '../features/dashboard/components/TickerBanner';
import FeaturedSection from '../features/dashboard/components/FeaturedSection';
import NewsFeed from '../features/dashboard/components/NewsFeed';
import InfoWidgets from '../features/dashboard/components/InfoWidgets';
import BottomBanners from '../features/dashboard/components/BottomBanners';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import { dashboardService } from '../services/dashboardService';
import { usePublicPreview } from '../layouts/PublicDashboardLayout';

const REFERENCE_BUTTONS = [
  { key: 'articles', label: 'ARTICLES', count: '1,544', icon: BookOpen },
  { key: 'topics', label: 'TOPICS', count: '403', icon: Layers },
  { key: 'words-phrases', label: 'WORDS & PHRASES', count: '282', icon: Type },
  { key: 'legal-terms', label: 'LEGAL TERMS', count: '96', icon: Bookmark },
  { key: 'maxims', label: 'MAXIMS', count: '1,124', icon: Scale },
];

const DashboardPage = ({ isPublic = false }) => {
  const [summaryData, setSummaryData] = useState(null);
  const publicPreview = usePublicPreview();

  useEffect(() => {
    let isMounted = true;
    const loadSummary = async () => {
      try {
        const data = isPublic
          ? await dashboardService.getPublicSummary()
          : await dashboardService.getAuthenticatedSummary();
        if (isMounted && data) {
          setSummaryData(data);
        }
      } catch (err) {
        console.warn('[DashboardPage] Failed to load summary:', err);
      }
    };
    loadSummary();
    return () => { isMounted = false; };
  }, [isPublic]);

  const handleOpenReference = (key) => {
    window.open(`/reference/${key}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col h-full w-full animate-fade-in space-y-4 pb-4">
      {/* ── 5 Quick-Access Reference / Maxim Bar + Tax Calculator (Locked Preview on Public Dashboard) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 px-2.5 sm:px-3 py-1.5 flex items-center justify-between overflow-x-auto scrollbar-none gap-1.5">
        <div className="flex items-center gap-1 sm:gap-1.5 w-full justify-between xl:justify-start">
          {REFERENCE_BUTTONS.map((btn, idx) => (
            <React.Fragment key={btn.key}>
              {isPublic ? (
                <button
                  type="button"
                  onClick={() => publicPreview?.triggerFeaturePreview(`${btn.label} (${btn.count})`)}
                  className="group px-2 sm:px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-wide text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95 border-b-2 border-transparent hover:border-emerald-600 shrink-0"
                  title={`${btn.label} (${btn.count} entries) — Available after subscription`}
                >
                  <span>{btn.label}</span>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 group-hover:bg-emerald-200 font-mono shadow-2xs">
                    {btn.count}
                  </span>
                  <Lock className="w-3 h-3 text-emerald-700/75 dark:text-emerald-300/80 shrink-0" aria-hidden="true" />
                </button>
              ) : (
                <a
                  href={`/reference/${btn.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    handleOpenReference(btn.key);
                  }}
                  className="group px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95 border-b-2 border-transparent hover:border-emerald-600 shrink-0"
                  title={`Open ${btn.label} Library in New Tab (${btn.count} entries)`}
                >
                  <span>{btn.label}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 group-hover:bg-emerald-200 font-mono shadow-2xs">
                    {btn.count}
                  </span>
                </a>
              )}
              {idx < REFERENCE_BUTTONS.length - 1 && (
                <span className="text-gray-300 dark:text-gray-600 font-light select-none hidden sm:inline shrink-0">|</span>
              )}
            </React.Fragment>
          ))}

          {/* Tax Calculator Button - Shifted directly next to MAXIMS */}
          <span className="text-gray-300 dark:text-gray-600 font-light select-none hidden sm:inline shrink-0">|</span>
          {isPublic ? (
            <button
              type="button"
              onClick={() => publicPreview?.triggerFeaturePreview('Tax Calculator')}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-emerald-500/20 active:scale-95 shrink-0 border border-emerald-400/30 cursor-pointer ml-0.5"
              title="Tax Calculator — Available after subscription"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
              <span className="whitespace-nowrap">Tax Calculator</span>
              <Lock className="w-3 h-3 text-emerald-100/90 shrink-0" aria-hidden="true" />
            </button>
          ) : (
            <a
              href="https://pakistan-tax-calculator-mmca.ai.studio/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-emerald-500/20 active:scale-95 shrink-0 border border-emerald-400/30 cursor-pointer ml-0.5"
              title="Open Pakistan Tax Calculator in New Tab"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
              <span className="whitespace-nowrap">Tax Calculator</span>
            </a>
          )}
        </div>
      </div>

      <TickerBanner updatesData={summaryData ? summaryData.updates : null} isPublic={isPublic} />
      <WarningAlert />
      
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
        <div className="xl:col-span-8 flex flex-col">
          <FeaturedSection summaryData={summaryData} isPublic={isPublic} />
        </div>
        <div className="xl:col-span-4 flex flex-col">
          <NewsFeed summaryData={summaryData} isPublic={isPublic} />
        </div>
      </div>
      
      <InfoWidgets summaryData={summaryData} isPublic={isPublic} />
      <BottomBanners />
      <AdminFooter />
    </div>
  );
};

export default DashboardPage;
