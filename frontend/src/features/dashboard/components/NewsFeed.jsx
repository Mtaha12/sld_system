import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const newsItems = [
  {
    title: 'President rejects FBR presentation against FTO order',
    date: 'Aug 31, 2026'
  },
  {
    title: 'IDEAS Expo Centre revenue loss: AGP settles audit para of TDAP',
    date: 'Aug 31, 2026'
  },
  {
    title: 'Sec 7E, Super tax under Sec 4C: FBR yet to devise mechanism for refunding taxes: Butt',
    date: 'Aug 31, 2026'
  },
  {
    title: 'RTO-II Karachi seals illegal cigarette factory in Malir',
    date: 'Aug 30, 2026'
  },
  {
    title: 'Pakistan Customs tightens EFS checks over fabric misdeclaration',
    date: 'Aug 30, 2026'
  },
  {
    title: 'FBR sets eligibility rules for initial allowance in Tax Year 2027',
    date: 'Aug 30, 2026'
  }
];

const NewsFeed = () => {
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center h-8">
        <h2 className="text-xl font-bold text-theme-main">News Feed</h2>
        <Link to="/news" className="px-3 py-1 border border-[#f15a24] text-[#f15a24] text-xs font-semibold rounded hover:bg-[#f15a24] hover:text-white transition-colors">
          View all
        </Link>
      </div>
      
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl p-4 flex-1 flex flex-col shadow-sm">
        <div className="space-y-0">
          {newsItems.map((item, idx) => (
            <div key={idx} className={`flex items-start gap-4 py-4 ${idx !== newsItems.length - 1 ? 'border-b border-theme-border' : ''}`}>
              <div className="mt-0.5">
                <FileText className="w-5 h-5 text-[#f15a24]" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-medium text-theme-main leading-snug">{item.title}</h4>
                <span className="text-xs text-theme-muted">{item.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsFeed;
