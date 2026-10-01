import React from 'react';

/**
 * Standardized Pagination Component matching Case Law styling:
 * First | Prev | 1 ... 4 5 6 ... 100 | Next | Last
 */
export const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sortedPages = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items = [];

  sortedPages.forEach((page, index) => {
    if (index > 0 && page - sortedPages[index - 1] > 1) items.push(`ellipsis-${page}`);
    items.push(page);
  });

  return items;
};

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 25,
  onPageChange
}) => {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const startIdx = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= safeTotalPages && page !== currentPage) {
      onPageChange?.(page);
    }
  };

  return (
    <div className="px-6 py-4 border-t border-theme-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-theme-surface">
      <span className="text-sm text-theme-muted">
        Showing {startIdx} to {endIdx} of <strong className="font-semibold text-theme-main">{totalItems}</strong> entries
      </span>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1 || safeTotalPages <= 1}
          className="px-2.5 h-8 flex items-center justify-center rounded text-xs text-theme-muted border border-theme-border hover:bg-theme-surface-alt transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="First page"
        >
          First
        </button>

        <button
          type="button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || safeTotalPages <= 1}
          className="px-2.5 h-8 flex items-center justify-center rounded text-xs text-theme-muted border border-theme-border hover:bg-theme-surface-alt transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Previous page"
        >
          Prev
        </button>

        {getPaginationItems(currentPage, safeTotalPages).map((item) => (
          typeof item === 'string' ? (
            <span key={item} className="w-8 h-8 flex items-center justify-center text-sm text-theme-disabled">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => handlePageChange(item)}
              className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${
                currentPage === item
                  ? 'bg-[#641E16] text-white font-medium hover:bg-[#4A1610]'
                  : 'text-theme-muted border border-theme-border hover:bg-theme-surface-alt'
              }`}
            >
              {item}
            </button>
          )
        ))}

        <button
          type="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === safeTotalPages || safeTotalPages <= 1}
          className="px-2.5 h-8 flex items-center justify-center rounded text-xs text-theme-muted border border-theme-border hover:bg-theme-surface-alt transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Next page"
        >
          Next
        </button>

        <button
          type="button"
          onClick={() => handlePageChange(safeTotalPages)}
          disabled={currentPage === safeTotalPages || safeTotalPages <= 1}
          className="px-2.5 h-8 flex items-center justify-center rounded text-xs text-theme-muted border border-theme-border hover:bg-theme-surface-alt transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Last page"
        >
          Last
        </button>
      </div>
    </div>
  );
};

export default Pagination;
