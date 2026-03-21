const DocumentsPagination = ({ pagination, onGoToPage }) => {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between">
      <div className="text-sm text-slate-600">
        Showing page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
        total invoices)
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onGoToPage(1)}
          disabled={!pagination.hasPrevPage}
          className="px-3 py-1 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          First
        </button>
        <button
          type="button"
          onClick={() => onGoToPage(pagination.page - 1)}
          disabled={!pagination.hasPrevPage}
          className="px-3 py-1 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="px-4 py-1 rounded-md bg-emerald-100 text-emerald-700 text-sm font-medium">
          {pagination.page}
        </span>
        <button
          type="button"
          onClick={() => onGoToPage(pagination.page + 1)}
          disabled={!pagination.hasNextPage}
          className="px-3 py-1 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => onGoToPage(pagination.totalPages)}
          disabled={!pagination.hasNextPage}
          className="px-3 py-1 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Last
        </button>
      </div>
    </div>
  );
};

export default DocumentsPagination;
