import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { updateService } from '../../updates/services/updateService';

const fallbackTickerItems = [
  { heading: 'Sales Tax General Order No. 14 Of 2026, Islamabad, the 4th August, 2026', dated: '2026-08-04' },
  { heading: 'Sales Tax General Order No. 12 Of 2026, Islamabad, the 31st July, 2026', dated: '2026-07-31' },
  { heading: 'S.R.O. 874(I)/2026, Islamabad, the 11th May, 2026', dated: '2026-05-11' },
  { heading: 'S.R.O. 1245(I)/2026, Islamabad, the 31st July, 2026', dated: '2026-07-31' }
];

const TickerBanner = () => {
  const [tickerItems, setTickerItems] = useState(fallbackTickerItems);
  const [scrollSpeed, setScrollSpeed] = useState(25);

  useEffect(() => {
    let isMounted = true;
    const fetchLiveUpdates = async () => {
      try {
        const liveUpdates = await updateService.getUpdates();
        if (isMounted && Array.isArray(liveUpdates) && liveUpdates.length > 0) {
          setTickerItems(liveUpdates);
        }
      } catch (err) {
        console.error('[TickerBanner] Failed to fetch live updates:', err);
      }
    };
    fetchLiveUpdates();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="flex items-center bg-white dark:bg-theme-surface border border-theme-border rounded-lg shadow-sm overflow-hidden h-10">
      <Link 
        to="/manage-updates"
        className="h-full bg-[#f15a24] hover:bg-[#d94816] text-white font-bold text-sm px-6 flex items-center shrink-0 relative z-10 transition-colors cursor-pointer"
        style={{ clipPath: 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)', paddingRight: '20px' }}
        title="View all Manage Updates"
      >
        Super Law Data System
      </Link>
      
      <style>
        {`
          @keyframes ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-ticker {
            animation: ticker ${scrollSpeed}s linear infinite;
          }
          .animate-ticker:hover {
            animation-play-state: paused;
          }
        `}
      </style>

      <div className="flex-1 overflow-hidden relative flex items-center h-full">
        <div className="animate-ticker flex w-max items-center text-xs font-medium text-theme-main whitespace-nowrap flex-nowrap">
          {[...Array(3)].map((_, loopIdx) => (
            <div key={loopIdx} className="flex items-center whitespace-nowrap flex-nowrap shrink-0">
              {tickerItems.map((item, i) => (
                <span key={i} className="inline-flex items-center">
                  {item.url ? (
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="mx-6 shrink-0 hover:text-[#f15a24] hover:underline transition-colors flex items-center gap-1.5"
                    >
                      <span className="font-semibold text-[#f15a24]">⚡ UPDATE:</span> {item.heading || item.title}
                      {item.dated && <span className="text-gray-400 text-[10px]">({item.dated})</span>}
                    </a>
                  ) : (
                    <Link 
                      to="/manage-updates"
                      className="mx-6 shrink-0 hover:text-[#f15a24] transition-colors flex items-center gap-1.5"
                    >
                      <span className="font-semibold text-[#f15a24]">⚡ UPDATE:</span> {item.heading || item.title}
                      {item.dated && <span className="text-gray-400 text-[10px]">({item.dated})</span>}
                    </Link>
                  )}
                  <span className="text-theme-muted font-black shrink-0">|</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center px-2 shrink-0 border-l border-theme-border gap-1">
        <button 
          onClick={() => setScrollSpeed(s => Math.min(s + 5, 45))}
          title="Slower ticker speed"
          className="p-1 text-theme-main hover:text-[#f15a24] hover:bg-theme-surface-hover rounded cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setScrollSpeed(s => Math.max(s - 5, 12))}
          title="Faster ticker speed"
          className="p-1 text-theme-main hover:text-[#f15a24] hover:bg-theme-surface-hover rounded cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TickerBanner;
