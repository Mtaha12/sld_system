import { useState } from 'react';
import { ArrowUpDown, Calendar, Paperclip, Eye, Pencil, Trash2 } from 'lucide-react';
import { MOCK_CASES } from '../data/casesMockData';

const TableHeader = ({ title }) => (
  <th className="px-2 py-3 font-semibold text-theme-main align-top">
    <div className="flex items-start gap-1">
      {title === 'Month' && <Calendar className="w-3.5 h-3.5 text-theme-disabled shrink-0 mt-0.5" />}
      <span className="leading-tight">{title}</span>
      <ArrowUpDown className="w-3.5 h-3.5 text-theme-disabled shrink-0 cursor-pointer hover:text-brand-orange mt-0.5" />
    </div>
  </th>
);

const ManageCasesTable = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalItems = MOCK_CASES.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const currentData = MOCK_CASES.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startIdx = (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="flex flex-col mb-8 animate-fade-in">
      <div className="flex justify-end mb-3">
        <span className="text-sm font-semibold text-[#641E16]">Total Records: {totalItems}</span>
      </div>

      <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left table-auto">
            <thead className="bg-theme-table-header border-b border-theme-border text-theme-main">
              <tr>
                <th className="px-2 py-3 w-8 text-center">
                  <input type="checkbox" className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange" />
                </th>
                <TableHeader title="SLD #" />
                <TableHeader title="Dated" />
                <TableHeader title="Map / Year / Page" />
                <TableHeader title="Month" />
                <TableHeader title="Court" />
                <TableHeader title="Case #" />
                <TableHeader title="Judges" />
                <TableHeader title="Lawyers" />
                <TableHeader title="Petitioners" />
                <th className="px-2 py-3 font-semibold text-theme-main align-top">Attachment</th>
                <th className="px-2 py-3 font-semibold text-theme-main align-top">Status</th>
                <th className="px-2 py-3 font-semibold text-theme-main align-top">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/50">
              {currentData.map((item) => (
                <tr key={item.id} className="hover:bg-theme-surface-alt/50 transition-colors">
                  <td className="px-2 py-4 align-top text-center">
                    <input type="checkbox" className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange mt-1" />
                  </td>
                  <td className="px-2 py-4 align-top text-theme-muted break-words">{item.sldNumber}</td>
                  <td className="px-2 py-4 align-top text-theme-muted">{item.dated}</td>
                  <td className="px-2 py-4 align-top text-theme-muted">
                    <div className="flex flex-col gap-1">
                      {item.mapYearPage.map((line, i) => <span key={i}>{line}</span>)}
                    </div>
                  </td>
                  <td className="px-2 py-4 align-top text-theme-muted">{item.month}</td>
                  <td className="px-2 py-4 align-top text-theme-main font-medium">{item.court}</td>
                  <td className="px-2 py-4 align-top text-theme-muted">
                    <div className="flex flex-col gap-1">
                      {item.caseNumber.map((line, i) => <span key={i}>{line}</span>)}
                    </div>
                  </td>
                  <td className="px-2 py-4 align-top text-theme-muted">
                    <div className="flex flex-col gap-1">
                      {item.judges.map((line, i) => <span key={i}>{line}</span>)}
                    </div>
                  </td>
                  <td className="px-2 py-4 align-top text-theme-muted">
                    <div className="flex flex-col gap-1">
                      {item.lawyers.map((line, i) => <span key={i}>{line}</span>)}
                      {item.lawyersMore && <span className="text-brand-orange font-medium mt-1">{item.lawyersMore}</span>}
                    </div>
                  </td>
                  <td className="px-2 py-4 align-top text-theme-muted">
                    <div className="flex flex-col gap-1">
                      {item.petitioners.map((line, i) => <span key={i}>{line}</span>)}
                      {item.petitionersMore && <span className="text-brand-orange font-medium mt-1">{item.petitionersMore}</span>}
                    </div>
                  </td>
                  <td className="px-2 py-4 align-top">
                    <div className="flex items-center gap-1 text-theme-muted cursor-pointer hover:text-brand-orange transition-colors">
                      <Paperclip className="w-4 h-4 text-[#641E16] shrink-0" />
                      <span className="text-brand-orange font-medium">({item.attachments})</span>
                    </div>
                  </td>
                  <td className="px-2 py-4 align-top">
                    <span className="inline-flex items-center justify-center px-2 py-1 bg-green-50 text-green-700 font-medium rounded text-[10px] border border-green-200">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-2 py-4 align-top">
                    <div className="flex items-center gap-1">
                      <button className="p-1 text-theme-muted hover:text-brand-orange border border-theme-border rounded hover:bg-orange-50 transition-colors" title="View">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1 text-theme-muted hover:text-blue-600 border border-theme-border rounded hover:bg-blue-500/20 transition-colors" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1 text-theme-muted hover:text-red-600 border border-theme-border rounded hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-theme-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-theme-surface">
          <span className="text-sm text-theme-muted">Showing {startIdx} to {endIdx} of <strong className="font-semibold text-theme-main">{totalItems}</strong> entries</span>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const page = idx + 1;
              return (
                <button 
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${
                    currentPage === page 
                      ? 'bg-[#641E16] text-white font-medium hover:bg-[#4A1610]' 
                      : 'text-theme-muted border border-theme-border hover:bg-theme-surface-alt'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 h-8 flex items-center justify-center rounded text-sm text-theme-muted border border-theme-border hover:bg-theme-surface-alt transition-colors gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageCasesTable;
