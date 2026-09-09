import { useState, useEffect } from 'react';
import { FileText, Globe, ExternalLink, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { updateService } from '../../updates/services/updateService';
import { newsService } from '../../news/services/newsService';

const fallbackNews = [
  { title: 'President rejects FBR presentation against FTO order', date: 'Aug 31, 2026' },
  { title: 'IDEAS Expo Centre revenue loss: AGP settles audit para of TDAP', date: 'Aug 31, 2026' },
  { title: 'Sec 7E, Super tax under Sec 4C: FBR yet to devise mechanism for refunding taxes: Butt', date: 'Aug 31, 2026' },
  { title: 'RTO-II Karachi seals illegal cigarette factory in Malir', date: 'Aug 30, 2026' },
  { title: 'Pakistan Customs tightens EFS checks over fabric misdeclaration', date: 'Aug 30, 2026' },
  { title: 'FBR sets eligibility rules for initial allowance in Tax Year 2027', date: 'Aug 30, 2026' }
];

const fallbackUpdates = [
  { heading: 'FBR Portal System Upgrade: Digital Tax Filing Version 4.2', dated: '2026-09-08', url: 'https://iris.fbr.gov.pk' },
  { heading: 'Securities and Exchange Commission Online Services Portal Revision', dated: '2026-09-07', url: 'https://eservices.secp.gov.pk' },
  { heading: 'Sindh Revenue Board: Electronic Sales Tax Invoicing Guideline', dated: '2026-09-05', url: 'https://srb.gos.pk' },
  { heading: 'State Bank of Pakistan Foreign Exchange Manual 2026 Amendment', dated: '2026-09-02', url: 'https://sbp.org.pk' }
];

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
          updateService.getUpdates(),
          newsService.getNews()
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
    <div className="flex flex-col h-full space-y-4">
      {/* Header with Switchable Tabs */}
      <div className="flex justify-between items-center h-8 gap-2">
        <div className="flex items-center gap-1 bg-theme-surface-alt p-1 rounded-lg border border-theme-border">
          <button
            onClick={() => setActiveTab('updates')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'updates'
                ? 'bg-[#f15a24] text-white shadow-xs'
                : 'text-theme-muted hover:text-theme-main'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Manage Updates</span>
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'news'
                ? 'bg-[#f15a24] text-white shadow-xs'
                : 'text-theme-muted hover:text-theme-main'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Legal News</span>
          </button>
        </div>

        <Link 
          to={activeTab === 'updates' ? '/manage-updates' : '/news'} 
          className="px-3 py-1 border border-[#f15a24] text-[#f15a24] hover:bg-[#f15a24] hover:text-white text-xs font-semibold rounded transition-colors whitespace-nowrap"
        >
          View all
        </Link>
      </div>
      
      {/* Content Container */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl p-4 flex-1 flex flex-col shadow-sm overflow-hidden">
        <div className="space-y-0 divide-y divide-theme-border flex-1 overflow-y-auto max-h-[340px]">
          {displayedItems.slice(0, 6).map((item, idx) => {
            const title = item.heading || item.title;
            const dateStr = item.dated || item.date;
            const linkUrl = item.url;

            return (
              <div key={item.mongoId || item.id || idx} className="flex items-start gap-3 py-3 group hover:bg-theme-surface-hover/50 rounded-lg px-2 -mx-2 transition-colors">
                <div className="mt-1 shrink-0">
                  {activeTab === 'updates' ? (
                    <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-[#f15a24]">
                      <Globe className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  {linkUrl ? (
                    <a 
                      href={linkUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs sm:text-sm font-semibold text-theme-main hover:text-[#f15a24] leading-snug line-clamp-2 transition-colors flex items-start gap-1"
                    >
                      <span>{title}</span>
                      <ExternalLink className="w-3 h-3 text-[#f15a24] shrink-0 mt-0.5" />
                    </a>
                  ) : (
                    <h4 className="text-xs sm:text-sm font-semibold text-theme-main leading-snug line-clamp-2">
                      {title}
                    </h4>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-theme-muted">
                    <span>{dateStr}</span>
                    {activeTab === 'updates' && item.updateId && (
                      <span className="text-[10px] font-mono bg-theme-surface-alt px-1.5 py-0.5 rounded border border-theme-border">
                        {item.updateId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NewsFeed;
