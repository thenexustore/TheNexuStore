interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="mt-8 flex justify-center">
      <nav className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-full px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          Previous
        </button>

        {getPageNumbers().map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`rounded-full px-4 py-2 text-sm ${
              currentPage === pageNum
                ? "bg-[#0B123A] text-white"
                : "hover:bg-gray-100"
            }`}
          >
            {pageNum}
          </button>
        ))}

        {totalPages > maxVisiblePages && currentPage < totalPages - 2 && (
          <>
            <span className="px-2 py-2">...</span>
            <button
              onClick={() => onPageChange(totalPages)}
              className="rounded-full px-4 py-2 text-sm hover:bg-gray-100"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-full px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          Next
        </button>
      </nav>
    </div>
  );
}
