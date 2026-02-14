import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import api from "../api/axios";

import DocumentHeader from "../components/DocumentHeader";
import PrimaryAmountCard from "../components/PrimaryAmountCard";
import FinancialBreakdown from "../components/FinancialBreakdown";
import RedFlagsAlert from "../components/RedFlagsAlert";

const TABS = ["raw", "json"];

const DocumentDetail = () => {
  const { id } = useParams();

  const [document, setDocument] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [resultMetadata, setResultMetadata] = useState(null);
  const [validationFlags, setValidationFlags] = useState([]); // ✅ NEW
  const [raw, setRaw] = useState("");
  const [tab, setTab] = useState("raw");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // "not_found" | "processing" | null

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const resDoc = await api.get(`/documents/${id}`);
        setDocument(resDoc.data);

        const [resParsed, resRaw] = await Promise.allSettled([
          api.get(`/documents/${id}/result`),
          api.get(`/documents/${id}/raw`),
        ]);

        if (resParsed.status === "fulfilled") {
          setParsed(resParsed.value.data.parsed_json || resParsed.value.data);
          setResultMetadata({
            manually_edited: resParsed.value.data.manually_edited,
            edited_at: resParsed.value.data.edited_at,
          });
          
          // ✅ NEW: Estrai validation flags dal parsed_json
          const parsedData = resParsed.value.data.parsed_json || resParsed.value.data;
          setValidationFlags(parsedData?.validation_flags || []);
        }
        if (resRaw.status === "fulfilled") setRaw(resRaw.value.data.raw_text);

        if (resParsed.status === "rejected" && resRaw.status === "rejected") {
          const status = resDoc.data?.status;
          if (status === "pending" || status === "processing") {
            setError("processing");
          } else if (resParsed.reason?.response?.status === 404) {
            setError("not_found");
          }
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError("not_found");
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [id]);

  const handleMarkDefective = async () => {
    try {
      if (document.is_defective) {
        await api.post(`/documents/${id}/unmark-defective`);
      } else {
        await api.post(`/documents/${id}/mark-defective`);
      }
      
      // Refresh document
      const resDoc = await api.get(`/documents/${id}`);
      setDocument(resDoc.data);
    } catch (err) {
      console.error("Failed to mark/unmark defective:", err);
      alert("Operation failed");
    }
  };

  const hasValidationIssues = validationFlags.length > 0;

  if (loading) {
    return <div className="pt-32 px-8">Loading…</div>;
  }

  if (error === "not_found") {
    return <div className="pt-32 px-8 text-red-600">Document not found</div>;
  }

  if (error === "processing") {
    return (
      <div className="pt-32 px-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800">
          <p className="font-medium">Document is being processed</p>
          <p className="text-sm mt-1">Please wait a moment and refresh the page.</p>
        </div>
      </div>
    );
  }

  if (!parsed && !raw) {
    return (
      <div className="pt-32 px-8">
        <div className="bg-slate-100 rounded-lg p-6 text-slate-700">
          Result not available yet. The document may still be processing.
        </div>
      </div>
    );
  }

  const amounts = parsed?.semantic?.amounts;

  // ✅ NEW: Check se documento NON è una fattura
  const isNotInvoice = parsed?.document_type && parsed.document_type !== 'invoice';
  const wrongDocumentFlag = validationFlags.find(f => f.type === 'wrong_document_type');

  return (
    <div className="pt-24 pb-24 min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 space-y-6">

        {/* Header */}
        <DocumentHeader 
          document={document} 
          parsed={parsed} 
          resultMetadata={resultMetadata}
        />

        {/* 🚨 ALERT: Documento NON è una fattura */}
        {isNotInvoice && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-red-200 flex items-center justify-center">
                <FiAlertTriangle className="w-6 h-6 text-red-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  ⚠️ Wrong Document Type
                </h3>
                <p className="text-sm text-red-800 mb-3">
                  {wrongDocumentFlag?.message || `This document is not an invoice. Detected type: "${parsed.document_type}".`}
                </p>
                <p className="text-sm text-red-700 font-medium">
                  📌 Please upload only invoices. This document should be removed or marked as defective.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Red Flags Alert (mostra confidence + validation flags) */}
        {parsed && (
          <RedFlagsAlert 
            parsed={parsed} 
            validationFlags={validationFlags}
          />
        )}

        {parsed && (
          <>
            {/* Primary Amount Card */}
            <PrimaryAmountCard 
              amounts={amounts} 
              documentSubtype={parsed.document_subtype} 
            />

            {/* Financial Breakdown */}
            <FinancialBreakdown 
              amounts={amounts} 
              documentSubtype={parsed.document_subtype} 
            />

            {/* Mark as Defective Button */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Document Status
                  </h3>
                  <p className="text-sm text-slate-600">
                    {hasValidationIssues 
                      ? "This document has validation issues. Mark as defective if incorrect."
                      : "No validation issues detected. Mark as defective if you find errors manually."}
                  </p>
                </div>
                <button
                  onClick={handleMarkDefective}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm ${
                    document?.is_defective
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {document?.is_defective ? (
                    <>
                      <FiCheckCircle className="w-4 h-4" />
                      Mark as OK
                    </>
                  ) : (
                    <>
                      <FiAlertTriangle className="w-4 h-4" />
                      Mark as Defective
                    </>
                  )}
                </button>
              </div>
              
              {document?.is_defective && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  ⚠️ This document is marked as defective. Contact the issuer for a corrected version.
                </div>
              )}
            </div>
          </>
        )}

        {!parsed && raw && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
            ⚠️ Parsing in progress. Raw text is available below.
          </div>
        )}

        {/* Debug Tabs */}
        <div className="pt-4">
          <div className="flex gap-2 mb-4">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {t === "raw" ? "Raw Text" : "Debug JSON"}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl p-6 shadow border border-slate-200">
            {tab === "json" && (
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono overflow-x-auto">
                {parsed ? JSON.stringify(parsed, null, 2) : "No parsed data available"}
              </pre>
            )}

            {tab === "raw" && (
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono overflow-x-auto max-h-96 overflow-y-auto">
                {raw || "No raw text available"}
              </pre>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DocumentDetail;
