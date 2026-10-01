import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Globe, 
  ExternalLink, 
  ArrowRight, 
  Calendar, 
  Radio, 
  Newspaper,
  ChevronRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { updateService } from '../../updates/services/updateService';
import { newsService } from '../../news/services/newsService';

const fallbackNews = [
  { title: 'President rejects FBR presentation against FTO order', date: 'Aug 31, 2026', source: 'FBR' },
  { title: 'IDEAS Expo Centre revenue loss: AGP settles audit para of TDAP', date: 'Aug 31, 2026', source: 'Audit' },
  { title: 'Sec 7E, Super tax under Sec 4C: FBR yet to devise mechanism for refunding taxes: Butt', date: 'Aug 31, 2026', source: 'Taxation' },
  { title: 'RTO-II Karachi seals illegal cigarette factory in Malir', date: 'Aug 30, 2026', source: 'Customs' },
  { title: 'Pakistan Customs tightens EFS checks over fabric misdeclaration', date: 'Aug 30, 2026', source: 'Customs' },
  { title: 'FBR sets eligibility rules for initial allowance in Tax Year 2027', date: 'Aug 30, 2026', source: 'FBR' }
];

const fallbackUpdates = [
  { heading: 'FBR Portal System Upgrade: Digital Tax Filing Version 4.2', dated: '2026-09-08', url: 'https://iris.fbr.gov.pk', tag: 'FBR IRIS' },
  { heading: 'Securities and Exchange Commission Online Services Portal Revision', dated: '2026-09-07', url: 'https://eservices.secp.gov.pk', tag: 'SECP' },
  { heading: 'Sindh Revenue Board: Electronic Sales Tax Invoicing Guideline', dated: '2026-09-05', url: 'https://srb.gos.pk', tag: 'SRB' },
  { heading: 'State Bank of Pakistan Foreign Exchange Manual 2026 Amendment', dated: '2026-09-02', url: 'https://sbp.org.pk', tag: 'SBP' },
  { heading: 'Federal Board of Revenue: SRO on Sales Tax Withholding Procedures', dated: '2026-08-28', url: 'https://fbr.gov.pk', tag: 'FBR SRO' },
  { heading: 'Punjab Revenue Authority: Advisory on Inter-Provincial Services Tax', dated: '2026-08-24', url: 'https://pra.punjab.gov.pk', tag: 'PRA' }
];

const detectTag = (title = '') => {
  const upper = title.toUpperCase();
  if (upper.includes('FBR') || upper.includes('IRIS')) return 'FBR';
  if (upper.includes('SECP')) return 'SECP';
  if (upper.includes('SRB')) return 'SRB';
  if (upper.includes('SBP') || upper.includes('BANK')) return 'SBP';
  if (upper.includes('PRA')) return 'PRA';
  if (upper.includes('CUSTOM')) return 'Customs';
  if (upper.includes('COURT') || upper.includes('ORDER')) return 'Judicial';
  return 'Gazette';
};

const NewsFeed = () => {
  const [activeTab, setActiveTab] = useState('updates'); // 'updates' | 'news'
  const [updatesList, setUpdatesList] = useState([]);
  const [newsList, setNewsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchFeeds = async () => {
      try {
        const [liveUpdates, liveNews] = await Promise.allSettled([
          updateService.getUpdates({ limit: 10 }),
          newsService.getNews({ limit: 10 })
        ]);
        if (!isMounted) return;
        if (liveUpdates.status === 'fulfilled' && Array.isArray(liveUpdates.value) && liveUpdates.value.length > 0) {
          setUpdatesList(liveUpdates.value);
        }
        if (liveNews.status === 'fulfilled' && Array.isArray(liveNews.value) && liveNews.value.length > 0) {
          setNewsList(liveNews.value);
        }
      } catch (err) {
        console.error('[NewsFeed] Failed to load feeds:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchFeeds();
    return () => { isMounted = false; };
  }, []);

  const displayedItems = activeTab === 'updates'
    ? (updatesList.length > 0 ? updatesList : fallbackUpdates)
    : (newsList.length > 0 ? newsList : fallbackNews);

  return (
    <div className="flex flex-col h-full space-y-3">
      
      {/* Top Header with Switcher Tabs & View All */}
      <div className="flex justify-between items-center gap-2 shrink-0">
        <div className="inline-flex p-1 bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('updates')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'updates'
                ? 'bg-brand-orange text-white shadow-sm'
                : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Manage Updates</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'updates'
                ? 'bg-white/20 text-white'
                : 'bg-theme-surface-alt text-theme-muted'
            }`}>
              {updatesList.length > 0 ? updatesList.length : fallbackUpdates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('news')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'news'
                ? 'bg-brand-orange text-white shadow-sm'
                : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Legal News</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'news'
                ? 'bg-white/20 text-white'
                : 'bg-theme-surface-alt text-theme-muted'
            }`}>
              {newsList.length > 0 ? newsList.length : fallbackNews.length}
            </span>
          </button>
        </div>

        <Link 
          to={activeTab === 'updates' ? '/manage-updates' : '/news'} 
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-orange/40 hover:border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white text-xs font-medium transition-all group shrink-0"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Main Card Container */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-2xl flex-1 flex flex-col shadow-sm overflow-hidden transition-all">
        
        {/* Sub-header Bar */}
        <div className="px-4 py-2.5 border-b border-theme-border/60 bg-gray-50/70 dark:bg-theme-surface-alt/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-theme-main font-semibold">
            {activeTab === 'updates' ? (
              <>
                <Globe className="w-3.5 h-3.5 text-brand-orange" />
                <span>Regulatory Portal Releases</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>Latest Tax & Legal News</span>
              </>
            )}
          </div>
          <span className="text-[11px] text-theme-muted">
            Latest {displayedItems.length} records
          </span>
        </div>

        {/* Scrollable Feed List (No horizontal scroll, sleek vertical scroll) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar divide-y divide-theme-border/50 p-2 space-y-1">
          {displayedItems.map((item, idx) => {
            const title = item.heading || item.title;
            const dateStr = item.dated || item.date;
            const linkUrl = item.url;
            const tag = item.tag || item.source || detectTag(title);

            return (
              <div 
                key={item.mongoId || item.id || idx} 
                className="group relative flex items-start gap-3 p-2.5 rounded-xl hover:bg-theme-surface-hover/80 dark:hover:bg-theme-surface-hover transition-all cursor-pointer"
              >
                {/* Icon Badge */}
                <div className="mt-0.5 shrink-0">
                  {activeTab === 'updates' ? (
                    <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/50 dark:border-orange-800/40 flex items-center justify-center text-brand-orange group-hover:scale-105 group-hover:bg-brand-orange group-hover:text-white transition-all shadow-2xs">
                      <Globe className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                      <Newspaper className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Content & Metadata */}
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  {linkUrl ? (
                    <a 
                      href={linkUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs sm:text-[13px] font-semibold text-theme-main group-hover:text-brand-orange leading-snug line-clamp-2 transition-colors flex items-start gap-1"
                    >
                      <span className="flex-1">{title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-theme-disabled group-hover:text-brand-orange shrink-0 mt-0.5 transition-colors" />
                    </a>
                  ) : (
                    <h4 className="text-xs sm:text-[13px] font-semibold text-theme-main group-hover:text-brand-orange leading-snug line-clamp-2 transition-colors">
                      {title}
                    </h4>
                  )}

                  <div className="flex items-center flex-wrap gap-2 text-[11px] text-theme-muted mt-0.5">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-theme-disabled" />
                      {dateStr}
                    </span>

                    {tag && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-theme-surface-alt text-theme-main border border-theme-border/60">
                        {tag}
                      </span>
                    )}

                    {activeTab === 'updates' && item.updateId && (
                      <span className="text-[10px] font-mono text-theme-muted">
                        #{item.updateId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtle right chevron on hover */}
                <div className="self-center pl-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-4 h-4 text-brand-orange" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Card Footer Status Bar */}
        <div className="px-4 py-2.5 border-t border-theme-border/60 bg-gray-50/60 dark:bg-theme-surface-alt/30 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] text-theme-muted font-medium">
              Live Feed • Official Portals
            </span>
          </div>

          <Link
            to={activeTab === 'updates' ? '/manage-updates' : '/news'}
            className="text-[11px] font-bold text-brand-orange hover:text-[#d44e35] flex items-center gap-1 transition-colors"
          >
            <span>Explore all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

    </div>
  );
};

export default NewsFeed;
