import { FiFileText, FiCalendar, FiHash, FiDownload, FiEdit2, FiBriefcase } from "react-icons/fi";
import api from "../api/axios";
import { useState } from "react";
import { useToast } from "../context/ToastContext";

const DocumentHeader = ({ document, parsed, resultMetadata }) => {
  const [downloading, setDownloading] = useState(false);
  const { showToast } = useToast();

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

  const handleDownload = async () => {
    if (!document?.id) return;
    
    setDownloading(true);
    try {
      const response = await api.get(`/documents/${document.id}/download`, {
        responseType: "blob"
      });

      // Crea download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement("a");
      link.href = url;
      link.setAttribute("download", document.original_name);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      showToast("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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

          {/* Invoice Number & Date (se estratti) */}
          {(parsed?.semantic?.invoice_number || parsed?.semantic?.invoice_date) && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-600">
              {parsed?.semantic?.invoice_number && (
                <span className="text-sm">
                  Invoice: <strong>{parsed.semantic.invoice_number?.value ?? parsed.semantic.invoice_number}</strong>
                </span>
              )}
              {parsed?.semantic?.invoice_date && (
                <span className="text-sm">
                  Date: <strong>{parsed.semantic.invoice_date?.value ?? parsed.semantic.invoice_date}</strong>
                </span>
              )}
            </div>
          )}

          {/* Upload Date + Ref ID */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
            <span className="flex items-center gap-2 text-sm">
              <FiCalendar size={16} className="text-slate-400" />
              Uploaded: {formatDate(document?.uploaded_at)}
            </span>
            <span
              className="text-xs text-slate-400"
              title="Identificativo univoco del documento. Non è un conteggio: ogni utente vede solo i propri documenti."
            >
              Rif. #{document?.id}
            </span>
          </div>

          {/* Supplier */}
          {document?.supplier && (
            <div className="flex items-center gap-2 text-slate-600">
              <FiBriefcase size={16} className="text-slate-400" />
              <span className="text-sm">
                Supplier: <strong>{document.supplier.name}</strong>
                {document.supplier.vat_number && (
                  <span className="text-slate-500 ml-1">({document.supplier.vat_number})</span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Manually Edited Badge */}
          {resultMetadata?.manually_edited && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
              <FiEdit2 className="w-3 h-3" />
              Manually Edited
            </span>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiDownload className="w-4 h-4" />
            {downloading ? "Downloading..." : "Download PDF"}
          </button>

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
    </div>
  );
};

export default DocumentHeader;
