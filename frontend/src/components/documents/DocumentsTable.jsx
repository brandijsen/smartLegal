import { Link } from "react-router-dom";
import { FiXCircle, FiAlertTriangle } from "react-icons/fi";
import { hasRedFlags } from "../../utils/redFlagChecker";
import { DOCUMENT_STATUS_META } from "./documentStatusMeta.jsx";

const DocumentsTable = ({
  documents,
  selectedIds,
  confirmingDeleteId,
  bulkProcessing,
  retryingId,
  onToggleSelect,
  onToggleSelectAll,
  onRetry,
  onConfirmDelete,
  onCancelDelete,
  onPerformDelete,
}) => {
  const allSelected =
    selectedIds.length === documents.length && documents.length > 0;

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="px-6 py-4 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </th>
            <th className="text-left px-6 py-4 font-medium">File</th>
            <th className="text-left px-6 py-4 font-medium">Uploaded</th>
            <th className="text-left px-6 py-4 font-medium">Status</th>
            <th className="text-left px-6 py-4 font-medium">Supplier</th>
            <th className="text-left px-6 py-4 font-medium">Badges</th>
            <th className="text-left px-6 py-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const meta =
              DOCUMENT_STATUS_META[doc.status] || DOCUMENT_STATUS_META.pending;
            const isSelected = selectedIds.includes(doc.id);
            const parsed = doc.parsed_json
              ? typeof doc.parsed_json === "string"
                ? JSON.parse(doc.parsed_json)
                : doc.parsed_json
              : null;
            const hasFlags = parsed && hasRedFlags(parsed);

            return (
              <tr
                key={doc.id}
                className={`border-b last:border-b-0 ${
                  isSelected ? "bg-emerald-50" : "hover:bg-slate-50"
                }`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(doc.id)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <Link
                    to={`/documents/${doc.id}`}
                    className="text-emerald-600 hover:underline font-medium block"
                  >
                    {doc.original_name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {new Date(doc.uploaded_at).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${meta.className}`}
                  >
                    {meta.icon}
                    {meta.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-700">{doc.supplier_name || "—"}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    {parsed?.document_type && parsed.document_type !== "invoice" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200 w-fit">
                        <FiXCircle className="w-3 h-3" />
                        Not Invoice ({parsed.document_type})
                      </span>
                    )}
                    {doc.is_defective === 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200 w-fit">
                        <FiXCircle className="w-3 h-3" />
                        Defective
                      </span>
                    )}
                    {hasFlags && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 w-fit">
                        <FiAlertTriangle className="w-3 h-3" />
                        Review
                      </span>
                    )}
                    {!doc.is_defective &&
                      !hasFlags &&
                      doc.status === "done" &&
                      parsed?.document_type === "invoice" && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {confirmingDeleteId === doc.id ? (
                    <span className="flex items-center gap-1">
                      <span className="text-xs text-slate-600 mr-1">Delete?</span>
                      <button
                        type="button"
                        onClick={onCancelDelete}
                        className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => onPerformDelete(doc.id)}
                        disabled={bulkProcessing}
                        className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </span>
                  ) : (
                    <>
                      {doc.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => onRetry(doc.id)}
                          disabled={retryingId === doc.id}
                          className="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {retryingId === doc.id ? "Retrying…" : "🔁 Retry"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onConfirmDelete(doc.id)}
                        className="ml-2 text-xs px-3 py-1 rounded bg-slate-200 text-slate-800 hover:bg-slate-300"
                      >
                        🗑 Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DocumentsTable;
