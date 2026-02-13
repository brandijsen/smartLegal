import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";

import DocumentHeader from "../components/DocumentHeader";
import PrimaryAmountCard from "../components/PrimaryAmountCard";
import FinancialBreakdown from "../components/FinancialBreakdown";

const TABS = ["raw", "json"];

const DocumentDetail = () => {
  const { id } = useParams();

  const [document, setDocument] = useState(null);
  const [parsed, setParsed] = useState(null);
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

        if (resParsed.status === "fulfilled") setParsed(resParsed.value.data);
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

  return (
    <div className="pt-24 pb-24 min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 space-y-6">

        {/* Header */}
        <DocumentHeader document={document} parsed={parsed} />

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
