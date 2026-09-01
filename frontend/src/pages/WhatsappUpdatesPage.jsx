import { Search, Eye } from 'lucide-react';
import { useState } from 'react';

const whatsappData = [
  { id: 1, date: '2026-06-17', heading: '1. Overview of the evolution of corporate law in Pakistan by Mr. Rahat Aziz' },
  { id: 2, date: '2026-06-17', heading: '2. Ultimate Beneficial Ownership (UBO) requirements by Mr. Kashif Mahmood (SECP)' },
  { id: 3, date: '2026-06-17', heading: 'Anomalies & Recommendations By Razi Ahsan dt 17th June 2026' },
  { id: 4, date: '2026-06-17', heading: '3. Conversion of physical shares into book-entry form by Mr. Farooq Ahmed (CDC)' },
  { id: 5, date: '2026-06-17', heading: 'News Updates, June 17, 2026' },
  { id: 6, date: '2026-06-17', heading: 'Punjab Finance Bill, 2026' },
  { id: 7, date: '2026-06-17', heading: 'RITBA - Request to Member Legal CIR Appeals acting charge' },
  { id: 8, date: '2026-06-17', heading: 'Shifa Tameer e Millat ITA No. 790-IB-2026' },
  { id: 9, date: '2026-06-17', heading: 'Tax Newsletter 17.06.2026' },
  { id: 10, date: '2026-06-16', heading: 'Al Ghani Traders ATIR -- ITA NP. 268-IB-2025' },
  { id: 11, date: '2026-06-16', heading: 'ATIR Aslam Khan (Final) MA(Con)-Section 218(1)(d) not valid service --ITA No.271-IB-2025' },
  { id: 12, date: '2026-06-16', heading: 'E-Taxation - 16.06.2026' },
];

const WhatsappUpdatesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUpdates = whatsappData.filter(item => 
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
              placeholder="Search something..."
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
          <table className="min-w-full divide-y divide-gray-200 dark:divide-theme-border table-fixed">
            <thead className="bg-gray-50 dark:bg-black/20">
              <tr>
                <th scope="col" className="w-[80px] px-6 py-4 text-left text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Sr #
                </th>
                <th scope="col" className="w-[140px] px-6 py-4 text-left text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Heading
                </th>
                <th scope="col" className="w-[140px] px-6 py-4 text-left text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Attachment
                </th>
                <th scope="col" className="w-[120px] px-6 py-4 text-left text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-theme-surface divide-y divide-gray-200 dark:divide-theme-border">
              {filteredUpdates.length > 0 ? (
                filteredUpdates.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-theme-surface-hover transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {item.heading}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <button className="px-3 py-1.5 bg-[#f15a24] text-white text-xs font-medium rounded hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f15a24]">
                        Click to view
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap font-medium">
                      <button className="text-gray-500 hover:text-[#f15a24] transition-colors flex items-center gap-1.5 focus:outline-none">
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No WhatsApp updates found matching your search.
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

export default WhatsappUpdatesPage;
