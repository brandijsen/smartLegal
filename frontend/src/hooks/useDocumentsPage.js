import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";

const DEFAULT_FILTERS = {
  status: "all",
  dateFrom: "",
  dateTo: "",
  search: "",
  defective: "all",
  supplier: "all",
  tag: "all",
};

/**
 * Lista documenti, filtri sincronizzati con URL, polling, selezione bulk, export.
 */
export function useDocumentsPage(showToast) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);

  const [filters, setFilters] = useState(() => ({
    status: searchParams.get("status") || "all",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    search: searchParams.get("search") || "",
    defective: searchParams.get("defective") || "all",
    supplier: searchParams.get("supplier") || "all",
    tag: searchParams.get("tag") || "all",
  }));
  const [pagination, setPagination] = useState(() => ({
    page: parseInt(searchParams.get("page"), 10) || 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  }));

  const fetchDocuments = useCallback(async (page, currentFilters) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (currentFilters.status && currentFilters.status !== "all") {
        params.append("status", currentFilters.status);
      }
      if (currentFilters.dateFrom) params.append("dateFrom", currentFilters.dateFrom);
      if (currentFilters.dateTo) params.append("dateTo", currentFilters.dateTo);
      if (currentFilters.search) params.append("search", currentFilters.search);
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
  }, []);

  useEffect(() => {
    fetchDocuments(pagination.page, filters);

    const visibleMs = 5000;
    const hiddenMs = 45000;
    let intervalId;

    const tick = () => fetchDocuments(pagination.page, filters);

    const arm = () => {
      if (intervalId) clearInterval(intervalId);
      const ms = document.visibilityState === "visible" ? visibleMs : hiddenMs;
      intervalId = setInterval(tick, ms);
    };

    arm();
    const onVis = () => arm();
    document.addEventListener("visibilitychange", onVis);
    const onFocus = () => {
      if (document.visibilityState === "visible") tick();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      if (intervalId) clearInterval(intervalId);
    };
  }, [pagination.page, filters, fetchDocuments]);

  const updateURL = useCallback(
    ({ page, status, dateFrom, dateTo, search, defective, supplier, tag }) => {
      const params = new URLSearchParams();
      if (page && page !== 1) params.set("page", String(page));
      if (status && status !== "all") params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (search) params.set("search", search);
      if (defective && defective !== "all") params.set("defective", defective);
      if (supplier && supplier !== "all") params.set("supplier", supplier);
      if (tag && tag !== "all") params.set("tag", tag);
      setSearchParams(params);
    },
    [setSearchParams]
  );

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
    const reset = { ...DEFAULT_FILTERS };
    setFilters(reset);
    setSelectedIds([]);
    updateURL({ page: 1, ...reset });
    fetchDocuments(1, reset);
  };

  const retryDocument = async (documentId) => {
    try {
      setRetryingId(documentId);
      await api.post(`/documents/${documentId}/retry`);
      await fetchDocuments(pagination.page, filters);
    } catch (err) {
      console.error("Retry failed", err);
      showToast("Unable to retry document processing");
    } finally {
      setRetryingId(null);
    }
  };

  const confirmDeleteSingle = (documentId) => setConfirmingDeleteId(documentId);
  const cancelDeleteSingle = () => setConfirmingDeleteId(null);

  const performDeleteSingle = async (documentId) => {
    setConfirmingDeleteId(null);
    setBulkProcessing(true);
    try {
      await api.delete(`/documents/${documentId}`);
      await fetchDocuments(pagination.page, filters);
      showToast("Document deleted");
    } catch {
      showToast("Unable to delete document");
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleSelect = (docId) => {
    setSelectedIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === documents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(documents.map((d) => d.id));
    }
  };

  const performBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    setConfirmingBulkDelete(false);
    try {
      await api.delete("/documents/bulk", { data: { documentIds: selectedIds } });
      setSelectedIds([]);
      await fetchDocuments(pagination.page, filters);
      showToast("Documents deleted");
    } catch (err) {
      console.error("Bulk delete failed", err);
      showToast("Some documents could not be deleted");
      await fetchDocuments(pagination.page, filters);
    } finally {
      setBulkProcessing(false);
    }
  };

  const bulkRetry = async () => {
    const failedSelected = selectedIds.filter((id) => {
      const doc = documents.find((d) => d.id === id);
      return doc?.status === "failed";
    });
    if (failedSelected.length === 0) {
      showToast("No failed invoices selected");
      return;
    }
    setBulkProcessing(true);
    try {
      await api.post("/documents/bulk-retry", { documentIds: failedSelected });
      setSelectedIds([]);
      await fetchDocuments(pagination.page, filters);
    } catch (err) {
      console.error("Bulk retry failed", err);
      showToast("Some invoices could not be retried");
    } finally {
      setBulkProcessing(false);
    }
  };

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
        documentIds: defectiveSelected,
      });
      setSelectedIds([]);
      await fetchDocuments(pagination.page, filters);
    } catch (err) {
      console.error("Bulk unmark failed", err);
      showToast("Operation failed");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== "all") params.append("status", filters.status);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.search) params.append("search", filters.search);
      if (filters.defective && filters.defective !== "all") {
        params.append("defective", filters.defective);
      }
      if (filters.supplier && filters.supplier !== "all") {
        params.append("supplier", filters.supplier);
      }
      if (filters.tag && filters.tag !== "all") params.append("tag", filters.tag);
      const qs = params.toString();
      const exportUrl = `/documents/export/${format}${qs ? `?${qs}` : ""}`;
      const response = await api.get(exportUrl, { responseType: "blob" });
      const ext = format === "csv" ? "csv" : "xlsx";
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `documents-${Date.now()}.${ext}`);
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

  const clearSelection = () => setSelectedIds([]);

  return {
    documents,
    loading,
    filters,
    pagination,
    selectedIds,
    bulkProcessing,
    exporting,
    confirmingDeleteId,
    confirmingBulkDelete,
    retryingId,
    hasSelection: selectedIds.length > 0,
    fetchDocuments,
    handleFilterChange,
    handleResetFilters,
    goToPage,
    handleExport,
    retryDocument,
    confirmDeleteSingle,
    cancelDeleteSingle,
    performDeleteSingle,
    toggleSelect,
    toggleSelectAll,
    performBulkDelete,
    bulkRetry,
    bulkUnmarkDefective,
    setConfirmingBulkDelete,
    clearSelection,
  };
}
