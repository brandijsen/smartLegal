import { FiFileText, FiCalendar, FiHash } from "react-icons/fi";

const DocumentHeader = ({ document, parsed }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getDocumentTypeLabel = (type, subtype) => {
    if (type === "invoice") {
      if (subtype === "professional_fee") return "Professional Fee";
      if (subtype === "standard") return "Standard Invoice";
      if (subtype === "reverse_charge") return "Reverse Charge Invoice";
      if (subtype === "tax_exempt") return "Tax-Exempt Invoice";
      return "Invoice";
    }
    if (type === "receipt") return "Receipt";
    return "Document";
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          {/* Document Type */}
          <div className="flex items-center gap-2">
            <FiFileText className="text-slate-400" size={20} />
            <span className="text-lg font-semibold text-slate-900">
              {getDocumentTypeLabel(parsed?.document_type, parsed?.document_subtype)}
            </span>
          </div>

          {/* File Name */}
          <div className="flex items-center gap-2 text-slate-600">
            <FiHash size={16} className="text-slate-400" />
            <span className="text-sm">{document?.original_name || "—"}</span>
          </div>

          {/* Upload Date */}
          <div className="flex items-center gap-2 text-slate-600">
            <FiCalendar size={16} className="text-slate-400" />
            <span className="text-sm">Uploaded: {formatDate(document?.uploaded_at)}</span>
          </div>
        </div>

        {/* Status Badge */}
        {document?.status && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              document.status === "done"
                ? "bg-emerald-100 text-emerald-700"
                : document.status === "processing"
                ? "bg-amber-100 text-amber-700"
                : document.status === "failed"
                ? "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
          </span>
        )}
      </div>
    </div>
  );
};

export default DocumentHeader;
