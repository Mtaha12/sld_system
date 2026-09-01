import { Search, Eye } from 'lucide-react';
import { useState } from 'react';

const newsData = [
  { id: 1, date: '2026-08-31', heading: 'Sec 7E, Super tax under Sec 4C: FBR yet to devise mechanism for refunding taxes: Butt' },
  { id: 2, date: '2026-08-31', heading: 'IDEAS Expo Centre revenue loss: AGP settles audit para of TDAP' },
  { id: 3, date: '2026-08-31', heading: 'President rejects FBR presentation against FTO order' },
  { id: 4, date: '2026-08-31', heading: 'FBR explains amortisation deductions for intangibles in Tax Year 2027' },
  { id: 5, date: '2026-08-31', heading: 'FBR explains tax deduction for scientific research in Tax Year 2027' },
  { id: 6, date: '2026-08-31', heading: 'FBR allows employee training tax deductions for Tax Year 2027' },
  { id: 7, date: '2026-08-31', heading: 'Indus Motor crosses Rs1 trillion in cumulative tax contributions' },
  { id: 8, date: '2026-08-30', heading: 'RTO Hyderabad intercepts poultry feed over missing digital invoice' },
  { id: 9, date: '2026-08-30', heading: 'FBR lists business expenses not deductible for Tax Year 2027' },
  { id: 10, date: '2026-08-30', heading: 'FBR sets depreciation rules for Tax Year 2027' },
  { id: 11, date: '2026-08-30', heading: 'FBR sets eligibility rules for initial allowance in Tax Year 2027' },
  { id: 12, date: '2026-08-30', heading: 'Pakistan Customs tightens EFS checks over fabric misdeclaration' },
  { id: 13, date: '2026-08-30', heading: 'RTO-II Karachi seals illegal cigarette factory in Malir' },
];

const NewsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredNews = newsData.filter(item => 
    item.heading.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-6 pb-12 w-full">
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Search Bar Area */}
        <div className="p-5 border-b border-theme-border bg-gray-50/50 dark:bg-black/10 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search news..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-theme-border rounded-lg leading-5 bg-white dark:bg-theme-surface placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f15a24] focus:border-[#f15a24] transition-colors sm:text-sm text-theme-main"
            />
          </div>
          <button className="w-full sm:w-auto px-6 py-2.5 bg-[#f15a24] text-white font-semibold rounded-lg shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f15a24] transition-colors flex items-center justify-center">
            Search
          </button>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-theme-surface-hover border-b border-theme-border text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                <th className="px-6 py-4 w-20 text-center">Sr #</th>
                <th className="px-6 py-4 w-32">Date</th>
                <th className="px-6 py-4">Heading</th>
                <th className="px-6 py-4 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-theme-border">
              {filteredNews.length > 0 ? (
                filteredNews.map((news, index) => (
                  <tr key={news.id} className="hover:bg-gray-50/80 dark:hover:bg-theme-surface-hover/50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-300 text-center">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {news.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200 font-medium">
                      {news.heading}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 transition-colors">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      <p>No news found matching your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default NewsPage;
