import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiAlertTriangle, FiCheckCircle, FiBriefcase } from "react-icons/fi";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import PageLoader from "../components/PageLoader";
import DocumentHeader from "../components/DocumentHeader";
import PrimaryAmountCard from "../components/PrimaryAmountCard";
import FinancialBreakdown from "../components/FinancialBreakdown";
import RedFlagsAlert from "../components/RedFlagsAlert";
import PdfViewer from "../components/PdfViewer";
import TagSelector from "../components/TagSelector";

const TABS = ["pdf", "raw", "json"];

const DocumentDetail = () => {
  const { id } = useParams();
  const { showToast } = useToast();

  const [document, setDocument] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [resultMetadata, setResultMetadata] = useState(null);
  const [validationFlags, setValidationFlags] = useState([]); // ✅ NEW
  const [raw, setRaw] = useState("");
  const [tab, setTab] = useState("pdf");
  const [documentTags, setDocumentTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // "not_found" | "processing" | null

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const resDoc = await api.get(`/documents/${id}`);
        setDocument(resDoc.data);

        const [resParsed, resRaw, resTags] = await Promise.allSettled([
          api.get(`/documents/${id}/result`),
          api.get(`/documents/${id}/raw`),
          api.get(`/documents/${id}/tags`),
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
        if (resTags.status === "fulfilled") setDocumentTags(resTags.value.data.tags || []);

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

  const refreshDocument = async () => {
    const resDoc = await api.get(`/documents/${id}`);
    setDocument(resDoc.data);
  };

  const handleMarkDefective = async () => {
    try {
      if (document.is_defective) {
        await api.post(`/documents/${id}/unmark-defective`);
      } else {
        await api.post(`/documents/${id}/mark-defective`);
      }
      
      await refreshDocument();
    } catch (err) {
      console.error("Failed to mark/unmark defective:", err);
      showToast("Operation failed");
    }
  };

  const hasValidationIssues = validationFlags.length > 0;

  if (loading) {
    return (
      <div className="pt-24 sm:pt-32 px-4 sm:px-8 min-h-screen bg-[#F5F7FA]">
        <PageLoader message="Loading document…" />
      </div>
    );
  }

  if (error === "not_found") {
    return <div className="pt-24 sm:pt-32 px-4 sm:px-8 text-red-600">Document not found</div>;
  }

  if (error === "processing") {
    return (
      <div className="pt-20 sm:pt-24 pb-16 sm:pb-24 min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
          <DocumentHeader document={document} parsed={null} resultMetadata={null} />
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-6 text-amber-800 text-sm sm:text-base">
            <p className="font-medium">Document is being processed</p>
            <p className="text-sm mt-1">Please wait a moment and refresh the page.</p>
          </div>
          <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
            <h3 className="px-6 py-4 border-b border-slate-200 font-medium text-slate-900">Document Preview</h3>
            <PdfViewer documentId={id} className="min-h-[500px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!parsed && !raw) {
    return (
      <div className="pt-24 sm:pt-32 px-4 sm:px-8">
        <div className="bg-slate-100 rounded-lg p-4 sm:p-6 text-slate-700 text-sm sm:text-base">
          Result not available yet. The document may still be processing.
        </div>
      </div>
    );
  }

  const amounts = parsed?.semantic?.amounts;

  // Check se documento NON è una fattura
  const isNotInvoice = parsed?.document_type && parsed.document_type !== 'invoice';
  const wrongDocumentFlag = validationFlags.find(f => f.type === 'wrong_document_type');

  return (
    <div className="pt-20 sm:pt-24 pb-16 sm:pb-24 min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">

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

        {/* Tags */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <TagSelector
            documentId={id}
            documentTags={documentTags}
            onTagsChange={setDocumentTags}
          />
        </div>

        {/* Supplier card */}
        {(document?.supplier || parsed?.semantic?.seller) && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <FiBriefcase className="text-slate-500" size={20} />
              <h3 className="text-lg font-semibold text-slate-900">Supplier</h3>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-slate-900">
                {document?.supplier?.name ??
                  (parsed?.semantic?.seller?.name?.value ?? parsed?.semantic?.seller?.name)}
              </p>
              {(document?.supplier?.vat_number ??
                parsed?.semantic?.seller?.vat_number?.value ??
                parsed?.semantic?.seller?.vat_number) && (
                <p className="text-sm text-slate-500">
                  VAT:{" "}
                  {document?.supplier?.vat_number ??
                    parsed?.semantic?.seller?.vat_number?.value ??
                    parsed?.semantic?.seller?.vat_number}
                </p>
              )}
              {(parsed?.semantic?.seller?.address?.value ??
                parsed?.semantic?.seller?.address) && (
                <p className="text-sm text-slate-500">
                  {parsed?.semantic?.seller?.address?.value ??
                    parsed?.semantic?.seller?.address}
                </p>
              )}
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

        {/* Document tabs: PDF, Raw, JSON */}
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
                {t === "pdf" ? "PDF" : t === "raw" ? "Raw Text" : "Debug JSON"}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
            {tab === "pdf" && <PdfViewer documentId={id} className="min-h-[600px]" />}

            {tab === "json" && (
              <div className="p-6">
                <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono overflow-x-auto">
                  {parsed || document?.supplier
                    ? JSON.stringify(
                        (() => {
                          const seller = parsed?.semantic?.seller;
                          const getVal = (o) =>
                            o && typeof o === "object" && "value" in o ? o.value : o;
                          const supplierData = document?.supplier
                            ? {
                                id: document.supplier.id,
                                name: document.supplier.name,
                                vat_number: document.supplier.vat_number,
                                address: document.supplier.address ?? getVal(seller?.address) ?? null,
                              }
                            : seller
                            ? {
                                name: getVal(seller.name),
                                vat_number: getVal(seller.vat_number),
                                address: getVal(seller.address),
                              }
                            : null;
                          const { semantic, ...rest } = parsed || {};
                          const semanticNoSeller =
                            semantic && typeof semantic === "object"
                              ? Object.fromEntries(
                                  Object.entries(semantic).filter(([k]) => k !== "seller")
                                )
                              : semantic;
                          return {
                            supplier: supplierData,
                            ...rest,
                            ...(semanticNoSeller &&
                              Object.keys(semanticNoSeller).length > 0 && {
                                semantic: semanticNoSeller,
                              }),
                          };
                        })(),
                        null,
                        2
                      )
                    : "No parsed data available"}
                </pre>
              </div>
            )}

            {tab === "raw" && (
              <div className="p-6">
                <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono overflow-x-auto max-h-96 overflow-y-auto">
                  {raw || "No raw text available"}
                </pre>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DocumentDetail;
