import { useState } from 'react';
import { ArrowUpDown, Pencil, Trash2, Menu } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../data/notificationsMockData';

const TableHeader = ({ title }) => (
  <th className="px-3 py-3 font-semibold text-theme-main align-top">
    <div className="flex items-start gap-1">
      <span className="leading-tight">{title}</span>
      {title !== 'Action' && title !== 'Status' && (
        <ArrowUpDown className="w-3.5 h-3.5 text-theme-disabled shrink-0 cursor-pointer hover:text-brand-orange mt-0.5" />
      )}
    </div>
  </th>
);

const ManageNotificationsTable = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalItems = MOCK_NOTIFICATIONS.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const currentData = MOCK_NOTIFICATIONS.slice(
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
        <span className="text-sm font-semibold text-[#641E16]">Total Records: (11,637)</span>
      </div>

      <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left table-auto">
            <thead className="bg-theme-table-header border-b border-theme-border whitespace-nowrap text-theme-main">
              <tr>
                <TableHeader title="Sr #" />
                <TableHeader title="Number" />
                <TableHeader title="Year" />
                <TableHeader title="Department" />
                <TableHeader title="SRO #" />
                <TableHeader title="Subject" />
                <TableHeader title="Law Date" />
                <TableHeader title="Law/Statute" />
                <TableHeader title="Section" />
                <TableHeader title="Status" />
                <th className="px-3 py-3 font-semibold text-theme-main align-top text-center w-12">
                  <Menu className="w-4 h-4 text-theme-main mx-auto" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/50">
              {currentData.map((item) => (
                <tr key={item.id} className="hover:bg-theme-surface-alt/50 transition-colors">
                  <td className="px-3 py-4 align-top text-theme-muted">{item.srNumber}</td>
                  <td className="px-3 py-4 align-top text-theme-muted">{item.number}</td>
                  <td className="px-3 py-4 align-top text-theme-muted">{item.year}</td>
                  <td className="px-3 py-4 align-top text-theme-muted">{item.department}</td>
                  <td className="px-3 py-4 align-top text-theme-main font-medium min-w-[200px]">{item.sroNumber}</td>
                  <td className="px-3 py-4 align-top text-theme-muted min-w-[300px]">{item.subject}</td>
                  <td className="px-3 py-4 align-top text-theme-muted">{item.lawDate || '-'}</td>
                  <td className="px-3 py-4 align-top text-theme-muted">{item.lawStatute || '-'}</td>
                  <td className="px-3 py-4 align-top text-theme-muted">{item.section || '-'}</td>
                  <td className="px-3 py-4 align-top">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 font-medium rounded text-[10px] border ${
                      item.status === 'Active' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-theme-surface-alt text-theme-main border-theme-border'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-4 align-top text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button className="p-1.5 text-blue-500 hover:text-white border border-blue-200 rounded bg-blue-500/20 hover:bg-blue-500 transition-colors" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 text-red-500 hover:text-white border border-red-200 rounded bg-red-50 hover:bg-red-500 transition-colors" title="Delete">
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

export default ManageNotificationsTable;
