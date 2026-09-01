import { ChevronLeft, ChevronRight } from 'lucide-react';

const TickerBanner = () => {
  return (
    <div className="flex items-center bg-white dark:bg-theme-surface border border-theme-border rounded-lg shadow-sm overflow-hidden h-10">
      <div 
        className="h-full bg-[#f15a24] text-white font-bold text-sm px-6 flex items-center shrink-0 relative z-10"
        style={{ clipPath: 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)', paddingRight: '20px' }}
      >
        Super Law Data System
      </div>
      
      <style>
        {`
          @keyframes ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-ticker {
            animation: ticker 25s linear infinite;
          }
          .animate-ticker:hover {
            animation-play-state: paused;
          }
        `}
      </style>

      <div className="flex-1 overflow-hidden relative flex items-center h-full">
        <div className="animate-ticker flex w-max items-center text-xs font-medium text-theme-main whitespace-nowrap flex-nowrap">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center whitespace-nowrap flex-nowrap shrink-0">
              <span className="mx-6 shrink-0">Sales Tax General Order No. 14 Of 2026, Islamabad, the 4th August, 2026</span>
              <span className="text-theme-muted font-black shrink-0">|</span>
              <span className="mx-6 shrink-0">Sales Tax General Order No. 12 Of 2026, Islamabad, the 31st July, 2026</span>
              <span className="text-theme-muted font-black shrink-0">|</span>
              <span className="mx-6 shrink-0">S.R.O. 874(I)/2026, Islamabad, the 11th May, 2026</span>
              <span className="text-theme-muted font-black shrink-0">|</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center px-2 shrink-0 border-l border-theme-border gap-1">
        <button className="p-1 text-theme-main hover:text-[#f15a24] hover:bg-theme-surface-hover rounded">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button className="p-1 text-theme-main hover:text-[#f15a24] hover:bg-theme-surface-hover rounded">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TickerBanner;
