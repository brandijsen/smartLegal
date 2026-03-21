const DocumentsBulkBar = ({
  selectedIds,
  documents,
  confirmingBulkDelete,
  bulkProcessing,
  onCancelBulkConfirm,
  onConfirmBulkDelete,
  onBulkUnmarkDefective,
  onBulkRetry,
  onStartBulkDeleteConfirm,
  onClearSelection,
}) => {
  const hasDefectiveSelected = selectedIds.some(
    (id) => documents.find((d) => d.id === id)?.is_defective === 1
  );

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <span className="text-sm font-medium text-emerald-800">
        {confirmingBulkDelete
          ? `Delete ${selectedIds.length} invoice(s)?`
          : `${selectedIds.length} invoice(s) selected`}
      </span>

      <div className="flex flex-wrap gap-2">
        {confirmingBulkDelete ? (
          <>
            <button
              type="button"
              onClick={onCancelBulkConfirm}
              className="px-4 py-2 rounded-md bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmBulkDelete}
              disabled={bulkProcessing}
              className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkProcessing ? "Deleting…" : "Delete"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onBulkUnmarkDefective}
              disabled={bulkProcessing || !hasDefectiveSelected}
              className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkProcessing ? "Processing…" : "✓ Unmark Defective"}
            </button>
            <button
              type="button"
              onClick={onBulkRetry}
              disabled={bulkProcessing}
              className="px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkProcessing ? "Processing…" : "🔁 Retry Failed"}
            </button>
            <button
              type="button"
              onClick={onStartBulkDeleteConfirm}
              disabled={bulkProcessing}
              className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗑 Delete Selected
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              className="px-4 py-2 rounded-md bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              Clear Selection
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentsBulkBar;
