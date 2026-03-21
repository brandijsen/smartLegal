import { useEffect, useState } from "react";
import api from "../api/axios";
import PageLoader from "./PageLoader";

/**
 * Visualizzatore PDF in-app.
 * Downloads the PDF with auth and displays it via iframe.
 */
const PdfViewer = ({ documentId, className = "" }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!documentId) return;

    let objectUrl = null;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/documents/${documentId}/download`, {
          responseType: "blob",
        });
        objectUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
        setPdfUrl(objectUrl);
      } catch (err) {
        setError("Unable to load PDF");
        console.error("PDF load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [documentId]);

  if (loading) {
    return (
      <div className={`bg-slate-100 rounded-lg min-h-[500px] ${className}`}>
        <PageLoader message="Loading PDF…" variant="inline" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 rounded-lg border border-red-200 min-h-[200px] ${className}`}
      >
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!pdfUrl) return null;

  return (
    <iframe
      src={`${pdfUrl}#toolbar=1`}
      title="Document PDF"
      className={`w-full min-h-[600px] rounded-lg border border-slate-200 bg-white ${className}`}
    />
  );
};

export default PdfViewer;
