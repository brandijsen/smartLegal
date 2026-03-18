import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import DocumentUpload from "../components/DocumentUpload";
import DocumentFilters from "../components/DocumentFilters";
import PageLoader from "../components/PageLoader";
import { useToast } from "../context/ToastContext";
import { Link } from "react-router-dom";
import { hasRedFlags } from "../utils/redFlagChecker";

import {
  FiClock,
  FiLoader,
  FiCheckCircle,
  FiXCircle,
  FiDownload,
  FiAlertTriangle,
  FiEdit2
} from "react-icons/fi";

const STATUS_META = {
  pending: {
    label: "Pending",
    icon: <FiClock />,
    className: "bg-slate-100 text-slate-700"
  },
  processing: {
    label: "Processing",
    icon: <FiLoader className="animate-spin" />,
    className: "bg-amber-100 text-amber-700"
  },
  done: {
    label: "Done",
    icon: <FiCheckCircle />,
    className: "bg-emerald-100 text-emerald-700"
  },
  failed: {
    label: "Failed",
    icon: <FiXCircle />,
    className: "bg-red-100 text-red-700"
  }
};

const Documents = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Inizializza filtri dalla URL
  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "all",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    search: searchParams.get("search") || "",
    defective: searchParams.get("defective") || "all",
    supplier: searchParams.get("supplier") || "all",
    tag: searchParams.get("tag") || "all"
  });
  
  // Paginazione - inizializza dalla URL
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get("page")) || 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const fetchDocuments = async (page = pagination.page, currentFilters = filters) => {
    try {
      // Build query string
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      });

      // Add filters
      if (currentFilters.status && currentFilters.status !== "all") {
        params.append("status", currentFilters.status);
      }
      if (currentFilters.dateFrom) {
        params.append("dateFrom", currentFilters.dateFrom);
      }
      if (currentFilters.dateTo) {
        params.append("dateTo", currentFilters.dateTo);
      }
      if (currentFilters.search) {
        params.append("search", currentFilters.search);
      }
      if (currentFilters.defective && currentFilters.defective !== "all") {
        params.append("defective", currentFilters.defective);
      }
      if (currentFilters.supplier && currentFilters.supplier !== "all") {
        params.append("supplier", currentFilters.supplier);
      }
      if (currentFilters.tag && currentFilters.tag !== "all") {
        params.append("tag", currentFilters.tag);
      }
      const res = await api.get(`/documents?${params.toString()}`);
      setDocuments(res.data.documents);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setLoading(false);
    }
  };

  const retryDocument = async (documentId) => {
    try {
      setRetryingId(documentId);
      await api.post(`/documents/${documentId}/retry`);
      await fetchDocuments();
    } catch (err) {
      console.error("Retry failed", err);
      showToast("Unable to retry document processing");
    } finally {
      setRetryingId(null);
    }
  };

  const deleteDocument = async (documentId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      await api.delete(`/documents/${documentId}`);
      await fetchDocuments();
    } catch (err) {
      console.error("Delete failed", err);
      showToast("Unable to delete document");
    }
  };

  // Selezione multipla
  const toggleSelect = (docId) => {
    setSelectedIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === documents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(documents.map((d) => d.id));
    }
  };

  // Bulk delete
  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;

    if (!window.confirm(`Delete ${selectedIds.length} selected document(s)?`)) {
      return;
    }

    setBulkProcessing(true);

    try {
      await Promise.all(
        selectedIds.map((id) => api.delete(`/documents/${id}`))
      );
      setSelectedIds([]);
      await fetchDocuments();
    } catch (err) {
      console.error("Bulk delete failed", err);
      showToast("Some documents could not be deleted");
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk retry
  const bulkRetry = async () => {
    const failedSelected = selectedIds.filter((id) => {
      const doc = documents.find((d) => d.id === id);
      return doc?.status === "failed";
    });

    if (failedSelected.length === 0) {
      showToast("No failed documents selected");
      return;
    }

    setBulkProcessing(true);

    try {
      await Promise.all(
        failedSelected.map((id) => api.post(`/documents/${id}/retry`))
      );
      setSelectedIds([]);
      await fetchDocuments();
    } catch (err) {
      console.error("Bulk retry failed", err);
      showToast("Some documents could not be retried");
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk unmark defective
  const bulkUnmarkDefective = async () => {
    const defectiveSelected = selectedIds.filter((id) => {
      const doc = documents.find((d) => d.id === id);
      return doc?.is_defective === 1;
    });

    if (defectiveSelected.length === 0) {
      showToast("No defective documents selected");
      return;
    }

    setBulkProcessing(true);
    try {
      await api.post("/documents/bulk-unmark-defective", {
        documentIds: defectiveSelected
      });
      setSelectedIds([]);
      await fetchDocuments();
    } catch (err) {
      console.error("Bulk unmark failed", err);
      showToast("Operation failed");
    } finally {
      setBulkProcessing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(() => fetchDocuments(pagination.page, filters), 5000);
    return () => clearInterval(interval);
  }, [pagination.page, filters]);

  const goToPage = (page) => {
    setSelectedIds([]);
    updateURL({ page, ...filters });
    fetchDocuments(page, filters);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setSelectedIds([]);
    updateURL({ page: 1, ...newFilters });
    fetchDocuments(1, newFilters);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      status: "all",
      dateFrom: "",
      dateTo: "",
      search: "",
      defective: "all",
      supplier: "all",
      tag: "all"
    };
    setFilters(resetFilters);
    setSelectedIds([]);
    updateURL({ page: 1, ...resetFilters });
    fetchDocuments(1, resetFilters);
  };

  // Aggiorna URL con filtri e pagina corrente
  const updateURL = ({ page, status, dateFrom, dateTo, search, defective, supplier, tag }) => {
    const params = new URLSearchParams();
    
    if (page && page !== 1) params.set("page", page.toString());
    if (status && status !== "all") params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (search) params.set("search", search);
    if (defective && defective !== "all") params.set("defective", defective);
    if (supplier && supplier !== "all") params.set("supplier", supplier);
    if (tag && tag !== "all") params.set("tag", tag);
    setSearchParams(params);
  };

  // Export functions
  const handleExport = async (format) => {
    setExporting(true);
    try {
      const response = await api.get(`/documents/export/${format}`, {
        responseType: "blob"
      });

      const ext = format === "csv" ? "csv" : "xlsx";
      const prefix = "documents";

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${prefix}-${Date.now()}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      showToast("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const hasSelection = selectedIds.length > 0;

  return (
    <div className="pt-24 sm:pt-28 lg:pt-32 pb-16 sm:pb-24 min-h-screen bg-[#F5F7FA]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-semibold">Your documents</h1>

          {/* Export Buttons */}
          {documents.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleExport("csv")}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload className="w-4 h-4" />
                {exporting ? "Exporting..." : "Export CSV"}
              </button>
              <button
                onClick={() => handleExport("excel")}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload className="w-4 h-4" />
                {exporting ? "Exporting..." : "Export Excel"}
              </button>
            </div>
          )}
        </div>

        <DocumentUpload onUploaded={fetchDocuments} />

        <DocumentFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {loading ? (
          <PageLoader message="Loading documents…" />
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-slate-600">
            No documents uploaded yet.
          </div>
        ) : (
          <>
            {/* Bulk Actions Bar */}
            {hasSelection && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-sm font-medium text-emerald-800">
                  {selectedIds.length} document(s) selected
                </span>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={bulkUnmarkDefective}
                    disabled={bulkProcessing || !selectedIds.some((id) => documents.find((d) => d.id === id)?.is_defective === 1)}
                    className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkProcessing ? "Processing…" : "✓ Unmark Defective"}
                  </button>
                  <button
                    onClick={bulkRetry}
                    disabled={bulkProcessing}
                    className="px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkProcessing ? "Processing…" : "🔁 Retry Failed"}
                  </button>
                  <button
                    onClick={bulkDelete}
                    disabled={bulkProcessing}
                    className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkProcessing ? "Deleting…" : "🗑 Delete Selected"}
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="px-4 py-2 rounded-md bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === documents.length && documents.length > 0}
                        onChange={toggleSelectAll}
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
                    const meta = STATUS_META[doc.status];
                    const isSelected = selectedIds.includes(doc.id);
                    
                    // Check for red flags and manual edit
                    const parsed = doc.parsed_json ? 
                      (typeof doc.parsed_json === 'string' ? JSON.parse(doc.parsed_json) : doc.parsed_json) 
                      : null;
                    const hasFlags = parsed && hasRedFlags(parsed);
                    const isManuallyEdited = doc.manually_edited === 1;

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
                            onChange={() => toggleSelect(doc.id)}
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

                        {/* Supplier Column */}
                        <td className="px-6 py-4 text-slate-700">
                          {doc.supplier_name || "—"}
                        </td>

                        {/* Badges Column */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            {parsed?.document_type && parsed.document_type !== 'invoice' && (
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
                            {!doc.is_defective && !hasFlags && doc.status === 'done' && parsed?.document_type === 'invoice' && (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {doc.status === "failed" && (
                            <button
                              onClick={() => retryDocument(doc.id)}
                              disabled={retryingId === doc.id}
                              className="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {retryingId === doc.id ? "Retrying…" : "🔁 Retry"}
                            </button>
                          )}

                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className="ml-2 text-xs px-3 py-1 rounded bg-slate-200 text-slate-800 hover:bg-slate-300"
                          >
                            🗑 Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total documents)
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={!pagination.hasPrevPage}
                    className="px-3 py-1 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>

                  <button
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="px-3 py-1 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <span className="px-4 py-1 rounded-md bg-emerald-100 text-emerald-700 text-sm font-medium">
                    {pagination.page}
                  </span>

                  <button
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-1 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>

                  <button
                    onClick={() => goToPage(pagination.totalPages)}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-1 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Documents;
