import { useEffect, useState } from "react";
import api from "../api/axios";
import DocumentUpload from "../components/DocumentUpload";
import {
  FiClock,
  FiLoader,
  FiCheckCircle,
  FiXCircle
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
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  const fetchDocuments = async () => {
    try {
      const res = await api.get("/documents");
      setDocuments(res.data);
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
      alert("Unable to retry document processing");
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
      alert("Unable to delete document");
    }
  };

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pt-32 pb-24 min-h-screen bg-[#F5F7FA]">
      <div className="max-w-6xl mx-auto px-8 space-y-10">
        <h1 className="text-3xl font-semibold">
          Your documents
        </h1>

        <DocumentUpload onUploaded={fetchDocuments} />

        {loading ? (
          <div className="text-slate-600">Loading documents…</div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-slate-600">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 font-medium">File</th>
                  <th className="text-left px-6 py-4 font-medium">Uploaded</th>
                  <th className="text-left px-6 py-4 font-medium">Status</th>
                  <th className="text-left px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const meta = STATUS_META[doc.status];
                  return (
                    <tr key={doc.id} className="border-b last:border-b-0">
                      <td className="px-6 py-4">
                        {doc.original_name}
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
        )}
      </div>
    </div>
  );
};

export default Documents;
